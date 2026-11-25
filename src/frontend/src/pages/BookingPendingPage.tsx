import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router'
import type { Booking } from '../types/api'
import { ApiRequestError, getBooking } from '../mocks/mockApi'
import { useSession } from '../lib/session'
import { useCountdown } from '../hooks/useCountdown'
import { formatCountdown, formatDate, formatTime, formatVnd } from '../lib/format'
import BookingSteps from '../components/BookingSteps'
import { SEAT_TYPE_LABEL } from '../components/seat-map/seatVisual'
import { usePageTitle } from '../lib/pageTitle'

/*
 * Screen 5b — Booking created, status PENDING (UC03 end), brief §4 screen 5.
 * Shows the booking reference, "Chờ thanh toán", the payable amount and the
 * time left to pay. It never shows "Đã thanh toán", a QR ticket or SOLD seats
 * (P1, P2): payment is UC04, so its button is shown but not active yet.
 * When the payment time runs out the booking reads EXPIRED (seats released).
 */

type State = { status: 'loading' } | { status: 'error'; notFound: boolean } | { status: 'ready'; booking: Booking }

export default function BookingPendingPage() {
  const { session } = useSession()
  const { pathname } = useLocation()
  if (!session) return <Navigate to={`/login?redirect=${encodeURIComponent(pathname)}`} replace />
  return <PendingBooking />
}

