import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { Id, SeatMap as SeatMapData, SeatView } from '../../types/api'
import SeatGlyph, { SeatDefs } from './SeatGlyph'
import { seatAriaLabel, seatSpan, visualState } from './seatVisual'

const ROW_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** Seat size per zoom level on phones (min 28 px target, brief §5); desktop is always 32 px. */
const ZOOM_CLASSES = [
  '[--seat:1.75rem] md:[--seat:2rem]',
  '[--seat:2.25rem] md:[--seat:2rem]',
  '[--seat:2.75rem] md:[--seat:2rem]',
] as const

interface Props {
  seatMap: SeatMapData
  selectedIds: ReadonlySet<Id>
  /** Seats inside the customer's own active hold. */
  mineIds: ReadonlySet<Id>
  /** When true (hold active or sold out) seats cannot be toggled. */
  locked: boolean
  onToggle: (seat: SeatView) => void
  /** Seats just taken by another customer (UC02 alt 2.2.2.2): each plays one
   *  short pulse. A new `key` replays it for the next conflict. */
  taken?: { ids: ReadonlySet<Id>; key: number } | null
}

/**
 * The signature element (brief §2): the screen as a silver arc, an amber
 * projector beam falling over the rows, and selected seats lit by that amber.
 * Keyboard: arrow keys move between seats (roving tabindex), Space/Enter toggles.
 */
