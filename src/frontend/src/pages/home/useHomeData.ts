import { useCallback, useEffect, useState } from 'react'
import type { MovieDetails, Showtime } from '../../types/api'
import { listMovies, listShowtimes, mockNow } from '../../mocks/mockApi'
import { dateKey } from '../../lib/format'
import { byNewestRelease, bySoonestRelease } from '../../lib/movieOrder'

export interface MovieOfDay {
  movie: MovieDetails
  /** This movie's remaining showtimes on `HomeData.day`. */
  showtimes: Showtime[]
}

export interface HomeData {
  /**
   * Hero (D25): every NOW_SHOWING movie with a showtime still to come today.
   * When today has none left, the nearest day that has some.
   */
  showing: MovieOfDay[]
  /** Vietnam calendar day of `showing`, "YYYY-MM-DD"; null when nothing is scheduled. */
  day: string | null
  isToday: boolean
  nowShowing: MovieDetails[]
  comingSoon: MovieDetails[]
}

/** Movies on the first day that still has showtimes; newest release first, then earliest showtime. */
function moviesOfDay(nowShowing: MovieDetails[], upcoming: Showtime[]): { day: string | null; showing: MovieOfDay[] } {
  if (upcoming.length === 0) return { day: null, showing: [] }
  const day = dateKey(upcoming[0].startsAt) // upcoming is sorted by start time
  const showing = nowShowing
    .map((movie) => ({
      movie,
      showtimes: upcoming.filter((s) => s.movieId === movie.id && dateKey(s.startsAt) === day),
    }))
    .filter((m) => m.showtimes.length > 0)
    .sort(
      (a, b) =>
        (b.movie.releaseDate ?? '').localeCompare(a.movie.releaseDate ?? '') ||
        a.showtimes[0].startsAt.localeCompare(b.showtimes[0].startsAt),
    )
  return { day, showing }
}

export type HomeState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: HomeData }

/**
 * Data for screen 0 (Home, UC01): listMovies + listShowtimes only.
 * Returns the state and a retry; a failed load is shown, never left loading.
 */
export function useHomeData(): [HomeState, () => void] {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ attempt: number; state: HomeState } | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([listMovies({ status: 'NOW_SHOWING' }), listMovies({ status: 'COMING_SOON' }), listShowtimes()])
      .then(([now, soon, upcoming]) => {
        if (!alive) return
        const nowShowing = (now as MovieDetails[]).slice().sort(byNewestRelease)
        const comingSoon = (soon as MovieDetails[]).slice().sort(bySoonestRelease)
        const { day, showing } = moviesOfDay(nowShowing, upcoming)
        const data = { showing, day, isToday: day === dateKey(mockNow()), nowShowing, comingSoon }
        setResult({ attempt, state: { status: 'ready', data } })
      })
      .catch(() => alive && setResult({ attempt, state: { status: 'error' } }))
    return () => {
      alive = false
    }
  }, [attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  // A new attempt shows the loading state until its own result arrives.
  return [result?.attempt === attempt ? result.state : { status: 'loading' }, retry]
}
