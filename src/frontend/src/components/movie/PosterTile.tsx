import { Link } from 'react-router'
import type { MovieDetails } from '../../types/api'
import { formatDuration, formatReleaseDate } from '../../lib/format'
import AgeBadge from './AgeBadge'
import MoviePoster from './MoviePoster'

/**
 * Poster tile (brief §4 screens 0–1): the poster is the tile, no card box.
 * Hover: poster zooms 1.03 inside its frame, 2 px amber ring, tile lifts 2 px.
 * Now showing shows duration; coming soon shows the release date instead.
 */
export default function PosterTile({ movie, comingSoon = false }: { movie: MovieDetails; comingSoon?: boolean }) {
  return (
    <Link
      to={`/movies/${movie.id}`}
      className="group block rounded-poster outline-offset-2 transition-transform duration-[180ms] ease-out hover:-translate-y-0.5"
    >
      <MoviePoster title={movie.title} src={movie.posterUrl} className="ring-lamp group-hover:ring-2" />
      <h3 title={movie.title} className="mt-3 line-clamp-2 font-semibold leading-snug [text-wrap:balance] sm:text-step-1">
        {movie.title}
      </h3>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-dust">
        <AgeBadge rating={movie.ageRating} />
        {comingSoon ? (
          <span className="tabular text-screen">
            Khởi chiếu {movie.releaseDate ? formatReleaseDate(movie.releaseDate) : 'chưa công bố'}
          </span>
        ) : (
          <span className="tabular">{formatDuration(movie.durationMinutes)}</span>
        )}
      </div>
      <p className="mt-1 line-clamp-1 text-caption text-dust" title={movie.genres.join(', ')}>
        {movie.genres.join(', ')}
      </p>
    </Link>
  )
}