export default function SeatMap({ seatMap, selectedIds, mineIds, locked, onToggle, taken }: Props) {
  const seats = seatMap.seats
  const navigable = useMemo(() => seats.filter((s) => s.operationalStatus === 'ACTIVE'), [seats])
  const [focusId, setFocusId] = useState<Id | null>(null)
  const [zoom, setZoom] = useState(0)
  const buttons = useRef(new Map<Id, HTMLButtonElement>())

  // Seats hidden past either edge of the scroll frame (phones, or zoomed in):
  // shown as a fade on that side plus a one-line hint (Phase 5, P2).
  const scroller = useRef<HTMLDivElement>(null)
  const [hidden, setHidden] = useState({ left: false, right: false })
  const measure = useCallback(() => {
    const el = scroller.current
    if (!el) return
    const left = el.scrollLeft > 4
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
    setHidden((h) => (h.left === left && h.right === right ? h : { left, right }))
  }, [])
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const observer = new ResizeObserver(measure) // also runs once on observe
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [measure])

  const activeId = focusId ?? navigable.find((s) => s.state === 'AVAILABLE')?.seatId ?? navigable[0]?.seatId

  function move(from: SeatView, key: string) {
    let candidates: SeatView[] = []
    if (key === 'ArrowLeft') candidates = navigable.filter((s) => s.row === from.row && s.number < from.number)
    if (key === 'ArrowRight') candidates = navigable.filter((s) => s.row === from.row && s.number > from.number)
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      const rows = [...new Set(navigable.map((s) => s.row))].sort((a, b) => a - b)
      const i = rows.indexOf(from.row) + (key === 'ArrowUp' ? -1 : 1)
      if (i >= 0 && i < rows.length) candidates = navigable.filter((s) => s.row === rows[i])
    }
    if (candidates.length === 0) return
    // Compare seat centres, so a couple seat (two columns wide) lines up with the seats above it.
    const centre = (s: SeatView) => s.number + (seatSpan(s.type) - 1) / 2
    const next = candidates.reduce((best, s) =>
      Math.abs(centre(s) - centre(from)) < Math.abs(centre(best) - centre(from)) ? s : best,
    )
    setFocusId(next.seatId)
    buttons.current.get(next.seatId)?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, seat: SeatView) {
    if (event.key.startsWith('Arrow')) {
      event.preventDefault()
      move(seat, event.key)
    }
  }

  const rows = [...new Set(seats.map((s) => s.row))].sort((a, b) => a - b)

  return (
    <div className="relative">
      <SeatDefs />

      {/* Zoom (phones only, brief §4 screen 4 / §7). Desktop uses a fixed 32 px seat. */}
      <div className="mb-3 flex items-center gap-2 md:hidden">
        <p className="mr-auto text-caption text-dust">{(hidden.left || hidden.right) && 'Vuốt ngang để xem thêm ghế'}</p>
        <span className="text-caption text-dust">Cỡ ghế</span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0, z - 1))}
          disabled={zoom === 0}
          aria-label="Thu nhỏ sơ đồ ghế"
          className="grid size-10 place-items-center rounded-control border border-seat-line text-step-1 disabled:opacity-40"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(ZOOM_CLASSES.length - 1, z + 1))}
          disabled={zoom === ZOOM_CLASSES.length - 1}
          aria-label="Phóng to sơ đồ ghế"
          className="grid size-10 place-items-center rounded-control border border-seat-line text-step-1 disabled:opacity-40"
        >
          +
        </button>
      </div>

      {/* One scroll frame: the screen, the beam and the seats move together. */}
      <div className="relative">
        {/* Edge fades sit inside the pinned row-letter columns (1.75rem each). */}
        {hidden.left && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-7 z-20 w-10 bg-linear-to-r from-house to-transparent" />
        )}
        {hidden.right && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-7 z-20 w-10 bg-linear-to-l from-house to-transparent" />
        )}
        <div ref={scroller} onScroll={measure} className="overflow-x-auto pb-2">
          <div className={`relative mx-auto w-max min-w-full ${ZOOM_CLASSES[zoom]}`}>
            {/* Screen + beam (decorative) */}
            <div aria-hidden="true" className="mx-auto mb-8 w-full max-w-[44rem] px-6">
              <svg viewBox="0 0 600 40" preserveAspectRatio="none" className="h-8 w-full">
                <path d="M10 32 Q300 4 590 32" fill="none" stroke="var(--color-screen)" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </svg>
              <p className="mt-1 text-center text-caption text-dust">Màn hình</p>
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-6 top-16 bottom-0"
              style={{
                clipPath: 'polygon(18% 0, 82% 0, 100% 100%, 0 100%)',
                background:
                  'linear-gradient(180deg, color-mix(in srgb, var(--color-lamp) 16%, transparent) 0%, color-mix(in srgb, var(--color-lamp) 5%, transparent) 55%, transparent 100%)',
              }}
            />

            <div
              role="grid"
              aria-label={`Sơ đồ ghế, ${seatMap.rows} hàng, hàng A gần màn hình nhất`}
              aria-readonly={locked || undefined}
              className="relative mx-auto grid w-max gap-x-1.5 gap-y-2"
              style={{ gridTemplateColumns: `1.75rem repeat(${seatMap.columns}, var(--seat)) 1.75rem` }}
            >
          {rows.map((row) => {
            const letter = ROW_LETTERS[row - 1]
            return (
              <div role="row" key={row} className="contents">
                {/* Row letters stay pinned while the map scrolls sideways */}
                <span role="rowheader" className="sticky left-0 z-10 self-stretch grid place-items-center bg-house text-center text-caption text-dust" style={{ gridColumn: 1, gridRow: row }}>
                  {letter}
                </span>
                {seats
                  .filter((s) => s.row === row)
                  .map((seat) => {
                    const state = visualState(seat, selectedIds.has(seat.seatId), mineIds.has(seat.seatId))
                    const interactive = !locked && (state === 'available' || state === 'selected')
                    const isOff = state === 'off'
                    const justTaken = !!taken?.ids.has(seat.seatId)
                    // Column 1 holds the row letter, so seat column n sits in grid column n + 1.
                    return (
                      <div role="gridcell" key={seat.seatId} style={{ gridColumn: `${seat.number + 1} / span ${seatSpan(seat.type)}`, gridRow: row }}>
                        <button
                          ref={(el) => {
                            if (el) buttons.current.set(seat.seatId, el)
                            else buttons.current.delete(seat.seatId)
                          }}
                          type="button"
                          tabIndex={isOff ? -1 : seat.seatId === activeId ? 0 : -1}
                          aria-label={seatAriaLabel(seat, state)}
                          aria-pressed={state === 'selected'}
                          aria-disabled={!interactive || undefined}
                          disabled={isOff}
                          onFocus={() => setFocusId(seat.seatId)}
                          onKeyDown={(e) => onKeyDown(e, seat)}
                          onClick={() => interactive && onToggle(seat)}
                          className={[
                            // Full cell width: a couple seat fills both of its columns and the gap between.
                            'group relative grid h-(--seat) w-full place-items-center rounded-seat',
                            interactive ? 'cursor-pointer hover:bg-seat-line/15' : 'cursor-default',
                          ].join(' ')}
                        >
                          {/* Press feedback on the drawing only, so the focus ring keeps its size. */}
                          <SeatGlyph
                            key={justTaken ? `taken-${taken?.key}` : undefined}
                            type={seat.type}
                            state={state}
                            className={[
                              'absolute inset-0 size-full',
                              justTaken
                                ? 'animate-seat-taken'
                                : interactive
                                  ? 'transition-transform duration-150 ease-(--ease-enter) group-active:scale-[.95]'
                                  : '',
                            ].join(' ')}
                          />
                          {state === 'available' && (
                            <span
                              className={`tabular relative mt-2.5 text-[0.6875rem] leading-none text-screen ${interactive ? 'transition-transform duration-150 ease-(--ease-enter) group-active:scale-[.95]' : ''}`}
                            >
                              {shortLabel(seat.label)}
                            </span>
                          )}
                        </button>
                      </div>
                    )
                  })}
                <span aria-hidden="true" className="sticky right-0 z-10 self-stretch grid place-items-center bg-house text-center text-caption text-dust" style={{ gridColumn: seatMap.columns + 2, gridRow: row }}>
                  {letter}
                </span>
              </div>
            )
          })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Display only: "D7" -> "7" (row letter is already shown at the row edge). */
function shortLabel(label: string): string {
  return label.replace(/^[A-Za-z]+/, '') || label
}
