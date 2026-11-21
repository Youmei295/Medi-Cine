import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import type { MovieDetails, ScreenFormat } from '../types/api'
import { mockNow } from '../mocks/mockApi'
import { dateKey, formatDuration, formatReleaseDate, formatTime, formatWeekdayDay } from '../lib/format'
import { ageRatingMeaning, isKnownRating } from '../lib/ageRating'
import AgeBadge from '../components/movie/AgeBadge'
import MoviePoster from '../components/movie/MoviePoster'
import { useMovieDetail, type ShowtimeOption } from './movie-detail/useMovieDetail'
import { usePageTitle } from '../lib/pageTitle'

/*
 * Screen 2 — Movie details + showtimes (UC01, brief §4 screen 2).
 * Top: the movie's still behind a house scrim ("house lights"), poster, title,
 * facts, the age rating written out, synopsis. Below: showtimes by date
 * (?date=YYYY-MM-DD) then format; a time chip opens seat selection (UC02).
 */

const WRAP = 'mx-auto w-full max-w-content px-4 sm:px-6'
const FORMAT_ORDER: ScreenFormat[] = ['2D', '3D', 'IMAX']
/** One-line explanation next to each format (brief §4 screen 2, Alamo pattern §13). */
const FORMAT_NOTE: Record<ScreenFormat, string> = {
  '2D': 'Hình ảnh phẳng, xem không cần kính.',
  '3D': 'Hình ảnh nổi, xem bằng kính 3D.',
  IMAX: 'Màn hình khổ lớn và âm thanh IMAX.',
}

export default function MovieDetailPage() {
  const { movieId = '' } = useParams()
  const [state, retry] = useMovieDetail(movieId)
  usePageTitle(
    state.status === 'ready'
      ? state.movie.title
      : state.status === 'error'
        ? state.notFound
          ? 'Không tìm thấy phim'
          : 'Không tải được thông tin phim'
        : null,
  )

  if (state.status === 'loading') return <DetailSkeleton />
  if (state.status === 'error') return <LoadError notFound={state.notFound} onRetry={retry} />

  const { movie, showtimes } = state
  return (
    <div className="relative isolate">
      <MovieHeader movie={movie} />
      <Showtimes movie={movie} options={showtimes} />
    </div>
  )
}

