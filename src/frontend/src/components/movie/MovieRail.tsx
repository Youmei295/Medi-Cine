import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'

interface Props {
  id: string
  title: string
  /** Optional "see all" link shown next to the heading. */
  more?: { to: string; label: string }
  children: ReactNode
  /** Number of items, for the empty message. */
  count: number
  empty: string
}

/**
 * One row of posters (D25): 5 per view at ≥ 1024 px, 4 at ≥ 768, 3 at ≥ 640,
 * a swipe row with a peek on phones. The < > buttons scroll by one view and
 * are disabled at either end, and hidden (space kept, no layout shift) when the
 * whole row fits; touch, trackpad and keyboard scrolling keep working.
 * No auto-scroll (brief §8).
 */
export default function MovieRail({ id, title, more, children, count, empty }: Props) {
  const listRef = useRef<HTMLUListElement>(null)
  const [edges, setEdges] = useState({ start: true, end: true })

  const measure = useCallback(() => {
    const el = listRef.current
    if (!el) return
    setEdges({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 })
  }, [])

  // Layout effect: measured before paint, so arrows never flash on a row that fits.
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    el.addEventListener('scroll', measure, { passive: true })
    return () => {
      observer.disconnect()
      el.removeEventListener('scroll', measure)
    }
  }, [measure, count])

  const page = (direction: 1 | -1) => {
    const el = listRef.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: direction * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' })
  }

  const arrow =
    'grid size-11 place-items-center rounded-control border border-seat-line text-screen transition-[transform,border-color] duration-150 ease-(--ease-enter) hover:border-lamp active:scale-95 disabled:cursor-not-allowed disabled:border-aisle disabled:text-seat-line disabled:hover:border-aisle'

  return (
    <section aria-labelledby={id}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h2 id={id} className="display-wide text-step-3 font-bold sm:text-step-4">
          {title}
        </h2>
        <div className="flex items-center gap-5">
          {more && (
            <Link
              to={more.to}
              className="text-dust underline decoration-seat-line underline-offset-4 hover:text-screen hover:decoration-lamp"
            >
              {more.label}
            </Link>
          )}
          <div className={`hidden gap-2 sm:flex ${edges.start && edges.end ? 'invisible' : ''}`}>
            <button type="button" className={arrow} onClick={() => page(-1)} disabled={edges.start} aria-controls={`${id}-list`} aria-label={`${title}: xem các phim trước`}>
              <Chevron flip />
            </button>
            <button type="button" className={arrow} onClick={() => page(1)} disabled={edges.end} aria-controls={`${id}-list`} aria-label={`${title}: xem các phim tiếp theo`}>
              <Chevron />
            </button>
          </div>
        </div>
      </div>

      {count === 0 ? (
        <p className="mt-6 text-dust">{empty}</p>
      ) : (
        <ul
          id={`${id}-list`}
          ref={listRef}
          className="relative -mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 py-2 [scrollbar-width:none] sm:-mx-2 sm:scroll-px-2 sm:gap-6 sm:px-2 [&::-webkit-scrollbar]:hidden [&>li]:shrink-0 [&>li]:snap-start [&>li]:basis-[42%] sm:[&>li]:basis-[calc((100%-3rem)/3)] md:[&>li]:basis-[calc((100%-4.5rem)/4)] lg:[&>li]:basis-[calc((100%-6rem)/5)]"
        >
          {children}
        </ul>
      )}
    </section>
  )
}

function Chevron({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={`size-5 ${flip ? 'rotate-180' : ''}`}>
      <path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
