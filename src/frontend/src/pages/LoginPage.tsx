import {
  cloneElement,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ApiRequestError, getShowtime, login, registerCustomer, type ShowtimeContext } from '../mocks/mockApi'
import { useSession } from '../lib/session'
import { formatTime, formatWeekdayDay } from '../lib/format'
import usersData from '../mocks/data/users.json'
import { usePageTitle } from '../lib/pageTitle'

/*
 * Screen 3 — Login / register (UC06; shown by UC02 alt 2.2.2.1 when a guest
 * tries to hold seats). Brief §4 screen 3:
 *   - when the customer came from a seat page, the panel says what they were
 *     doing (movie, time, room, the seats picked) over that movie's still;
 *   - two modes in one panel, Đăng nhập | Đăng ký (?mode=register);
 *   - errors inline under each field plus a summary at the top of the form;
 *   - after success, back to the same seat map (the picked seats are restored there).
 * Register follows openapi RegisterInput (name, email, password 12–128) and
 * then logs in, since registerCustomer does not open a session.
 */

type Mode = 'login' | 'register'
type FieldName = 'displayName' | 'email' | 'password'
type Errors = Partial<Record<FieldName, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 12

export default function LoginPage() {
  const [params, setParams] = useSearchParams()
  const redirect = safeRedirect(params.get('redirect'))
  const mode: Mode = params.get('mode') === 'register' ? 'register' : 'login'
  const { session } = useSession()
  const booking = useBookingContext(redirect)

  // The email typed in one mode is kept when switching to the other.
  const [carryEmail, setCarryEmail] = useState('')
  function switchMode(next: Mode) {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === 'register') p.set('mode', 'register')
        else p.delete('mode')
        return p
      },
      { replace: true },
    )
  }

  const backdrop = booking?.context.movie.backdropUrl
  usePageTitle(session ? 'Bạn đã đăng nhập' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản')
  const title = session
    ? 'Bạn đã đăng nhập'
    : booking
    ? mode === 'login'
      ? 'Đăng nhập để giữ ghế'
      : 'Tạo tài khoản để giữ ghế'
    : mode === 'login'
      ? 'Đăng nhập'
      : 'Tạo tài khoản'

  return (
    <div className="relative isolate">
      {/* House lights: the still of the movie being booked (brief §4 screen 3). */}
      {backdrop && (
        <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-[34rem] overflow-hidden">
          <img src={backdrop} alt="" width={1600} height={840} className="size-full object-cover" />
          <div className="absolute inset-0 bg-house/75" />
          <div className="absolute inset-0 bg-linear-to-t from-house via-house/40 to-transparent" />
          {/* Many stills carry the title art and festival logos in their top part;
              a third scrim from the top sinks them so they do not compete with the page title. */}
          <div className="absolute inset-x-0 top-0 h-3/5 bg-linear-to-b from-house/90 via-house/50 to-transparent" />
        </div>
      )}

      <div className="mx-auto w-full max-w-[30rem] px-4 py-12 sm:py-20">
        <div className="rounded-panel border border-aisle bg-wall p-6 sm:p-8">
          <h1 className="display-wide text-step-3 font-bold">{title}</h1>
          {booking && <BookingContext booking={booking} signedIn={!!session} />}

          {session ? (
            <SignedIn name={session.user.displayName} redirect={redirect} />
          ) : (
            <>
              <div role="group" aria-label="Đăng nhập hoặc đăng ký" className="mt-6 flex gap-6 border-b border-aisle">
                {(['login', 'register'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => switchMode(m)}
                    // Not a box inside the panel (DESIGN.md: panels never hold panels): an underline tab.
                    className={`-mb-px border-b-2 pb-2.5 pt-1 font-semibold transition-colors duration-150 ${
                      mode === m ? 'border-lamp text-screen' : 'border-transparent text-dust hover:text-screen'
                    }`}
                  >
                    {m === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                  </button>
                ))}
              </div>
              {/* key: switching mode starts a clean form */}
              <AuthForm key={mode} mode={mode} redirect={redirect} initialEmail={carryEmail} onEmailChange={setCarryEmail} onSwitch={switchMode} />
            </>
          )}
        </div>

        {!session && mode === 'login' && <DemoAccountHint />}
      </div>
    </div>
  )
}

