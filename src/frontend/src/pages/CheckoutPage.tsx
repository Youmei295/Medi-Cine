import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import type { Hold, Quote } from '../types/api'
import {
  ApiRequestError,
  createBooking,
  createQuote,
  getHold,
  getShowtime,
  releaseHold,
  type PromotionProblem,
  type ShowtimeContext,
} from '../mocks/mockApi'
import { useSession } from '../lib/session'
import { useCountdown } from '../hooks/useCountdown'
import { formatCountdown, formatDate, formatTime, formatVnd } from '../lib/format'
import BookingSteps from '../components/BookingSteps'
import { SEAT_TYPE_LABEL } from '../components/seat-map/seatVisual'
import { usePageTitle } from '../lib/pageTitle'

/*
 * Screen 5 — Booking review (UC03, + UC18 discount code), brief §4 screen 5.
 * /checkout?holdId=…&showtimeId=… (from the seat page after a successful hold).
 * Every amount comes from the server's quote (createQuote); the page never
 * computes a price (P1). "Tiếp tục thanh toán" creates a PENDING booking
 * (createBooking) and opens screen 5b; payment itself is UC04.
 * Alternative flows handled here: 3.2.2.1 hold expired, 3.2.2.2 back releases
 * the hold after a confirm dialog, 3.2.2.3 price changed → explicit re-confirm,
 * 3.2.2.4 double click (busy button; the API returns the same booking),
 * 3.2.2.5 booking failed → retry, UC18 invalid code → base price kept.
 */

type Phase = 'loading' | 'ready' | 'expired' | 'error'
type CodeResult = { tone: 'ok' | 'error'; text: string } | null

const CODE_PATTERN = /^[A-Z0-9_-]{1,40}$/

export default function CheckoutPage() {
  const { session } = useSession()
  const { pathname, search } = useLocation()
  if (!session) return <Navigate to={`/login?redirect=${encodeURIComponent(pathname + search)}`} replace />
  return <Checkout />
}

function Checkout() {
  const [params] = useSearchParams()
  const holdId = params.get('holdId') ?? ''
  const showtimeId = params.get('showtimeId')
  const seatsUrl = showtimeId ? `/showtimes/${showtimeId}/seats` : '/movies'
  const navigate = useNavigate()

  const [phase, setPhase] = useState<Phase>('loading')
  const [hold, setHold] = useState<Hold | null>(null)
  const [context, setContext] = useState<ShowtimeContext | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [attempt, setAttempt] = useState(0)
  usePageTitle(phase === 'expired' ? 'Hết thời gian giữ ghế' : phase === 'error' ? 'Không tải được thông tin đặt vé' : 'Xác nhận đặt vé')

  // Load: the hold must still be ACTIVE, then a first quote without a code.
  useEffect(() => {
    let alive = true
    getHold(holdId)
      .then(async (h) => {
        if (h.bookingId) return navigate(`/bookings/${h.bookingId}`, { replace: true }) // already booked
        if (h.status !== 'ACTIVE') return alive && setPhase('expired')
        const [ctx, q] = await Promise.all([getShowtime(h.showtimeId), createQuote(h.id, null)])
        if (!alive) return
        setHold(h)
        setContext(ctx)
        setQuote(q)
        setPhase('ready')
      })
      .catch((e: unknown) => {
        if (!alive) return
        const code = e instanceof ApiRequestError ? e.body.code : null
        // A hold that no longer exists (e.g. the page was reloaded) reads as expired.
        setPhase(code === 'HOLD_EXPIRED' || code === 'RESOURCE_NOT_FOUND' || code === 'HOLD_NOT_FOUND' ? 'expired' : 'error')
      })
    return () => {
      alive = false
    }
  }, [holdId, navigate, attempt])

  const onExpired = useCallback(() => setPhase('expired'), [])
  const remaining = useCountdown(phase === 'ready' ? (hold?.expiresAt ?? null) : null, hold?.serverTime ?? null, onExpired)

  if (phase === 'loading') return <Shell><CheckoutSkeleton /></Shell>
  if (phase === 'expired')
    return (
      <Shell>
        <HoldExpired seats={quote?.items.map((i) => i.seatLabel) ?? []} seatsUrl={seatsUrl} />
      </Shell>
    )
  if (phase === 'error' || !hold || !context || !quote)
    return (
      <Shell>
        <Problem title="Không tải được thông tin đặt vé">
          <p className="mt-2 text-dust">Ghế của bạn vẫn đang được giữ nếu chưa hết giờ. Kiểm tra kết nối rồi thử lại.</p>
          <div className="mt-5 flex flex-wrap items-center gap-5">
            <button type="button" onClick={() => { setPhase('loading'); setAttempt((n) => n + 1) }} className={PRIMARY}>
              Thử lại
            </button>
            <Link to={seatsUrl} className={TEXT_LINK}>Về chọn ghế</Link>
          </div>
        </Problem>
      </Shell>
    )

  return (
    <Review
      hold={hold}
      context={context}
      quote={quote}
      setQuote={setQuote}
      remaining={remaining}
      seatsUrl={seatsUrl}
      onHoldExpired={() => setPhase('expired')}
    />
  )
}