function PendingBooking() {
  const { bookingId = '' } = useParams()
  const [result, setResult] = useState<{ key: string; state: State } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const key = `${bookingId}#${attempt}`

  useEffect(() => {
    let alive = true
    getBooking(bookingId)
      .then((booking) => alive && setResult({ key, state: { status: 'ready', booking } }))
      .catch((e: unknown) => {
        if (alive)
          setResult({ key, state: { status: 'error', notFound: e instanceof ApiRequestError && e.status === 404 } })
      })
    return () => {
      alive = false
    }
  }, [bookingId, key])

  // At the deadline, read the booking again: the server decides it is EXPIRED (D4).
  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  const state: State = result?.key === key ? result.state : result?.state.status === 'ready' ? result.state : { status: 'loading' }
  const booking = state.status === 'ready' ? state.booking : null
  usePageTitle(
    booking
      ? booking.status === 'EXPIRED'
        ? `Đơn ${booking.id} đã hết hạn`
        : `Đơn ${booking.id}: chờ thanh toán`
      : state.status === 'error'
        ? state.notFound
          ? 'Không tìm thấy đơn đặt vé'
          : 'Không tải được đơn đặt vé'
        : null,
  )
  const remaining = useCountdown(
    booking?.status === 'PENDING' ? booking.expiresAt : null,
    booking?.serverTime ?? null,
    reload,
  )

  if (state.status === 'loading')
    return (
      <Shell>
        <div aria-busy="true" aria-label="Đang tải đơn đặt vé" className="mt-8 h-64 max-w-3xl rounded-panel bg-wall" />
      </Shell>
    )
  if (state.status === 'error')
    return (
      <Shell>
        <div role="alert" className="mt-8 max-w-prose rounded-panel border border-aisle bg-wall p-6">
          <h1 className="text-step-2 font-semibold">{state.notFound ? 'Không tìm thấy đơn đặt vé' : 'Không tải được đơn đặt vé'}</h1>
          <p className="mt-2 text-dust">
            {state.notFound
              ? 'Đơn chỉ được lưu trong phiên thử nghiệm này; tải lại trang sẽ làm mất đơn.'
              : 'Kiểm tra kết nối rồi thử lại.'}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-5">
            {!state.notFound && (
              <button type="button" onClick={reload} className="rounded-control bg-lamp px-5 py-3 font-semibold text-house">
                Thử lại
              </button>
            )}
            <Link to="/movies" className="text-screen underline decoration-seat-line underline-offset-4 hover:decoration-lamp">
              Về danh sách phim
            </Link>
          </div>
        </div>
      </Shell>
    )

  const b = state.booking
  const q = b.quoteSnapshot
  const expired = b.status === 'EXPIRED'
  const lowTime = remaining <= 60

  return (
    <Shell>
      <BookingSteps current={4} />

      <div className="mt-8 max-w-3xl">
        {expired ? (
          <>
            <h1 className="display-wide text-step-3 font-bold sm:text-step-4">Đơn {b.id} đã hết hạn thanh toán</h1>
            <p className="mt-3 max-w-prose text-dust">
              Đơn chưa được thanh toán trước thời hạn nên ghế đã được trả lại. Bạn có thể chọn ghế và đặt lại.
            </p>
            <Link to={`/showtimes/${q.showtimeId}/seats`} className="mt-5 inline-flex rounded-control bg-lamp px-5 py-3 font-semibold text-house">
              Chọn ghế lại
            </Link>
          </>
        ) : (
          <>
            <h1 className="display-wide text-step-4 font-bold sm:text-step-5">
              <span className="sr-only">Mã đơn </span>
              {/* The text face: in the wide display face O and 0 look alike in a code people read out. */}
              <span className="tabular font-sans font-semibold tracking-wide">{b.id}</span>
            </h1>
            {/* What happened, said under the code rather than as a label over it (Phase 7 polish). */}
            <p className="mt-1 text-dust">Đơn đặt vé đã được tạo.</p>

            {/* Status in words plus an icon, never colour alone. */}
            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
              <Fact label="Trạng thái">
                <span className="inline-flex items-center gap-2">
                  <ClockIcon />
                  Chờ thanh toán
                </span>
              </Fact>
              <Fact label="Số tiền phải trả">
                <span className="tabular">{formatVnd(q.total)}</span>
              </Fact>
              <Fact label="Thời hạn thanh toán">
                <span
                  role="timer"
                  aria-live={lowTime ? 'polite' : 'off'}
                  className={`tabular transition-colors duration-200 ${lowTime ? 'text-velvet' : 'text-lamp'}`}
                >
                  còn {formatCountdown(remaining)}
                </span>
              </Fact>
            </dl>
          </>
        )}

        <section aria-labelledby="detail-h" className="mt-10 rounded-panel border border-aisle bg-wall p-6">
          <h2 id="detail-h" className="text-step-1 font-semibold">
            Chi tiết đơn
          </h2>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            <dt className="text-dust">Phim</dt>
            <dd>{q.movieTitle}</dd>
            <dt className="text-dust">Suất chiếu</dt>
            <dd className="tabular">
              {formatTime(q.startsAt)}, {formatDate(q.startsAt)}
            </dd>
            <dt className="text-dust">Phòng</dt>
            <dd>{q.roomName}</dd>
            <dt className="text-dust">Ghế</dt>
            <dd className="tabular">
              {q.items.map((i) => `${i.seatLabel} (${SEAT_TYPE_LABEL[i.seatType]})`).join(', ')}
            </dd>
            <dt className="text-dust">Tạm tính</dt>
            <dd className="tabular">{formatVnd(q.subtotal)}</dd>
            <dt className="text-dust">Giảm giá</dt>
            <dd className="tabular">
              {q.discount > 0 ? `−${formatVnd(q.discount)} (mã ${q.promotionCode})` : 'Không dùng mã'}
            </dd>
            {/* The amount to pay is the row that matters: ruled off and one step larger. */}
            <div className="col-span-2 mt-2 grid grid-cols-subgrid items-baseline border-t border-seat-line pt-3">
              <dt className="font-semibold">Phải trả</dt>
              <dd className="tabular text-step-1 font-semibold">{formatVnd(q.total)}</dd>
            </div>
          </dl>
        </section>

        {!expired && (
          <div className="mt-8">
            {/* UC04 Make Payment is a later sprint: shown so the flow is clear, not active. */}
            <button
              type="button"
              disabled
              aria-describedby="pay-note"
              className="rounded-control bg-aisle px-5 py-3 font-semibold text-dust disabled:cursor-not-allowed"
            >
              Thanh toán qua VNPAY
            </button>
            <p id="pay-note" className="mt-3 max-w-prose text-pretty text-caption text-dust">
              Thanh toán qua VNPAY chưa mở trong bản thử nghiệm này. Đơn đang chờ thanh toán: chưa có vé, ghế vẫn được giữ
              cho bạn đến hết thời hạn ở trên.
            </p>
          </div>
        )}
      </div>
    </Shell>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-caption text-dust">{label}</dt>
      <dd className="mt-1 text-step-1 font-semibold">{children}</dd>
    </div>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5 shrink-0">
      <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 6v4.2l2.6 1.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-content px-4 py-8 sm:px-6">{children}</div>
}
