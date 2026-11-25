import { useEffect, useState } from 'react'
import type { MovieDetails, Showtime } from '../../types/api'
import { ApiRequestError, getMovie, getSeatMap, getShowtime, listShowtimes } from '../../mocks/mockApi'

export interface ShowtimeOption {
  showtime: Showtime
  roomName: string
  /** No seat left AVAILABLE (UC02 alt 2.2.2.3); the chip is shown disabled with "Hết vé". */
  soldOut: boolean
}

export type MovieDetailState =
  | { status: 'loading' }
  | { status: 'error'; notFound: boolean }
  | { status: 'ready'; movie: MovieDetails; showtimes: ShowtimeOption[] }

/**
 * Data for screen 2 (UC01): getMovie + listShowtimes({ movieId }).
 * The contract's Showtime carries neither the room name nor seat availability,
 * so each showtime also reads getShowtime (room) and getSeatMap (sold out).
 * A real backend should return both in listShowtimes (see the Phase 3 report).
 */
export function useMovieDetail(movieId: string): [MovieDetailState, () => void] {
  const [attempt, setAttempt] = useState(0)
  // Each result is tagged with the load it answers; an older one reads as loading.
  const key = `${movieId}#${attempt}`
  const [result, setResult] = useState<{ key: string; state: MovieDetailState } | null>(null)

  useEffect(() => {
    let alive = true
    const setState = (state: MovieDetailState) => setResult({ key, state })
    Promise.all([getMovie(movieId), listShowtimes({ movieId })])
      .then(async ([movie, showtimes]) => {
        const options = await Promise.all(
          showtimes.map(async (showtime) => {
            const [context, map] = await Promise.all([getShowtime(showtime.id), getSeatMap(showtime.id)])
            return {
              showtime,
              roomName: context.room.name,
              soldOut: !map.seats.some((s) => s.state === 'AVAILABLE'),
            }
          }),
        )
        if (alive) setState({ status: 'ready', movie, showtimes: options })
      })
      .catch((error: unknown) => {
        if (alive)
          setState({ status: 'error', notFound: error instanceof ApiRequestError && error.status === 404 })
      })
    return () => {
      alive = false
    }
  }, [movieId, key])

  const state: MovieDetailState = result?.key === key ? result.state : { status: 'loading' }
  return [state, () => setAttempt((n) => n + 1)]
}
