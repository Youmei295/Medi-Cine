import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import AgeBadge from '../components/movie/AgeBadge'
import MovieRail from '../components/movie/MovieRail'
import PosterTile from '../components/movie/PosterTile'
import { formatDuration, formatReleaseDate, formatTime, formatWeekdayDay } from '../lib/format'
import { useHomeData, type HomeData, type MovieOfDay } from './home/useHomeData'
import { usePageTitle } from '../lib/pageTitle'

/*
 * Screen 0 — Home (UC01). Taste Skill variant chosen in Phase 2b (D25), bound to
 * the brief's tokens (D20), with the user's changes:
 *   - hero = the movies showing today; the customer picks one from the list
 *     (manual only, no auto-rotation: brief §8)
 *   - now showing / coming soon = poster rails, 5 per view, < > buttons
 * The hero alone fills the first screen and enters once per page load.
 * Switching movies uses a short version (approved exception to brief §8, Phase 7):
 * the still crossfades in 250 ms, the text fades up 6 px in 200 ms; no title rise.
 */

// The entrance plays once per page load, not on every return to Home.
let heroHasEntered = false

const WRAP = 'mx-auto w-full max-w-content px-4 sm:px-6'
const HERO_HEIGHT = 'min-h-[calc(100svh-4.5rem-1px)]'

export default function HomePage() {
  const [state, retry] = useHomeData()
  usePageTitle(state.status === 'error' ? 'Không tải được lịch chiếu' : 'Đặt vé xem phim')
  const data = state.status === 'ready' ? state.data : null
  const [enter] = useState(() => !heroHasEntered)
  useEffect(() => {
    if (data) heroHasEntered = true
  }, [data])

  if (state.status === 'error') return <LoadError onRetry={retry} />

  return (
    <>
      {data ? <TodayHero data={data} enter={enter} /> : <HeroSkeleton />}

      <div className={`${WRAP} space-y-16 py-16 sm:space-y-24 sm:py-24`}>
        {data ? (
          <>
            <MovieRail
              id="now-h"
              title="Phim đang chiếu"
              more={{ to: '/movies', label: `Xem tất cả ${data.nowShowing.length} phim` }}
              count={data.nowShowing.length}
              empty="Hiện chưa có phim đang chiếu."
            >
              {data.nowShowing.map((movie) => (
                <li key={movie.id}>
                  <PosterTile movie={movie} />
                </li>
              ))}
            </MovieRail>
            <MovieRail id="soon-h" title="Phim sắp chiếu" count={data.comingSoon.length} empty="Chưa có phim sắp chiếu.">
              {data.comingSoon.map((movie) => (
                <li key={movie.id}>
                  <PosterTile movie={movie} comingSoon />
                </li>
              ))}
            </MovieRail>
          </>
        ) : (
          <RailSkeleton />
        )}
      </div>
    </>
  )
}

/** One backdrop layer; a new one fades in over the previous until it has landed. */
interface Layer {
  key: number
  url: string | null
}