function Review({
  hold,
  context,
  quote,
  setQuote,
  remaining,
  seatsUrl,
  onHoldExpired,
}: {
  hold: Hold
  context: ShowtimeContext
  quote: Quote
  setQuote: (q: Quote) => void
  remaining: number
  seatsUrl: string
  onHoldExpired: () => void
}) {
  const navigate = useNavigate()
  const { movie, room, showtime } = context
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(false)
  /** 3.2.2.3: the total the customer saw before the server changed it. */
  const [previousTotal, setPreviousTotal] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [releasing, setReleasing] = useState(false)

  async function confirm() {
    if (busy) return // 3.2.2.4: a second click does nothing while the first is running
    setBusy(true)
    setFailure(false)
    try {
      const booking = await createBooking(hold.id, quote.id)
      navigate(`/bookings/${booking.id}`)
    } catch (e) {
      const body = e instanceof ApiRequestError ? e.body : null
      if (body?.code === 'QUOTE_STALE' && body.context?.currentQuote) {
        setPreviousTotal((t) => t ?? quote.total)
        setQuote(body.context.currentQuote)
      } else if (body?.code === 'HOLD_EXPIRED' || body?.code === 'QUOTE_EXPIRED') {
        onHoldExpired()
      } else {
        setFailure(true)
      }
      setBusy(false)
    }
  }

  async function releaseAndGoBack() {
    setReleasing(true)
    await releaseHold(hold.id)
    navigate(seatsUrl)
  }

  const priceChanged = previousTotal !== null
  const lowTime = remaining <= 60

  return (
    <div className="relative isolate">
      {movie.backdropUrl && (
        <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-[28rem] overflow-hidden">
          <img src={movie.backdropUrl} alt="" className="size-full scale-110 object-cover opacity-25 blur-2xl" />
          <div className="absolute inset-0 bg-linear-to-b from-house/40 to-house" />
        </div>
      )}

      <Shell>
        <BookingSteps current={3} />

        <div className="mt-8 grid gap-10 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            {/* The step bar above already says "Xác nhận"; no label over the title (Phase 7 polish). */}
            <h1 className="display-wide text-step-3 font-bold sm:text-step-4">
              <span className="sr-only">Xác nhận đặt vé: </span>
              {movie.title}
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-dust">
              <span>{room.name}</span>
              <span className="tabular">
                {formatTime(showtime.startsAt)}, {formatDate(showtime.startsAt)}
              </span>
              <span className="rounded-control border border-seat-line px-2 text-caption leading-6 text-screen">{showtime.format}</span>
            </p>

            {/* Phones: the hold time stays near the top (brief §7). */}
            <p role="timer" className={`tabular mt-4 transition-colors duration-200 lg:hidden ${lowTime ? 'text-velvet' : 'text-lamp'}`}>
              Còn giữ ghế {formatCountdown(remaining)}
            </p>

            {/* Not "vé": no ticket exists before payment (P1, brief §5). */}
            <h2 className="mt-10 text-step-1 font-semibold">Ghế đã giữ ({quote.items.length} ghế)</h2>
            <PriceLines quote={quote} />

            <DiscountCode holdId={hold.id} quote={quote} setQuote={setQuote} disabled={busy || priceChanged} onHoldExpired={onHoldExpired} />
          </div>

          <aside className="lg:col-span-4">
            <div className="rounded-panel border border-aisle bg-wall p-6 lg:sticky lg:top-6">
              {/* Shown at every width: on phones this panel is where the customer decides,
                  far below the timer line under the title. */}
              <p
                role="timer"
                aria-live={lowTime ? 'polite' : 'off'}
                className={`flex items-baseline justify-between rounded-control px-4 py-3 transition-colors duration-200 ${lowTime ? 'animate-timer-beat bg-velvet/15 text-velvet' : 'bg-lamp/10 text-lamp'}`}
              >
                <span>Còn giữ ghế</span>
                <span className="tabular text-step-1 font-semibold">{formatCountdown(remaining)}</span>
              </p>

              <dl className="mt-5 grid grid-cols-[1fr_auto] gap-y-2 lg:mt-5">
                <dt className="text-dust">Tạm tính</dt>
                <dd className="tabular text-right">{formatVnd(quote.subtotal)}</dd>
                <dt className="text-dust">Giảm giá{quote.promotionCode ? ` (${quote.promotionCode})` : ''}</dt>
                <dd className="tabular text-right">{quote.discount > 0 ? `−${formatVnd(quote.discount)}` : formatVnd(0)}</dd>
                {/* One rule across both columns; label and amount sit on one baseline. */}
                <div className="col-span-2 mt-2 grid grid-cols-subgrid items-baseline border-t border-seat-line pt-3">
                  <dt className="font-semibold">Phải trả</dt>
                  <dd className="tabular text-right text-step-2 font-semibold" aria-live="polite">
                    {/* Discount applied or price changed: the new total settles in once (brief §8). */}
                    <span key={quote.total} className="inline-block animate-value-settle">
                      {formatVnd(quote.total)}
                    </span>
                  </dd>
                </div>
              </dl>

              {previousTotal !== null && (
                <div role="alert" className="mt-5 rounded-control border border-velvet px-4 py-3 text-caption">
                  <p className="font-semibold text-velvet">Giá vé vừa thay đổi</p>
                  <p className="mt-1 text-screen">
                    Tổng tiền từ <span className="tabular line-through">{formatVnd(previousTotal)}</span> thành{' '}
                    <span className="tabular font-semibold">{formatVnd(quote.total)}</span>. Bảng giá ở trên đã cập nhật; đơn chỉ
                    được tạo khi bạn đồng ý giá mới.
                  </p>
                </div>
              )}

              {failure && (
                <div role="alert" className="mt-5 rounded-control border border-velvet px-4 py-3 text-caption">
                  <p className="font-semibold text-velvet">Chưa tạo được đơn đặt vé</p>
                  <p className="mt-1 text-screen">Ghế vẫn đang được giữ cho bạn. Kiểm tra kết nối rồi bấm "Thử lại".</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (priceChanged) setPreviousTotal(null)
                  void confirm()
                }}
                disabled={busy}
                aria-busy={busy || undefined}
                className={`${PRIMARY} mt-5 w-full disabled:cursor-wait disabled:opacity-80`}
              >
                {busy ? 'Đang tạo đơn…' : priceChanged ? 'Đồng ý giá mới và tiếp tục' : failure ? 'Thử lại' : 'Tiếp tục thanh toán'}
              </button>
              <button
                type="button"
                onClick={() => dialogRef.current?.showModal()}
                disabled={busy}
                className="mt-2 w-full rounded-control border border-seat-line px-5 py-3 text-screen transition-colors hover:border-lamp disabled:opacity-60"
              >
                Quay lại chọn ghế
              </button>
              <p className="mt-4 text-pretty text-caption text-dust">
                Bấm "Tiếp tục thanh toán" để tạo đơn chờ thanh toán. Đơn chưa phải vé: vé chỉ có sau khi thanh toán thành
                công.
              </p>
            </div>
          </aside>
        </div>
      </Shell>

      {/* 3.2.2.2: leaving releases the hold, so ask first. Native dialog: focus trap and Esc for free. */}
      <dialog
        ref={dialogRef}
        aria-labelledby="leave-h"
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-panel border border-aisle bg-wall p-6 text-screen backdrop:bg-house/80"
      >
        <h2 id="leave-h" className="text-step-1 font-semibold">
          Bỏ giữ ghế và quay lại?
        </h2>
        <p className="mt-2 text-dust">
          Ghế <span className="tabular text-screen">{quote.items.map((i) => i.seatLabel).join(', ')}</span> sẽ được trả lại để
          người khác có thể chọn. Bạn sẽ chọn lại ghế ở bước trước.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" autoFocus onClick={() => dialogRef.current?.close()} className="rounded-control border border-seat-line px-5 py-3 text-screen hover:border-lamp">
            Ở lại trang này
          </button>
          <button type="button" onClick={releaseAndGoBack} disabled={releasing} aria-busy={releasing || undefined} className={PRIMARY}>
            {releasing ? 'Đang bỏ giữ…' : 'Bỏ giữ ghế'}
          </button>
        </div>
      </dialog>
    </div>
  )
}