function AuthForm({
  mode,
  redirect,
  initialEmail,
  onEmailChange,
  onSwitch,
}: {
  mode: Mode
  redirect: string
  initialEmail: string
  onEmailChange: (email: string) => void
  onSwitch: (m: Mode) => void
}) {
  const navigate = useNavigate()
  const { signIn } = useSession()
  const [values, setValues] = useState({ displayName: '', email: initialEmail, password: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<ReactNode>(null)
  const [busy, setBusy] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const ids = { displayName: useId(), email: useId(), password: useId() }
  const register = mode === 'register'

  function validate(): Errors {
    const e: Errors = {}
    if (register && !values.displayName.trim()) e.displayName = 'Nhập họ tên để rạp gọi đúng tên bạn.'
    if (!values.email.trim()) e.email = 'Nhập email.'
    else if (!EMAIL_PATTERN.test(values.email.trim())) e.email = 'Email chưa đúng dạng, ví dụ ten@mien.vn.'
    if (!values.password) e.password = 'Nhập mật khẩu.'
    else if (register && values.password.length < MIN_PASSWORD)
      e.password = `Mật khẩu cần ít nhất ${MIN_PASSWORD} ký tự (đang có ${values.password.length}).`
    return e
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    setBusy(true)
    try {
      if (register)
        await registerCustomer({ displayName: values.displayName, email: values.email, password: values.password })
      signIn(await login(values.email, values.password))
      navigate(redirect, { replace: true })
    } catch (e) {
      const code = e instanceof ApiRequestError ? e.body.code : null
      if (code === 'ACCOUNT_EXISTS') {
        setErrors({ email: 'Email này đã có tài khoản.' })
        setFormError(
          <>
            Email này đã có tài khoản.{' '}
            <button type="button" onClick={() => onSwitch('login')} className="font-semibold underline underline-offset-4">
              Đăng nhập bằng email này
            </button>
          </>,
        )
      } else if (code === 'INVALID_CREDENTIALS') {
        setFormError('Email hoặc mật khẩu không đúng. Kiểm tra lại rồi đăng nhập lần nữa.')
      } else {
        setFormError(`Không ${register ? 'tạo được tài khoản' : 'đăng nhập được'}. Kiểm tra kết nối rồi thử lại.`)
      }
      requestAnimationFrame(() => summaryRef.current?.focus())
    } finally {
      setBusy(false)
    }
  }

  const fieldErrors = (Object.entries(errors) as [FieldName, string][]).filter(([, msg]) => msg)
  const showSummary = formError !== null || fieldErrors.length > 0
  const set = (name: FieldName) => (value: string) => {
    setValues((v) => ({ ...v, [name]: value }))
    if (name === 'email') onEmailChange(value)
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }))
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-6">
      {showSummary && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="mb-6 rounded-control border border-velvet px-4 py-3 text-caption text-velvet">
          {formError ?? (
            <>
              <p className="font-semibold">Cần sửa {fieldErrors.length} mục trước khi tiếp tục:</p>
              <ul className="mt-1 list-disc pl-5">
                {fieldErrors.map(([name, msg]) => (
                  <li key={name}>
                    <a href={`#${ids[name]}`} className="underline underline-offset-2">
                      {msg}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="grid gap-5">
        {register && (
          <Field id={ids.displayName} label="Họ tên" error={errors.displayName}>
            <input type="text" autoComplete="name" maxLength={100} value={values.displayName} onChange={(e) => set('displayName')(e.target.value)} />
          </Field>
        )}
        <Field id={ids.email} label="Email" error={errors.email}>
          <input type="email" autoComplete="email" inputMode="email" maxLength={254} value={values.email} onChange={(e) => set('email')(e.target.value)} />
        </Field>
        <Field
          id={ids.password}
          label="Mật khẩu"
          hint={register ? `Ít nhất ${MIN_PASSWORD} ký tự.` : undefined}
          error={errors.password}
        >
          <input
            type="password"
            autoComplete={register ? 'new-password' : 'current-password'}
            maxLength={128}
            value={values.password}
            onChange={(e) => set('password')(e.target.value)}
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={busy}
        aria-busy={busy || undefined}
        className="mt-7 w-full rounded-control bg-lamp px-5 py-3 font-semibold text-house transition-transform duration-150 ease-(--ease-enter) active:scale-[.985] disabled:cursor-wait disabled:opacity-80"
      >
        {busy ? (register ? 'Đang tạo tài khoản…' : 'Đang đăng nhập…') : register ? 'Tạo tài khoản' : 'Đăng nhập'}
      </button>
    </form>
  )
}

/** Label above, hint and error under the input, wired with aria-describedby (DESIGN.md Inputs). */
function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  children: ReactElement<InputHTMLAttributes<HTMLInputElement>>
}) {
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined
  const input = cloneElement(children, {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    className: `mt-1.5 h-12 w-full rounded-control border bg-house px-4 text-screen ${error ? 'border-velvet' : 'border-seat-line'}`,
  })
  return (
    <div>
      <label htmlFor={id} className="block font-semibold">
        {label}
      </label>
      {input}
      {hint && (
        <p id={hintId} className="mt-1.5 text-caption text-dust">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-caption text-velvet">
          {error}
        </p>
      )}
    </div>
  )
}

function SignedIn({ name, redirect }: { name: string; redirect: string }) {
  return (
    <div className="mt-6">
      <p className="text-dust">
        Bạn đang đăng nhập với tên <span className="text-screen">{name}</span>.
      </p>
      <Link to={redirect} className="mt-5 inline-flex rounded-control bg-lamp px-5 py-3 font-semibold text-house">
        {redirect === '/' ? 'Về trang chủ' : 'Quay lại chọn ghế'}
      </Link>
    </div>
  )
}

interface BookingInfo {
  context: ShowtimeContext
  seatLabels: string[]
}

/** What the customer was doing: movie, time, room and the seats picked (not held yet). */
function BookingContext({ booking, signedIn }: { booking: BookingInfo; signedIn: boolean }) {
  const { movie, showtime, room } = booking.context
  return (
    <div className="mt-3 text-dust">
      <p>
        <span className="text-screen">{movie.title}</span>, suất{' '}
        <span className="tabular">
          {formatTime(showtime.startsAt)} {formatWeekdayDay(showtime.startsAt)}
        </span>
        , {room.name}
      </p>
      {booking.seatLabels.length > 0 && (
        <p className="mt-2 text-caption">
          Ghế bạn đã chọn: <span className="tabular text-screen">{booking.seatLabels.join(', ')}</span>.{' '}
          {signedIn ? 'Ghế chỉ được giữ khi bạn bấm "Giữ ghế".' : 'Ghế chỉ được giữ sau khi bạn đăng nhập và bấm "Giữ ghế".'}
        </p>
      )}
    </div>
  )
}

/** Reads the showtime from a seat-page redirect and the seats saved by that page. */
function useBookingContext(redirect: string): BookingInfo | null {
  const showtimeId = /^\/showtimes\/([^/?#]+)\/seats/.exec(redirect)?.[1] ?? null
  const [result, setResult] = useState<{ id: string; info: BookingInfo } | null>(null)

  useEffect(() => {
    if (!showtimeId) return
    let alive = true
    getShowtime(showtimeId)
      .then((context) => {
        if (alive) setResult({ id: showtimeId, info: { context, seatLabels: pendingSeatLabels(showtimeId) } })
      })
      .catch(() => {
        /* unknown showtime: show the plain login panel */
      })
    return () => {
      alive = false
    }
  }, [showtimeId])

  return result && result.id === showtimeId ? result.info : null
}

/** Same key as SeatSelectionPage; seat ids end in their label ("room-01-D5" -> "D5"). */
function pendingSeatLabels(showtimeId: string): string[] {
  try {
    const ids = JSON.parse(sessionStorage.getItem(`medicine.pendingSeats.${showtimeId}`) ?? '[]') as string[]
    return ids.map((id) => id.split('-').pop() ?? id)
  } catch {
    return []
  }
}

/** Mock only: the sample account from mocks/data/users.json, so testers can log in. */
/**
 * Mock-only test account, folded by default (Phase 5): testers open it in one
 * click, and screenshots of this screen do not show a password.
 */
function DemoAccountHint() {
  const demo = usersData.users[0]
  return (
    <details className="mt-5 px-1 text-caption text-dust">
      <summary className="w-fit cursor-pointer underline decoration-seat-line underline-offset-4 hover:text-screen">
        Tài khoản dùng thử
      </summary>
      <p className="mt-2 text-pretty">
        Bản thử nghiệm: dùng tài khoản <span className="text-screen">{demo.email}</span>, mật khẩu{' '}
        <span className="text-screen">{demo.mockPassword}</span>.
      </p>
    </details>
  )
}

/** Only allow in-app paths, never another site. */
function safeRedirect(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}