function MovieHeader({ movie }: { movie: MovieDetails }) {
  return (
    <section aria-labelledby="movie-h" className="relative">
      {/* House lights (brief §2): the still, dimmed by three house scrims. */}
      {movie.backdropUrl && (
        <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-[30rem] overflow-hidden sm:h-[36rem]">
          <img src={movie.backdropUrl} alt="" width={1600} height={840} className="size-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-r from-house via-house/80 to-house/30" />
          <div className="absolute inset-0 bg-linear-to-t from-house via-house/60 to-house/20" />
          {/* Many stills carry the title art and festival logos in their top part;
              a third scrim from the top sinks them so they do not compete with the page title. */}
          <div className="absolute inset-x-0 top-0 h-3/5 bg-linear-to-b from-house/90 via-house/50 to-transparent" />
        </div>
      )}

      <div className={`${WRAP} grid grid-cols-[minmax(0,1fr)] gap-8 pb-4 pt-12 sm:pt-24 md:grid-cols-[13rem_minmax(0,1fr)] md:items-end lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12`}>
        <MoviePoster title={movie.title} src={movie.posterUrl} eager className="w-36 border border-aisle sm:w-44 md:w-full" />

        <div className="min-w-0">
          <h1 id="movie-h" className="display-wide text-step-4 font-extrabold sm:text-step-5 lg:text-step-6">
            {movie.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-dust">
            <AgeBadge rating={movie.ageRating} />
            <span className="tabular">{formatDuration(movie.durationMinutes)}</span>
            <span>{movie.genres.join(', ')}</span>
            {movie.releaseDate && (
              <span className="tabular">Khởi chiếu {formatReleaseDate(movie.releaseDate)}</span>
            )}
          </div>

          {/* Written out, not a tooltip: tooltips do not work on touch (brief §4 screen 2). */}
          <p className="mt-3 text-caption text-dust">
            {isKnownRating(movie.ageRating) && <span className="font-semibold text-screen">{movie.ageRating}: </span>}
            {ageRatingMeaning(movie.ageRating)}.
          </p>

          {movie.synopsis && <p className="mt-5 max-w-prose text-pretty text-screen">{movie.synopsis}</p>}

          <p className="mt-5 text-dust">
            Định dạng: <span className="text-screen">{movie.supportedFormats.join(', ')}</span>
          </p>

          {movie.trailerUrl && (
            <a
              href={movie.trailerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-block text-screen underline decoration-seat-line underline-offset-4 hover:decoration-lamp"
            >
              Xem trailer (mở trang mới)
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

function Showtimes({ movie, options }: { movie: MovieDetails; options: ShowtimeOption[] }) {
  const [params, setParams] = useSearchParams()

  // Days that still have showtimes, in order (listShowtimes is sorted by start time).
  const days = useMemo(() => {
    const map = new Map<string, ShowtimeOption[]>()
    options.forEach((o) => {
      const key = dateKey(o.showtime.startsAt)
      map.set(key, [...(map.get(key) ?? []), o])
    })
    return [...map.entries()].map(([key, list]) => ({ key, list }))
  }, [options])

  const today = dateKey(mockNow())
  const current = days.find((d) => d.key === params.get('date')) ?? days[0]

  return (
    <section aria-labelledby="showtimes-h" className={`${WRAP} pb-24 pt-14 sm:pt-20`}>
      <h2 id="showtimes-h" className="display-wide text-step-3 font-bold sm:text-step-4">
        Lịch chiếu
      </h2>

      {days.length === 0 ? (
        <NoShowtimes movie={movie} />
      ) : (
        <>
          {/* Date strip: the first day is "Hôm nay" when it is today (brief §4 screen 2). */}
          <ul
            aria-label="Chọn ngày chiếu"
            className="relative -mx-4 mt-6 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
          >
            {days.map((d) => {
              const selected = d.key === current.key
              // "Thứ Bảy, 21/11" -> weekday + day/month on two lines
              const [weekday, dayMonth = ''] = formatWeekdayDay(d.list[0].showtime.startsAt).split(', ')
              return (
                <li key={d.key} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setParams(
                        (prev) => {
                          const next = new URLSearchParams(prev)
                          next.set('date', d.key)
                          return next
                        },
                        { replace: true, preventScrollReset: true },
                      )
                    }
                    className={`flex min-w-28 flex-col items-start rounded-control border px-4 py-2.5 text-left transition-colors duration-150 ${
                      selected ? 'border-lamp bg-lamp text-house' : 'border-seat-line text-screen hover:border-lamp'
                    }`}
                  >
                    <span className="font-semibold">{d.key === today ? 'Hôm nay' : weekday}</span>
                    <span className={`tabular text-caption ${selected ? 'text-house' : 'text-dust'}`}>
                      {dayMonth}, {d.list.length} suất
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <DayShowtimes key={current.key} list={current.list} dayLabel={current.key === today ? 'hôm nay' : formatWeekdayDay(current.list[0].showtime.startsAt)} />

          <p className="mt-10 max-w-prose text-pretty text-caption text-dust">
            Giá vé tuỳ loại ghế và ngày chiếu, hiện ở bước chọn ghế. Suất đã bắt đầu không còn trong danh sách.
          </p>
        </>
      )}
    </section>
  )
}

/** One day's showtimes, one row per format: format + explanation, then the time chips. */
function DayShowtimes({ list, dayLabel }: { list: ShowtimeOption[]; dayLabel: string }) {
  const formats = FORMAT_ORDER.filter((f) => list.some((o) => o.showtime.format === f))
  return (
    // Remounted per day (keyed by the caller): the whole list swaps in once, no per-chip stagger.
    <div className="mt-8 animate-list-in divide-y divide-aisle border-y border-aisle">
      {formats.map((format) => (
        <div key={format} className="grid gap-4 py-6 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-8">
          <div>
            <h3 className="text-step-1 font-semibold">{format}</h3>
            <p className="mt-1 text-caption text-dust">{FORMAT_NOTE[format]}</p>
          </div>
          <ul className="flex flex-wrap gap-3">
            {list
              .filter((o) => o.showtime.format === format)
              .map((o) => (
                <li key={o.showtime.id}>
                  <TimeChip option={o} dayLabel={dayLabel} />
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function TimeChip({ option, dayLabel }: { option: ShowtimeOption; dayLabel: string }) {
  const { showtime, roomName, soldOut } = option
  const time = formatTime(showtime.startsAt)

  // Sold out: not a link, and says so in words (not colour alone, brief §4 screen 2).
  if (soldOut)
    return (
      <p className="flex min-w-32 flex-col rounded-control border border-dashed border-seat-line px-5 py-3 text-dust">
        <span className="tabular text-step-2 font-bold leading-tight line-through decoration-1">{time}</span>
        <span className="text-caption">
          {roomName}, <span className="font-semibold text-screen">Hết vé</span>
        </span>
      </p>
    )

  return (
    <Link
      to={`/showtimes/${showtime.id}/seats`}
      aria-label={`Chọn ghế suất ${time} ${dayLabel}, ${showtime.format}, ${roomName}`}
      className="flex min-w-32 flex-col rounded-control border border-seat-line bg-house px-5 py-3 transition-[transform,border-color] duration-150 ease-(--ease-enter) hover:-translate-y-px hover:border-lamp active:translate-y-px active:scale-[.985]"
    >
      <span className="tabular text-step-2 font-bold leading-tight">{time}</span>
      <span className="text-caption text-dust">{roomName}</span>
    </Link>
  )
}

/** UC01 alt 1.2.2.2 (brief §6); coming-soon movies say when they open instead. */
function NoShowtimes({ movie }: { movie: MovieDetails }) {
  const soon = movie.status === 'COMING_SOON'
  return (
    <div className="mt-6 max-w-prose rounded-panel border border-aisle bg-wall p-6">
      <p className="text-step-1 font-semibold">
        {soon && movie.releaseDate
          ? `Phim khởi chiếu ngày ${formatReleaseDate(movie.releaseDate)}`
          : 'Phim chưa có suất chiếu'}
      </p>
      <p className="mt-2 text-dust">
        {soon ? 'Lịch chiếu sẽ hiện ở đây khi rạp mở bán vé.' : 'Các suất mới sẽ hiện ở đây khi rạp xếp lịch.'}
      </p>
      <Link to="/movies" className="mt-5 inline-block text-screen underline decoration-lamp underline-offset-4">
        Xem các phim đang chiếu
      </Link>
    </div>
  )
}

/** UC01 alt 1.2.2.3: details cannot be loaded → retry or back (brief §6). */
function LoadError({ notFound, onRetry }: { notFound: boolean; onRetry: () => void }) {
  return (
    <div className={`${WRAP} py-20`}>
      <div role="alert" className="max-w-prose rounded-panel border border-aisle bg-wall p-6">
        <h1 className="text-step-2 font-semibold">
          {notFound ? 'Không tìm thấy phim này' : 'Không tải được thông tin phim'}
        </h1>
        <p className="mt-2 text-dust">
          {notFound
            ? 'Phim có thể đã ngừng chiếu hoặc đường dẫn bị sai.'
            : 'Kiểm tra kết nối mạng rồi thử lại, hoặc chọn phim khác trong danh sách.'}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-5">
          {!notFound && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-control bg-lamp px-5 py-3 font-semibold text-house transition-transform duration-150 ease-(--ease-enter) active:scale-[.985]"
            >
              Thử lại
            </button>
          )}
          <Link to="/movies" className="text-screen underline decoration-seat-line underline-offset-4 hover:decoration-lamp">
            Về danh sách phim
          </Link>
        </div>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải thông tin phim" className={`${WRAP} pt-12 sm:pt-24`}>
      <div className="grid gap-8 md:grid-cols-[13rem_minmax(0,1fr)] md:items-end lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
        <div className="aspect-[2/3] w-36 rounded-poster bg-wall sm:w-44 md:w-full" />
        <div className="space-y-4">
          <div className="h-14 w-3/4 rounded-sm bg-wall" />
          <div className="h-5 w-1/2 rounded-sm bg-wall" />
          <div className="h-20 max-w-prose rounded-sm bg-wall" />
        </div>
      </div>
      <div className="mt-20 h-10 w-48 rounded-sm bg-wall" />
      <div className="mt-6 flex gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-16 w-28 rounded-control bg-wall" />
        ))}
      </div>
    </div>
  )
}
