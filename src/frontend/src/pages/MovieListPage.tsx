import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { MovieDetails } from '../types/api'
import { listMovies } from '../mocks/mockApi'
import { byNewestRelease, bySoonestRelease } from '../lib/movieOrder'
import PosterTile from '../components/movie/PosterTile'
import { usePageTitle } from '../lib/pageTitle'

/*
 * Screen 1 — Movie catalogue (UC01, brief §4 screen 1).
 * The tab, search text and genre live in the URL (?status=coming-soon&q=…&genre=…),
 * so the header search can land here and every state has its own URL to screenshot.
 */

type Tab = 'now-showing' | 'coming-soon'
const TABS: { id: Tab; label: string; status: 'NOW_SHOWING' | 'COMING_SOON' }[] = [
  { id: 'now-showing', label: 'Đang chiếu', status: 'NOW_SHOWING' },
  { id: 'coming-soon', label: 'Sắp chiếu', status: 'COMING_SOON' },
]
const SEARCH_DELAY_MS = 250

export default function MovieListPage() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.find((t) => t.id === params.get('status')) ?? TABS[0]
  const query = params.get('q') ?? ''
  const genre = params.get('genre') ?? ''
  usePageTitle(`Phim ${tab.label.toLowerCase()}`)

  const update = useCallback(
    (changes: Record<string, string>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  // Typed text is local; it reaches the URL (and the API) after a short pause.
  // A new ?q= from elsewhere (the header search) replaces the typed text.
  const [text, setText] = useState(query)
  const [seenQuery, setSeenQuery] = useState(query)
  if (query !== seenQuery) {
    setSeenQuery(query)
    setText(query)
  }
  useEffect(() => {
    if (text.trim() === query) return
    const timer = setTimeout(() => update({ q: text.trim() }), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [text, query, update])

  // "Thử lại" after a failed load starts a new attempt of both requests below.
  const [attempt, setAttempt] = useState(0)

  // Every movie of the tab: genre options and the tab count.
  const [tabResult, setTabResult] = useState<{ status: string; list: MovieDetails[] } | null>(null)
  useEffect(() => {
    let alive = true
    listMovies({ status: tab.status })
      .then((list) => {
        if (alive) setTabResult({ status: tab.status, list: list as MovieDetails[] })
      })
      .catch(() => undefined) // the list request below reports the failure
    return () => {
      alive = false
    }
  }, [tab.status, attempt])
  const tabMovies = tabResult?.status === tab.status ? tabResult.list : null

  // The list itself, filtered by the API (listMovies: status, search, genre).
  // While a new search loads, the previous result of the same tab stays on screen.
  const [result, setResult] = useState<{ tab: Tab; attempt: number; list: MovieDetails[] | 'error' } | null>(null)
  useEffect(() => {
    let alive = true
    listMovies({ status: tab.status, search: query, genre: genre || undefined })
      .then((list) => {
        if (!alive) return
        const order = tab.id === 'coming-soon' ? bySoonestRelease : byNewestRelease
        setResult({ tab: tab.id, attempt, list: (list as MovieDetails[]).slice().sort(order) })
      })
      .catch(() => alive && setResult({ tab: tab.id, attempt, list: 'error' }))
    return () => {
      alive = false
    }
  }, [tab.status, tab.id, query, genre, attempt])
  const shown = result?.tab === tab.id && result.attempt === attempt ? result.list : null
  const failed = shown === 'error'
  const movies = failed ? null : shown

  const genres = useMemo(
    () => [...new Set((tabMovies ?? []).flatMap((m) => m.genres))].sort((a, b) => a.localeCompare(b, 'vi')),
    [tabMovies],
  )
  const filtered = query !== '' || genre !== ''
  const searchId = useId()
  const genreId = useId()

  return (
    <div className="mx-auto w-full max-w-content px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="display-wide text-step-4 font-extrabold sm:text-step-5">Phim</h1>

      <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-5">
        {/* Two views of one list; links so each tab has its own URL. */}
        <nav aria-label="Trạng thái phim" className="flex rounded-control border border-seat-line p-1">
          {TABS.map((t) => {
            const current = t.id === tab.id
            const to = new URLSearchParams(params)
            if (t.id === 'now-showing') to.delete('status')
            else to.set('status', t.id)
            to.delete('genre') // genres differ between the two tabs
            return (
              <Link
                key={t.id}
                to={{ search: to.toString() }}
                replace
                aria-current={current ? 'page' : undefined}
                className={`rounded-[6px] px-4 py-2 font-semibold transition-colors duration-150 ${
                  current ? 'bg-lamp text-house' : 'text-dust hover:text-screen'
                }`}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>

        <form role="search" onSubmit={(e) => e.preventDefault()} className="flex flex-1 flex-wrap items-end gap-4">
          <div className="min-w-56 flex-1 sm:max-w-80">
            <label htmlFor={searchId} className="block text-caption text-dust">
              Tên phim
            </label>
            <input
              id={searchId}
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ví dụ: Godzilla"
              autoComplete="off"
              maxLength={200} // listMovies `search` maxLength (openapi)
              className="mt-1 h-11 w-full rounded-control border border-seat-line bg-wall px-3 text-screen placeholder:text-dust"
            />
          </div>
          <div className="min-w-44">
            <label htmlFor={genreId} className="block text-caption text-dust">
              Thể loại
            </label>
            <select
              id={genreId}
              value={genre}
              onChange={(e) => update({ genre: e.target.value })}
              className="mt-1 h-11 w-full rounded-control border border-seat-line bg-wall px-3 text-screen"
            >
              <option value="">Tất cả thể loại</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>

      <section aria-labelledby="result-h" aria-busy={shown === null || undefined} className="mt-10">
        <h2 id="result-h" aria-live="polite" className="text-dust">
          {failed
            ? 'Không tải được danh sách phim'
            : movies === null
            ? 'Đang tải danh sách phim…'
            : filtered
              ? `${movies.length} phim ${tab.label.toLowerCase()} khớp bộ lọc`
              : `${movies.length} phim ${tab.label.toLowerCase()}`}
        </h2>

        {failed ? (
          <LoadError onRetry={() => setAttempt((n) => n + 1)} />
        ) : movies === null ? (
          <GridSkeleton />
        ) : movies.length === 0 ? (
          <EmptyResult
            query={query}
            genre={genre}
            tabLabel={tab.label.toLowerCase()}
            onClear={() => {
              setText('')
              update({ q: '', genre: '' })
            }}
          />
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {movies.map((movie) => (
              <li key={movie.id}>
                <PosterTile movie={movie} comingSoon={tab.id === 'coming-soon'} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/** UC01 alt 1.2.2.1: say what was searched, offer to clear the filters (brief §6). */
function EmptyResult({
  query,
  genre,
  tabLabel,
  onClear,
}: {
  query: string
  genre: string
  tabLabel: string
  onClear: () => void
}) {
  const parts = [query && `có tên chứa “${query}”`, genre && `thuộc thể loại ${genre}`].filter(Boolean).join(' và ')
  return (
    <div className="mt-6 max-w-prose rounded-panel border border-aisle bg-wall p-6">
      {/* A pasted link has no spaces: let it break anywhere rather than widen the page. */}
      <p className="text-step-1 font-semibold [overflow-wrap:anywhere]">
        {parts ? `Không tìm thấy phim ${tabLabel} nào ${parts}.` : `Hiện chưa có phim ${tabLabel}.`}
      </p>
      {parts ? (
        <>
          <p className="mt-2 text-dust">Thử từ khoá ngắn hơn hoặc chọn thể loại khác.</p>
          <button
            type="button"
            onClick={onClear}
            className="mt-5 rounded-control bg-lamp px-5 py-3 font-semibold text-house transition-transform duration-150 ease-(--ease-enter) active:scale-[.985]"
          >
            Xoá bộ lọc
          </button>
        </>
      ) : (
        <Link to="/" className="mt-4 inline-block text-screen underline decoration-lamp underline-offset-4">
          Về trang chủ
        </Link>
      )}
    </div>
  )
}

/** listMovies failed (brief §6): what happened, what to do; the tabs and filters stay usable. */
function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="mt-6 max-w-prose rounded-panel border border-aisle bg-wall p-6">
      <p className="text-step-1 font-semibold">Máy chủ của rạp chưa phản hồi.</p>
      <p className="mt-2 text-pretty text-dust">Bộ lọc của bạn vẫn được giữ. Kiểm tra kết nối mạng rồi thử lại.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-control bg-lamp px-5 py-3 font-semibold text-house transition-transform duration-150 ease-(--ease-enter) active:scale-[.985]"
      >
        Thử lại
      </button>
    </div>
  )
}

function GridSkeleton() {
  return (
    <div aria-hidden="true" className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i}>
          <div className="aspect-[2/3] rounded-poster bg-wall" />
          <div className="mt-3 h-5 w-3/4 rounded-sm bg-wall" />
          <div className="mt-2 h-4 w-1/2 rounded-sm bg-wall" />
        </div>
      ))}
    </div>
  )
}