function TodayHero({ data, enter }: { data: HomeData; enter: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { showing, isToday } = data
  // swap = number of movie switches so far; 0 means the page-load entrance still owns the hero.
  const [swap, setSwap] = useState(0)
  const [layers, setLayers] = useState<Layer[]>(() => [{ key: 0, url: showing[0]?.movie.backdropUrl ?? null }])
  const latestPick = useRef(0)

  // Warm the cache with today's stills so a switch rarely waits on the network.
  useEffect(() => {
    for (const { movie } of showing) {
      if (movie.backdropUrl) new Image().src = movie.backdropUrl
    }
  }, [showing])

  if (showing.length === 0) {
    return (
      <section aria-labelledby="hero-h" className={`${HERO_HEIGHT} flex items-center`}>
        <div className={WRAP}>
          <h1 id="hero-h" className="display-wide text-step-4 font-extrabold sm:text-step-6">
            Chưa có suất chiếu mới
          </h1>
          <p className="mt-4 max-w-prose text-dust">Các suất chiếu sắp tới sẽ hiện ở đây ngay khi rạp mở bán.</p>
          <Link to="/movies" className="mt-8 inline-block text-screen underline decoration-lamp underline-offset-4">
            Xem tất cả phim
          </Link>
        </div>
      </section>
    )
  }

  const current = showing.find((m) => m.movie.id === selectedId) ?? showing[0]
  const { movie, showtimes } = current
  const dayLabel = isToday ? 'hôm nay' : formatWeekdayDay(showtimes[0].startsAt)

  // Entrance classes and delays apply only on the first visit (see heroHasEntered)
  // and never again after the first switch.
  const first = enter && swap === 0
  const on = (cls: string) => (first ? cls : '')
  const after = (ms: number) => (first ? { animationDelay: `${ms}ms` } : undefined)

  // Switch only once the new still is decoded, so it never fades in over an empty frame.
  // A newer pick made while waiting wins; the older one is dropped.
  async function pick(id: string) {
    if (id === movie.id) return
    const ticket = ++latestPick.current
    const url = showing.find((m) => m.movie.id === id)?.movie.backdropUrl ?? null
    if (url) {
      const img = new Image()
      img.src = url
      await img.decode().catch(() => undefined)
    }
    if (ticket !== latestPick.current) return
    setSelectedId(id)
    setSwap((n) => n + 1)
    setLayers((prev) => [...prev, { key: ticket, url }])
  }
  // When the top layer has landed, the ones under it are hidden: drop them.
  const landed = (key: number) => setLayers((prev) => (prev[prev.length - 1]?.key === key ? prev.slice(-1) : prev))

  return (
    <section aria-labelledby="hero-h" className={`relative isolate flex overflow-hidden ${HERO_HEIGHT}`}>
      {/* House lights: the selected movie's still (1600 px source), dimmed (brief §2).
          Layers stack in pick order; each new one crossfades in over the last. */}
      {layers.map((layer) =>
        layer.url ? (
          <img
            key={layer.key}
            src={layer.url}
            alt=""
            width={1600}
            height={840}
            onAnimationEnd={() => landed(layer.key)}
            className={`absolute inset-0 -z-20 size-full object-cover ${layer.key === 0 ? on('animate-enter-settle') : 'animate-backdrop-in'}`}
          />
        ) : (
          // A movie without a still: the plain house colour fades in instead.
          <div key={layer.key} onAnimationEnd={() => landed(layer.key)} className={`absolute inset-0 -z-20 bg-house ${layer.key === 0 ? '' : 'animate-backdrop-in'}`} />
        ),
      )}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-house via-house/85 to-house/35" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-house via-transparent to-transparent" />

      <div className={`${WRAP} grid grid-cols-[minmax(0,1fr)] content-end gap-10 pb-12 pt-24 sm:pb-16 lg:grid-cols-12 lg:items-end`}>
        <div className="lg:col-span-8">
          <p className={`text-dust ${on('animate-enter-fade')}`}>
            {isToday ? 'Chiếu hôm nay tại MEDI-CINE' : `Chưa còn suất hôm nay. Suất gần nhất: ${dayLabel}`}
          </p>

          {/* Keyed per switch: the movie's text fades up once; the page-load entrance never replays. */}
          <div key={swap} className={swap > 0 ? 'animate-hero-swap' : undefined}>
            <div className="mt-3 overflow-hidden pb-1 pt-[0.2em]">
              <h1
                id="hero-h"
                className={`display-wide max-w-[18ch] text-step-4 font-extrabold sm:text-step-5 lg:text-step-6 ${on('animate-enter-rise')}`}
              >
                {movie.title}
              </h1>
            </div>

            <div
              style={after(380)}
              className={`mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-dust ${on('animate-enter-fade')}`}
            >
              <AgeBadge rating={movie.ageRating} />
              <span className="tabular">{formatDuration(movie.durationMinutes)}</span>
              <span>{movie.genres.join(', ')}</span>
              {movie.releaseDate && <span>Khởi chiếu {formatReleaseDate(movie.releaseDate)}</span>}
            </div>
            {movie.synopsis && (
              <p style={after(410)} className={`mt-4 line-clamp-2 max-w-prose text-screen ${on('animate-enter-fade')}`}>
                {movie.synopsis}
              </p>
            )}

            <div style={after(440)} className={`mt-8 ${on('animate-enter-fade')}`}>
              <h2 className="text-step-1 font-semibold">Suất chiếu {dayLabel}</h2>
              <ul className="mt-4 flex flex-wrap gap-3">
                {showtimes.map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/showtimes/${s.id}/seats`}
                      aria-label={`Chọn ghế suất ${formatTime(s.startsAt)}, ${formatWeekdayDay(s.startsAt)}, định dạng ${s.format}`}
                      className="flex min-w-28 flex-col rounded-control border border-seat-line bg-house/90 px-5 py-3 transition-[transform,border-color] duration-150 ease-(--ease-enter) hover:-translate-y-px hover:border-lamp active:translate-y-px active:scale-[.985]"
                    >
                      <span className="tabular text-step-2 font-bold leading-tight">{formatTime(s.startsAt)}</span>
                      <span className="text-caption text-dust">{s.format}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                to={`/movies/${movie.id}`}
                className="mt-6 inline-block text-screen underline decoration-seat-line underline-offset-4 hover:decoration-lamp"
              >
                Xem chi tiết phim và lịch chiếu các ngày
              </Link>
            </div>
          </div>
        </div>

        {showing.length > 1 && (
          <TodayPicker
            showing={showing}
            currentId={movie.id}
            dayLabel={dayLabel}
            onPick={(id) => void pick(id)}
            className={`lg:col-span-4 ${on('animate-enter-fade')}`}
            style={after(500)}
          />
        )}
      </div>
    </section>
  )
}

/** The list of today's movies; picking one swaps the hero. A column on desktop, a swipe row on phones. */
function TodayPicker({
  showing,
  currentId,
  dayLabel,
  onPick,
  className,
  style,
}: {
  showing: MovieOfDay[]
  currentId: string
  dayLabel: string
  onPick: (id: string) => void
  className: string
  style?: CSSProperties
}) {
  return (
    <div className={className} style={style}>
      <h2 id="today-h" className="font-semibold">
        Phim chiếu {dayLabel} ({showing.length})
      </h2>
      <ul
        aria-labelledby="today-h"
        className="relative -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:max-h-[24rem] lg:flex-col lg:overflow-y-auto lg:overflow-x-visible [&::-webkit-scrollbar]:hidden"
      >
        {showing.map(({ movie, showtimes }) => {
          const selected = movie.id === currentId
          return (
            <li key={movie.id} className="w-64 shrink-0 lg:w-auto">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onPick(movie.id)}
                className={`flex w-full items-center gap-3 rounded-control border p-2 text-left transition-colors duration-150 ${
                  selected ? 'border-seat-line bg-wall/95' : 'border-transparent bg-house/80 hover:border-seat-line'
                }`}
              >
                {/* Selected is shown by the box and a tick badge on the poster corner, not colour
                    alone. The badge takes no row width, so long titles keep one line. */}
                <span className="relative shrink-0">
                  <img
                    src={movie.posterUrl ?? undefined}
                    alt=""
                    width={40}
                    height={60}
                    loading="lazy"
                    className="h-15 w-10 rounded-poster bg-wall object-cover"
                  />
                  {selected && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-1.5 -bottom-1.5 grid size-5 place-items-center rounded-full bg-lamp text-house ring-2 ring-wall"
                    >
                      <svg viewBox="0 0 16 16" className="size-3.5">
                        <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 font-semibold">{movie.title}</span>
                  <span className="tabular block text-caption text-dust">
                    {showtimes.length} suất, sớm nhất {formatTime(showtimes[0].startsAt)}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** The schedule could not be loaded (brief §6): say so, offer a retry, never stay on the skeleton. */
function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <section aria-labelledby="hero-h" className={`${HERO_HEIGHT} flex items-center`}>
      <div role="alert" className={WRAP}>
        <h1 id="hero-h" className="display-wide text-step-4 font-extrabold sm:text-step-6">
          Không tải được lịch chiếu
        </h1>
        <p className="mt-4 max-w-prose text-pretty text-dust">
          Máy chủ của rạp chưa phản hồi nên chưa hiện được phim và suất chiếu. Kiểm tra kết nối mạng rồi thử lại.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-8 rounded-control bg-lamp px-5 py-3 font-semibold text-house transition-transform duration-150 ease-(--ease-enter) active:scale-[.985]"
        >
          Thử lại
        </button>
      </div>
    </section>
  )
}

function HeroSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải phim chiếu hôm nay" className={`${HERO_HEIGHT} flex bg-wall/40`}>
      <div className={`${WRAP} flex flex-col justify-end gap-4 pb-12 sm:pb-16`}>
        <div className="h-5 w-56 rounded-sm bg-wall" />
        <div className="h-14 w-2/3 rounded-sm bg-wall" />
        <div className="mt-6 flex gap-3">
          <div className="h-16 w-28 rounded-control bg-wall" />
          <div className="h-16 w-28 rounded-control bg-wall" />
        </div>
      </div>
    </section>
  )
}

function RailSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="h-10 w-72 rounded-sm bg-wall" />
      <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={i >= 2 ? 'hidden sm:block' : ''}>
            <div className="aspect-[2/3] rounded-poster bg-wall" />
            <div className="mt-3 h-5 w-3/4 rounded-sm bg-wall" />
          </div>
        ))}
      </div>
    </div>
  )
}
