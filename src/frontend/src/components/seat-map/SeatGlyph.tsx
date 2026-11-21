import type { SeatType } from '../../types/api'
import type { SeatVisualState } from './seatVisual'

// One seat drawn in its grid box. Type is shown by SHAPE, state by fill +
// pattern + icon, so nothing depends on colour alone (UCS UC02, brief §5).
//   REGULAR  32x32: backrest + cushion.
//   VIP      32x32: taller backrest with a diamond mark, outline only when
//            available (a filled band read as SOLD, D24).
//   SWEETBOX 70x32: one couple sofa across two columns + the 6 px gap.

const FILL: Record<SeatVisualState, string> = {
  available: 'transparent',
  selected: 'var(--color-lamp)',
  held: 'url(#seat-hatch)',
  sold: 'var(--color-aisle)',
  off: 'transparent',
}

const STROKE: Record<SeatVisualState, string> = {
  available: 'var(--color-seat-line)',
  selected: 'var(--color-lamp)',
  held: 'var(--color-seat-line)',
  sold: 'var(--color-aisle)',
  // Dashed seat-line (4.13:1 on house): visible as "a seat that exists but is
  // closed", told apart from AVAILABLE by the dashes and the missing number.
  off: 'var(--color-seat-line)',
}

/** Width of the SWEETBOX drawing: two 32-unit seats + the 6-unit column gap. */
const WIDE = 70

interface Props {
  type: SeatType
  state: SeatVisualState
  className?: string
}

export default function SeatGlyph({ type, state, className }: Props) {
  const fill = FILL[state]
  const stroke = STROKE[state]
  const dash = state === 'off' ? '2.5 2.5' : undefined
  const ink = state === 'selected' ? 'var(--color-house)' : 'var(--color-dust)'
  const wide = type === 'SWEETBOX'
  const width = wide ? WIDE : 32
  const line = { fill, stroke, strokeWidth: 1.5, strokeDasharray: dash }

  return (
    <svg viewBox={`0 0 ${width} 32`} aria-hidden="true" className={className} focusable="false">
      {wide ? (
        <>
          {/* Couple sofa: one long backrest, one long cushion, armrests at both ends */}
          <rect x="6" y="4" width={WIDE - 12} height="8" rx="4" {...line} />
          <rect x="1.5" y="11" width="6" height="17" rx="3" {...line} />
          <rect x={WIDE - 7.5} y="11" width="6" height="17" rx="3" {...line} />
          <rect x="7.5" y="13" width={WIDE - 15} height="15" rx="4.5" {...line} />
        </>
      ) : (
        <>
          <rect x="5" y={type === 'VIP' ? 1.5 : 4} width="22" height={type === 'VIP' ? 10.5 : 8} rx="3.5" {...line} />
          <rect x="3.5" y="13" width="25" height="15" rx="4.5" {...line} />
          {type === 'VIP' && state !== 'off' && <path d="M16 3.9l2.9 2.9L16 9.7l-2.9-2.9z" fill={ink} />}
        </>
      )}

      {/* State marks, centred on the cushion (x = 16 in a 32-unit seat) */}
      <g transform={wide ? `translate(${(WIDE - 32) / 2} 0)` : undefined}>
        {state === 'selected' && (
          // The tick grows from its own centre (fill-box), not the svg corner.
          <path
            d="M11 20.5l3.2 3.2L21.5 16.5"
            fill="none"
            stroke={ink}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="origin-center animate-seat-mark [transform-box:fill-box]"
          />
        )}
        {state === 'held' && (
          <g stroke="var(--color-screen)" strokeWidth="1.5" fill="var(--color-house)">
            <circle cx="16" cy="20.5" r="5" />
            <path d="M16 18v2.7l1.8 1.2" fill="none" strokeLinecap="round" />
          </g>
        )}
        {state === 'sold' && (
          <path d="M12.5 17l7 7M19.5 17l-7 7" stroke="var(--color-dust)" strokeWidth="1.8" strokeLinecap="round" />
        )}
      </g>
    </svg>
  )
}

/** Shared SVG defs (hatch pattern for HELD seats). Render once per page. */
export function SeatDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" className="absolute">
      <defs>
        <pattern id="seat-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" fill="var(--color-wall)" />
          <line x1="0" y1="0" x2="0" y2="5" stroke="var(--color-seat-line)" strokeWidth="2" />
        </pattern>
      </defs>
    </svg>
  )
}
