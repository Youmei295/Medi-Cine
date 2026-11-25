// Shared movie orderings, so Home and the catalogue list movies the same way.
import type { MovieDetails } from '../types/api'

/** Now showing: newest release first, then title (Vietnamese collation). */
export const byNewestRelease = (a: MovieDetails, b: MovieDetails) =>
  (b.releaseDate ?? '').localeCompare(a.releaseDate ?? '') || a.title.localeCompare(b.title, 'vi')

/** Coming soon: soonest release first, then title. */
export const bySoonestRelease = (a: MovieDetails, b: MovieDetails) =>
  (a.releaseDate ?? '').localeCompare(b.releaseDate ?? '') || a.title.localeCompare(b.title, 'vi')
