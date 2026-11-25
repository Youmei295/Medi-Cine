import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import type { Hold, Id, SeatMap as SeatMapData, SeatType, SeatView } from '../types/api'
import { ApiRequestError, createHold, getSeatMap, getShowtime, releaseHold, type ShowtimeContext } from '../mocks/mockApi'
import { useSession } from '../lib/session'
import { useCountdown } from '../hooks/useCountdown'
import { formatCountdown, formatDate, formatTime, formatVnd } from '../lib/format'
import BookingSteps from '../components/BookingSteps'
import SeatMap from '../components/seat-map/SeatMap'
import SeatLegend from '../components/seat-map/SeatLegend'
import { SEAT_TYPE_LABEL } from '../components/seat-map/seatVisual'
import { usePageTitle } from '../lib/pageTitle'

const MAX_SEATS = 20 // HoldInput.seatIds maxItems (openapi)
const pendingKey = (showtimeId: Id) => `medicine.pendingSeats.${showtimeId}`

type Notice = { tone: 'error' | 'info'; text: string } | null

// Screen 4 — Seat selection (UC02).
export default function SeatSelectionPage() {
  const { showtimeId = '' } = useParams()
  const { session } = useSession()
  const navigate = useNavigate()
  const location = useLocation()

  const [context, setContext] = useState<ShowtimeContext | null>(null)
  const [seatMap, setSeatMap] = useState<SeatMapData | null>(null)
  // 'notFound' = no such showtime (404); 'failed' = the server did not answer.
  const [loadError, setLoadError] = useState<'notFound' | 'failed' | null>(null)
  const [attempt, setAttempt] = useState(0)
  usePageTitle(
    loadError === 'notFound'
      ? 'Không tìm thấy suất chiếu'
      : loadError
        ? 'Không tải được sơ đồ ghế'
        : context
          ? `Chọn ghế: ${context.movie.title}`
          : null,
  )
  const [selected, setSelected] = useState<Set<Id>>(() => restorePending(showtimeId))
  const [hold, setHold] = useState<Hold | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  // Seats lost to another customer in the last hold attempt (2.2.2.2): SeatMap pulses them once.
  const [taken, setTaken] = useState<{ ids: ReadonlySet<Id>; key: number } | null>(null)

  const refreshMap = useCallback(() => getSeatMap(showtimeId).then(setSeatMap), [showtimeId])

  // The saved selection only bridges one trip to the login page (UC02 alt 2.2.2.1):
  // once restored into state above, it is dropped, so seats the customer later
  // deselects never come back on a later visit.
  useEffect(() => clearPending(showtimeId), [showtimeId])

  useEffect(() => {
    let alive = true
    Promise.all([getShowtime(showtimeId), getSeatMap(showtimeId)])
      .then(([ctx, map]) => {
        if (!alive) return
        setContext(ctx)
        setSeatMap(map)
      })
      .catch((error: unknown) => {
        if (alive) setLoadError(error instanceof ApiRequestError && error.status === 404 ? 'notFound' : 'failed')
      })
    return () => {
      alive = false
    }
  }, [showtimeId, attempt])

  function retryLoad() {
    setLoadError(null)
    setAttempt((n) => n + 1)
  }

  // Hold expired (UC02 alt 2.2.2.5): clear selection, refresh the map.
  const onHoldExpired = useCallback(() => {
    setHold(null)
    setSelected(new Set())
    setNotice({ tone: 'error', text: 'Hết thời gian giữ ghế. Các ghế đã được trả lại, mời bạn chọn lại.' })
    void refreshMap()
  }, [refreshMap])
  const remaining = useCountdown(hold?.expiresAt ?? null, hold?.serverTime ?? null, onHoldExpired)

  const seatById = useMemo(() => new Map((seatMap?.seats ?? []).map((s) => [s.seatId, s])), [seatMap])
  const chosen = [...selected].map((id) => seatById.get(id)).filter((s): s is SeatView => !!s)
  const subtotal = chosen.reduce((sum, s) => sum + (s.price ?? 0), 0)
  const prices = useMemo(() => {
    const out: Partial<Record<SeatType, number>> = {}
    seatMap?.seats.forEach((s) => {
      if (s.price !== null) out[s.type] = s.price
    })
    return out
  }, [seatMap])
  const soldOut = !!seatMap && seatMap.seats.every((s) => s.state !== 'AVAILABLE')
  const mine = useMemo(() => new Set(hold?.seatIds ?? []), [hold])

  function toggle(seat: SeatView) {
    setNotice(null)
    setTaken(null)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(seat.seatId)) next.delete(seat.seatId)
      else if (next.size < MAX_SEATS) next.add(seat.seatId)
      else setNotice({ tone: 'info', text: `Bạn chỉ chọn được tối đa ${MAX_SEATS} ghế cho một lần đặt.` })
      return next
    })
  }

  async function onHold() {
    if (!session) {
      // UC02 alt 2.2.2.1: keep the choice, ask to log in, come back here.
      savePending(showtimeId, selected)
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`)
      return
    }
    setBusy(true)
    setNotice(null)
    try {
      const created = await createHold(showtimeId, [...selected])
      setHold(created)
      clearPending(showtimeId)
      await refreshMap()
    } catch (error) {
      // UC02 alt 2.2.2.2: whole selection rejected, map refreshed, taken seats named.
      if (error instanceof ApiRequestError && error.body.code === 'SEATS_UNAVAILABLE') {
        const conflicting = error.body.context?.conflictingSeatIds ?? []
        const labels = conflicting.map((id) => seatById.get(id)?.label ?? id)
        // Refresh first, then change selection, notice and pulse in one render:
        // the taken seats turn HELD exactly when they pulse, the notice follows.
        await refreshMap()
        setSelected(new Set())
        setTaken({ ids: new Set(conflicting), key: Date.now() })
        setNotice({
          tone: 'error',
          text: `Ghế ${labels.join(', ')} vừa được người khác giữ. Lựa chọn của bạn chưa được giữ; sơ đồ đã cập nhật, mời chọn lại.`,
        })
      } else if (error instanceof ApiRequestError && error.body.code === 'SHOWTIME_CLOSED') {
        // The page was opened before the start time, or through an old link.
        setNotice({ tone: 'error', text: 'Suất chiếu này đã bắt đầu nên không còn nhận đặt vé. Mời bạn chọn suất khác ("Đổi suất").' })
      } else {
        setNotice({ tone: 'error', text: 'Không giữ được ghế. Kiểm tra kết nối rồi bấm "Giữ ghế" lần nữa.' })
      }
    } finally {
      setBusy(false)
    }
  }

  async function onRelease() {
    if (!hold) return
    setBusy(true)
    await releaseHold(hold.id)
    setHold(null)
    setSelected(new Set())
    setNotice({ tone: 'info', text: 'Đã bỏ giữ ghế. Bạn có thể chọn lại.' })
    await refreshMap()
    setBusy(false)
  }

  if (loadError) return <LoadError kind={loadError} onRetry={retryLoad} />
  if (!context || !seatMap)
    return (
      <PageShell>
        <SeatPageSkeleton />
      </PageShell>
    )

  const { movie, room, showtime } = context
  const backdrop = movie.backdropUrl

  return (
    <div className="relative isolate">
      {/* House lights: the movie's still, dimmed, behind the page (brief §2) */}
      {backdrop && (
        <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-[28rem] overflow-hidden">
          <img src={backdrop} alt="" className="size-full scale-110 object-cover opacity-25 blur-2xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-house/40 to-house" />
        </div>
      )}

      <PageShell>
        <BookingSteps current={2} />

        <header className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display-wide text-step-4 font-bold">{movie.title}</h1>
            <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-dust">
              <span>{room.name}</span>
              <span className="tabular">
                {formatTime(showtime.startsAt)}, {formatDate(showtime.startsAt)}
              </span>
              <span className="rounded-control border border-seat-line px-2 text-caption leading-6 text-screen">{showtime.format}</span>
            </p>
          </div>
          <Link to={`/movies/${movie.id}`} className="text-lamp underline-offset-4 hover:underline">
            Đổi suất
          </Link>
        </header>

        {/* Below 1024 px the notice sits above the map (the panel becomes a bottom bar). */}
        {notice && (
          <p
            key={notice.text}
            role={notice.tone === 'error' ? 'alert' : 'status'}
            className={`mt-6 animate-notice-in rounded-control border px-4 py-3 text-caption lg:hidden ${notice.tone === 'error' ? 'border-velvet text-velvet' : 'border-seat-line text-screen'}`}
          >
            {notice.text}
          </p>
        )}

        <div className="mt-8 grid gap-8 pb-28 lg:grid-cols-12 lg:pb-0">
          <section aria-label="Sơ đồ ghế" className="min-w-0 lg:col-span-8">
            <SeatMap seatMap={seatMap} selectedIds={selected} mineIds={mine} locked={!!hold || soldOut} onToggle={toggle} taken={taken} />
            <div className="mt-10">
              <SeatLegend prices={prices} />
            </div>
          </section>

          {/* Bottom bar, < 1024 px (brief §7): count, total, countdown, main action */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-aisle bg-wall/95 px-4 py-3 backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-content items-center gap-4">
              {soldOut ? (
                <>
                  <p className="min-w-0 flex-1 font-semibold">Suất chiếu đã hết vé</p>
                  <Link to={`/movies/${movie.id}`} className="transition-transform duration-150 ease-(--ease-enter) active:scale-[.985] shrink-0 rounded-control bg-lamp px-4 py-3 font-semibold text-house">
                    Xem suất khác
                  </Link>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-caption text-dust">
                      {chosen.length === 0 ? 'Chưa chọn ghế' : `${chosen.length} ghế: ${chosen.map((s) => s.label).join(', ')}`}
                    </p>
                    {/* The timer wraps under the total as one piece when the bar is narrow. */}
                    <p className="flex flex-wrap items-baseline gap-x-3">
                      <span className="tabular text-step-1 font-semibold">
                        {/* Keyed on the amount: each change settles in once (brief §8, total updating). */}
                        <span key={subtotal} className="inline-block animate-value-settle">
                          {formatVnd(subtotal)}
                        </span>
                      </span>
                      {hold && (
                        <span
                          role="timer"
                          className={`tabular whitespace-nowrap text-caption transition-colors duration-200 ${remaining <= 60 ? 'text-velvet' : 'text-lamp'}`}
                        >
                          Giữ ghế {formatCountdown(remaining)}
                        </span>
                      )}
                    </p>
                  </div>
                  {hold ? (
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={onRelease} disabled={busy} aria-label="Bỏ giữ ghế" className="transition-transform duration-150 ease-(--ease-enter) active:scale-[.985] rounded-control border border-seat-line px-3 py-3 text-screen disabled:opacity-60">
                        Bỏ giữ
                      </button>
                      <button type="button" onClick={() => navigate(`/checkout?holdId=${hold.id}&showtimeId=${showtimeId}`)} className="transition-transform duration-150 ease-(--ease-enter) active:scale-[.985] rounded-control bg-lamp px-4 py-3 font-semibold text-house">
                        Tiếp tục
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={onHold}
                      disabled={chosen.length === 0 || busy}
                      aria-busy={busy || undefined}
                      className="transition-transform duration-150 ease-(--ease-enter) active:scale-[.985] shrink-0 rounded-control bg-lamp px-4 py-3 font-semibold text-house disabled:cursor-not-allowed disabled:bg-aisle disabled:text-dust"
                    >
                      {busy ? 'Đang giữ…' : session ? 'Giữ ghế' : 'Đăng nhập để giữ'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <aside className="hidden lg:col-span-4 lg:block">
            <div className="rounded-panel border border-aisle bg-wall p-6 lg:sticky lg:top-6">
              {soldOut ? (
                <>
                  <h2 className="text-step-1 font-semibold">Suất chiếu đã hết vé</h2>
                  <p className="mt-2 text-dust">Mời bạn chọn suất khác của phim này.</p>
                  <Link to={`/movies/${movie.id}`} className="transition-transform duration-150 ease-(--ease-enter) active:scale-[.985] mt-5 inline-flex rounded-control bg-lamp px-5 py-3 font-semibold text-house">
                    Xem suất khác
                  </Link>
                </>
              ) : (
                <>
                  <h2 className="text-step-1 font-semibold">Ghế đã chọn</h2>
                  {chosen.length === 0 ? (
                    <p className="mt-2 text-pretty text-dust">Chọn ghế trên sơ đồ. Mỗi lần đặt tối đa {MAX_SEATS} ghế.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-aisle">
                      {chosen.map((seat) => (
                        <li key={seat.seatId} className="flex items-baseline justify-between gap-3 py-2">
                          <span>
                            <span className="tabular font-semibold">{seat.label}</span>{' '}
                            <span className="text-dust">{SEAT_TYPE_LABEL[seat.type]}</span>
                          </span>
                          <span className="tabular">{formatVnd(seat.price ?? 0)}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-4 flex items-baseline justify-between border-t border-seat-line pt-4">
                    <span className="text-dust">Tạm tính</span>
                    {/* The live region stays mounted; only the inner amount is keyed. */}
                    <span className="tabular text-step-2 font-semibold" aria-live="polite">
                      <span key={subtotal} className="inline-block animate-value-settle">
                        {formatVnd(subtotal)}
                      </span>
                    </span>
                  </div>

                  {hold ? (
                    // Timer and actions replace the hold button together, once per hold.
                    <div className="animate-panel-in">
                      <p
                        className={`mt-5 flex items-baseline justify-between rounded-control px-4 py-3 transition-colors duration-200 ${remaining <= 60 ? 'animate-timer-beat bg-velvet/15 text-velvet' : 'bg-lamp/10 text-lamp'}`}
                        role="timer"
                        aria-live={remaining <= 60 ? 'polite' : 'off'}
                      >
                        <span>Đang giữ ghế cho bạn</span>
                        <span className="tabular text-step-1 font-semibold">{formatCountdown(remaining)}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate(`/checkout?holdId=${hold.id}&showtimeId=${showtimeId}`)}
                        className="transition-transform duration-150 ease-(--ease-enter) active:scale-[.985] mt-4 w-full rounded-control bg-lamp px-5 py-3 font-semibold text-house"
                      >
                        Tiếp tục
                      </button>
                      <button
                        type="button"
                        onClick={onRelease}
                        disabled={busy}
                        className="transition-transform duration-150 ease-(--ease-enter) active:scale-[.985] mt-2 w-full rounded-control border border-seat-line px-5 py-3 text-screen disabled:opacity-60"
                      >
                        Bỏ giữ ghế
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={onHold}
                      disabled={chosen.length === 0 || busy}
                      aria-busy={busy || undefined}
                      className="transition-transform duration-150 ease-(--ease-enter) active:scale-[.985] mt-5 w-full rounded-control bg-lamp px-5 py-3 font-semibold text-house disabled:cursor-not-allowed disabled:bg-aisle disabled:text-dust"
                    >
                      {busy ? 'Đang giữ ghế…' : session ? 'Giữ ghế' : 'Đăng nhập để giữ ghế'}
                    </button>
                  )}
                  <p className="mt-3 text-pretty text-caption text-dust">Ghế được giữ 10 phút. Giá cuối cùng được xác nhận ở bước sau.</p>
                </>
              )}

              {notice && (
                <p
                  key={notice.text}
                  role={notice.tone === 'error' ? 'alert' : 'status'}
                  className={`mt-4 animate-notice-in rounded-control border px-4 py-3 text-caption ${notice.tone === 'error' ? 'border-velvet text-velvet' : 'border-seat-line text-screen'}`}
                >
                  {notice.text}
                </p>
              )}
            </div>
          </aside>
        </div>
      </PageShell>
    </div>
  )
}

/** The showtime or its seat map could not be loaded (brief §6): say which, offer the way on. */
function LoadError({ kind, onRetry }: { kind: 'notFound' | 'failed'; onRetry: () => void }) {
  const notFound = kind === 'notFound'
  return (
    <PageShell>
      <div role="alert" className="max-w-prose rounded-panel border border-aisle bg-wall p-6">
        <h1 className="text-step-2 font-semibold">{notFound ? 'Không tìm thấy suất chiếu' : 'Không tải được sơ đồ ghế'}</h1>
        <p className="mt-2 text-pretty text-dust">
          {notFound
            ? 'Suất chiếu này không có trong lịch của rạp. Mời bạn chọn suất khác từ trang phim.'
            : 'Máy chủ của rạp chưa phản hồi nên chưa biết ghế nào còn trống. Kiểm tra kết nối mạng rồi thử lại.'}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-5">
          {!notFound && (
            <button type="button" onClick={onRetry} className="rounded-control bg-lamp px-5 py-3 font-semibold text-house transition-transform duration-150 ease-(--ease-enter) active:scale-[.985]">
              Thử lại
            </button>
          )}
          <Link
            to="/movies"
            className={
              notFound
                ? 'rounded-control bg-lamp px-5 py-3 font-semibold text-house'
                : 'text-screen underline decoration-seat-line underline-offset-4 hover:decoration-lamp'
            }
          >
            Về danh sách phim
          </Link>
        </div>
      </div>
    </PageShell>
  )
}

/** Loading: the page's real shape (steps, title, seat rows, summary panel), no spinner (brief §6). */
function SeatPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải sơ đồ ghế">
      <div className="h-4 w-72 max-w-full rounded-sm bg-wall" />
      <div className="mt-6 h-11 w-96 max-w-full rounded-sm bg-wall" />
      <div className="mt-3 h-5 w-64 max-w-full rounded-sm bg-wall" />
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="mx-auto h-1 w-full max-w-[44rem] rounded-full bg-wall" />
          <div className="mx-auto mt-12 grid max-w-[30rem] grid-cols-8 gap-1.5 sm:grid-cols-12">
            {Array.from({ length: 96 }, (_, i) => (
              <div key={i} className={`aspect-square rounded-seat bg-wall ${i >= 64 ? 'hidden sm:block' : ''}`} />
            ))}
          </div>
        </div>
        <div className="hidden h-80 rounded-panel bg-wall lg:col-span-4 lg:block" />
      </div>
    </div>
  )
}

function PageShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-content px-4 py-8 sm:px-6">{children}</div>
}

function restorePending(showtimeId: Id): Set<Id> {
  try {
    const raw = sessionStorage.getItem(pendingKey(showtimeId))
    return new Set(raw ? (JSON.parse(raw) as Id[]) : [])
  } catch {
    return new Set()
  }
}

function savePending(showtimeId: Id, ids: Set<Id>) {
  try {
    sessionStorage.setItem(pendingKey(showtimeId), JSON.stringify([...ids]))
  } catch {
    /* ignore */
  }
}

function clearPending(showtimeId: Id) {
  try {
    sessionStorage.removeItem(pendingKey(showtimeId))
  } catch {
    /* ignore */
  }
}