/** Itemized prices from the quote: a table from 640 px, a list on phones. */
function PriceLines({ quote }: { quote: Quote }) {
  const discount = (n: number) => (n > 0 ? `−${formatVnd(n)}` : '—')
  return (
    <>
      <table className="mt-4 hidden w-full text-left sm:table">
        <caption className="sr-only">Giá từng ghế</caption>
        <thead className="text-caption text-dust">
          <tr className="border-b border-seat-line">
            <th scope="col" className="py-2 pr-4 font-normal">Ghế</th>
            <th scope="col" className="py-2 pr-4 font-normal">Loại</th>
            <th scope="col" className="py-2 pr-4 text-right font-normal">Đơn giá</th>
            <th scope="col" className="py-2 pr-4 text-right font-normal">Giảm</th>
            <th scope="col" className="py-2 text-right font-normal">Thành tiền</th>
          </tr>
        </thead>
        <tbody className="tabular divide-y divide-aisle">
          {quote.items.map((line) => (
            <tr key={line.seatId}>
              <th scope="row" className="py-3 pr-4 font-semibold">{line.seatLabel}</th>
              <td className="py-3 pr-4 text-dust">{SEAT_TYPE_LABEL[line.seatType]}</td>
              <td className="py-3 pr-4 text-right">{formatVnd(line.unitPrice)}</td>
              <td className="py-3 pr-4 text-right text-dust">{discount(line.discount)}</td>
              <td className="py-3 text-right font-semibold">{formatVnd(line.payable)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="tabular mt-4 divide-y divide-aisle border-y border-aisle sm:hidden">
        {quote.items.map((line) => (
          <li key={line.seatId} className="flex items-baseline justify-between gap-4 py-3">
            <span>
              <span className="font-semibold">{line.seatLabel}</span>{' '}
              <span className="text-dust">{SEAT_TYPE_LABEL[line.seatType]}</span>
              <span className="block text-caption text-dust">
                Đơn giá {formatVnd(line.unitPrice)}
                {line.discount > 0 && `, giảm ${formatVnd(line.discount)}`}
              </span>
            </span>
            <span className="font-semibold">{formatVnd(line.payable)}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

/** UC18: one code per booking; an invalid code keeps the base price (brief §6). */
function DiscountCode({
  holdId,
  quote,
  setQuote,
  disabled,
  onHoldExpired,
}: {
  holdId: string
  quote: Quote
  setQuote: (q: Quote) => void
  disabled: boolean
  onHoldExpired: () => void
}) {
  const [text, setText] = useState('')
  const [result, setResult] = useState<CodeResult>(null)
  const [busy, setBusy] = useState(false)
  const id = useId()
  const messageId = `${id}-message`

  async function requote(code: string | null): Promise<Quote> {
    const next = await createQuote(holdId, code)
    setQuote(next)
    return next
  }

  async function apply(event: FormEvent) {
    event.preventDefault()
    const code = text.trim().toUpperCase()
    if (!code) return setResult({ tone: 'error', text: 'Nhập mã giảm giá rồi bấm "Áp dụng".' })
    if (!CODE_PATTERN.test(code))
      return setResult({ tone: 'error', text: 'Mã chỉ gồm chữ không dấu, số, "-" hoặc "_".' })
    setBusy(true)
    try {
      const next = await requote(code)
      setResult({ tone: 'ok', text: `Đã áp dụng mã ${code}: giảm ${formatVnd(next.discount)}.` })
      setText('')
    } catch (e) {
      const body = e instanceof ApiRequestError ? e.body : null
      if (body?.code === 'HOLD_EXPIRED') return onHoldExpired()
      const problem = body?.details.find((d) => d.field === 'promotionCode')?.reason as PromotionProblem | undefined
      // The previous discount is dropped too: the API asks for a fresh quote without a code.
      if (quote.promotionCode) await requote(null).catch(() => undefined)
      setResult({ tone: 'error', text: `${promotionMessage(code, problem)} Giá vé giữ nguyên, chưa giảm.` })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await requote(null)
      setResult({ tone: 'ok', text: 'Đã bỏ mã giảm giá.' })
    } catch {
      setResult({ tone: 'error', text: 'Chưa bỏ được mã. Thử lại.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={apply} noValidate className="mt-10 max-w-md">
      <label htmlFor={id} className="block font-semibold">
        Mã giảm giá
      </label>
      {quote.promotionCode ? (
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>
            <span aria-hidden="true">✓ </span>Đang dùng mã <span className="font-semibold">{quote.promotionCode}</span>, giảm{' '}
            <span className="tabular">{formatVnd(quote.discount)}</span>
          </span>
          <button type="button" onClick={remove} disabled={busy || disabled} className="text-dust underline underline-offset-4 hover:text-screen">
            Bỏ mã
          </button>
        </p>
      ) : (
        <div className="mt-1.5 flex gap-3">
          <input
            id={id}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setResult(null)
            }}
            maxLength={40}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="Ví dụ: CHAOTHANG11"
            aria-invalid={result?.tone === 'error' || undefined}
            aria-describedby={result ? messageId : undefined}
            className={`h-12 min-w-0 flex-1 rounded-control border bg-house px-4 uppercase text-screen placeholder:normal-case placeholder:text-dust ${
              result?.tone === 'error' ? 'border-velvet' : 'border-seat-line'
            }`}
          />
          <button
            type="submit"
            disabled={busy || disabled}
            aria-busy={busy || undefined}
            className="shrink-0 rounded-control border border-seat-line px-5 font-semibold text-screen transition-colors hover:border-lamp disabled:opacity-60"
          >
            {busy ? 'Đang kiểm tra…' : 'Áp dụng'}
          </button>
        </div>
      )}
      {result && (
        // A success is already shown by the "Đang dùng mã" line: spoken only, not shown twice.
        <p
          id={messageId}
          role={result.tone === 'error' ? 'alert' : 'status'}
          className={result.tone === 'error' ? 'mt-2 text-caption text-velvet' : 'sr-only'}
        >
          {result.text}
        </p>
      )}
    </form>
  )
}

function promotionMessage(code: string, problem: PromotionProblem | undefined): string {
  switch (problem) {
    case 'NOT_FOUND':
      return `Không có mã ${code}. Kiểm tra lại chính tả.`
    case 'EXPIRED':
      return `Mã ${code} đã hết hạn.`
    case 'NOT_STARTED':
      return `Mã ${code} chưa đến ngày sử dụng.`
    case 'MIN_SUBTOTAL':
      return `Mã ${code} cần đơn có tổng tiền cao hơn đơn này.`
    case 'SEAT_TYPE':
      return `Mã ${code} chỉ áp dụng cho loại ghế không có trong đơn này.`
    case 'NOT_FOR_SHOWTIME':
      return `Mã ${code} không áp dụng cho suất chiếu này.`
    default:
      return `Chưa kiểm tra được mã ${code}.`
  }
}

/** 3.2.2.1: the hold ran out before the booking was created. */
function HoldExpired({ seats, seatsUrl }: { seats: string[]; seatsUrl: string }) {
  return (
    <Problem title="Hết thời gian giữ ghế">
      <p className="mt-2 text-dust">
        {seats.length > 0 ? `Ghế ${seats.join(', ')} đã được trả lại` : 'Lượt giữ ghế này không còn'} và chưa có đơn đặt vé nào
        được tạo. Mời bạn chọn lại ghế.
      </p>
      <Link to={seatsUrl} className={`${PRIMARY} mt-5 inline-flex`}>
        Chọn lại ghế
      </Link>
    </Problem>
  )
}

function Problem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="alert" className="mt-4 max-w-prose rounded-panel border border-aisle bg-wall p-6">
      <h1 className="text-step-2 font-semibold">{title}</h1>
      {children}
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải đơn đặt vé">
      <div className="h-5 w-72 rounded-sm bg-wall" />
      <div className="mt-8 grid gap-10 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <div className="h-12 w-2/3 rounded-sm bg-wall" />
          <div className="h-5 w-1/2 rounded-sm bg-wall" />
          <div className="mt-10 h-40 rounded-sm bg-wall" />
        </div>
        <div className="h-72 rounded-panel bg-wall lg:col-span-4" />
      </div>
    </div>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-content px-4 py-8 sm:px-6">{children}</div>
}

const PRIMARY =
  'rounded-control bg-lamp px-5 py-3 font-semibold text-house transition-transform duration-150 ease-(--ease-enter) active:scale-[.985]'
const TEXT_LINK = 'text-screen underline decoration-seat-line underline-offset-4 hover:decoration-lamp'
