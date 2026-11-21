import type { SeatType } from '../../types/api'
import { formatVnd } from '../../lib/format'
import SeatGlyph from './SeatGlyph'
import { SEAT_TYPE_LABEL, type SeatVisualState } from './seatVisual'

const STATES: { state: SeatVisualState; label: string }[] = [
  { state: 'available', label: 'Trống' },
  { state: 'selected', label: 'Bạn đang chọn' },
  { state: 'held', label: 'Người khác đang giữ' },
  { state: 'sold', label: 'Đã bán' },
  { state: 'off', label: 'Tạm ngưng' },
]

/**
 * Legend: states and seat types with their price for this showtime.
 * Headings are h2: the page goes h1 (movie) -> h2 (legend, summary panel).
 */
export default function SeatLegend({ prices }: { prices: Partial<Record<SeatType, number>> }) {
  const types = (Object.keys(SEAT_TYPE_LABEL) as SeatType[]).filter((t) => prices[t] !== undefined)
  return (
    <div className="grid gap-4 text-caption text-dust sm:grid-cols-2">
      <div>
        <h2 className="mb-2 font-semibold text-screen">Trạng thái ghế</h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {STATES.map(({ state, label }) => (
            <li key={state} className="flex items-center gap-2">
              <SeatGlyph type="REGULAR" state={state} className="size-6 shrink-0" />
              {label}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="mb-2 font-semibold text-screen">Loại ghế và giá</h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {types.map((type) => (
            <li key={type} className="flex items-center gap-2">
              {/* A couple seat is drawn two columns wide, as on the map (70 x 32 units). */}
              <SeatGlyph type={type} state="available" className={`h-6 shrink-0 ${type === 'SWEETBOX' ? 'w-[3.28rem]' : 'w-6'}`} />
              <span>
                {SEAT_TYPE_LABEL[type]}
                {type === 'SWEETBOX' && ' (2 người)'} <span className="tabular text-screen">{formatVnd(prices[type]!)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
