import { Suspense, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router'
import { useSession } from '../lib/session'
import { lastTitledPath } from '../lib/pageTitle'

// Site header per brief §4: logo, Đang chiếu, Sắp chiếu, search field, login / account.
// Phones (< 640 px) get one "Phim" link instead of the two tabs. The search
// field and the account name show from 1024 px (at 768 px with a signed-in user
// they overflowed the bar); the search is hidden on the catalogue, which has its own.
export default function RootLayout() {
  const { session, signOut } = useSession()
  const { pathname, search } = useLocation()
  const onCatalogue = pathname === '/movies'
  const comingSoon = onCatalogue && new URLSearchParams(search).get('status') === 'coming-soon'

  const { mainRef, announcement } = useRouteAnnouncer(pathname)

  const link = (active: boolean) =>
    active ? 'text-screen underline decoration-lamp decoration-2 underline-offset-8' : 'text-dust hover:text-screen'

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-lamp focus:px-4 focus:py-2 focus:text-house">
        Bỏ qua điều hướng
      </a>
      <header className="border-b border-aisle">
        <nav aria-label="Điều hướng chính" className="mx-auto flex h-18 max-w-content items-center gap-5 whitespace-nowrap px-4 sm:gap-8 sm:px-6">
          {/* py-3: the wordmark is 18 px tall; the padding gives it a 42 px tap target. */}
          <Link to="/" className="display-wide inline-block py-3 text-step-0 font-extrabold tracking-tight sm:text-step-1">
            MEDI-CINE
          </Link>
          <Link to="/movies" aria-current={onCatalogue ? 'page' : undefined} className={`sm:hidden ${link(onCatalogue)}`}>
            Phim
          </Link>
          <Link
            to="/movies"
            aria-current={onCatalogue && !comingSoon ? 'page' : undefined}
            className={`hidden sm:inline ${link(onCatalogue && !comingSoon)}`}
          >
            Đang chiếu
          </Link>
          <Link
            to="/movies?status=coming-soon"
            aria-current={comingSoon ? 'page' : undefined}
            className={`hidden sm:inline ${link(comingSoon)}`}
          >
            Sắp chiếu
          </Link>
          <span className="ml-auto" />
          {!onCatalogue && <HeaderSearch />}
          {session ? (
            <span className="flex items-center gap-4 text-dust">
              <span title={session.user.displayName} className="hidden max-w-48 truncate lg:inline">
                {session.user.displayName}
              </span>
              <button type="button" onClick={signOut} className="hover:text-screen">
                Đăng xuất
              </button>
            </span>
          ) : (
            <Link to="/login" aria-current={pathname === '/login' ? 'page' : undefined} className={link(pathname === '/login')}>
              Đăng nhập
            </Link>
          )}
        </nav>
      </header>
      {/* tabIndex -1: focus lands here after a page change; no ring on the whole page. */}
      <main id="main" ref={mainRef} tabIndex={-1} className="focus:outline-none">
        {/* While a page's chunk loads (first visit only), hold the space so the layout does not jump. */}
        <Suspense fallback={<div aria-busy="true" aria-label="Đang tải trang" className="min-h-[60vh]" />}>
          <Outlet />
        </Suspense>
      </main>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <ScrollRestoration />
    </>
  )
}

/**
 * A client-side page change is silent for screen readers. After each change of
 * path (not on first load, not on ?query changes such as catalogue filters),
 * wait until the new page has set its tab title (pages load lazily, so this can
 * take a moment; give up after 2 s), then move focus to <main> so reading starts
 * at the new page and announce that title. The previous path is kept in a ref,
 * so StrictMode's second effect run on mount is not taken for a navigation.
 */
function useRouteAnnouncer(pathname: string) {
  const mainRef = useRef<HTMLElement>(null)
  const previous = useRef(pathname)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname
    let waited = 0
    const timer = setInterval(() => {
      waited += 50
      if (lastTitledPath() !== pathname && waited < 2000) return
      clearInterval(timer)
      mainRef.current?.focus({ preventScroll: true })
      setAnnouncement(document.title)
    }, 50)
    return () => clearInterval(timer)
  }, [pathname])

  return { mainRef, announcement }
}

/** Sends the text to the catalogue (?q=…), which runs the search (UC01). */
function HeaderSearch() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const id = useId()

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const q = text.trim()
    navigate(q ? `/movies?q=${encodeURIComponent(q)}` : '/movies')
    setText('')
  }

  return (
    <form role="search" onSubmit={onSubmit} className="hidden lg:block">
      <label htmlFor={id} className="sr-only">
        Tìm phim theo tên
      </label>
      <input
        id={id}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tìm phim…"
        autoComplete="off"
        maxLength={200} // listMovies `search` maxLength (openapi)
        className="h-10 w-56 rounded-control border border-seat-line bg-wall px-3 text-screen placeholder:text-dust"
      />
    </form>
  )
}
