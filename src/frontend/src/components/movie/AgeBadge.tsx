import { ageRatingMeaning, isKnownRating } from '../../lib/ageRating'

/**
 * Age rating badge (P, K, T13, T16, T18, or "Chưa phân loại"). Text in a
 * seat-line box, so it never relies on colour. The meaning is written out on
 * the details page (brief §4 screen 2); here it is spoken to screen readers.
 * `relative` keeps the sr-only text inside scroll rows (else it widens the page).
 */
export default function AgeBadge({ rating, className = '' }: { rating: string; className?: string }) {
  return (
    <span
      className={`tabular relative inline-flex items-center rounded-[4px] border border-seat-line px-1.5 text-caption font-semibold leading-5 text-screen ${className}`}
      title={ageRatingMeaning(rating)}
    >
      <span aria-hidden="true">{rating}</span>
      <span className="sr-only">
        {isKnownRating(rating) ? `Phân loại ${rating}. ` : ''}
        {ageRatingMeaning(rating)}.
      </span>
    </span>
  )
}
