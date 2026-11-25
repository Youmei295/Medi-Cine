import type { SeatType, SeatView } from '../../types/api'
import { formatVnd } from '../../lib/format'

/** What the customer sees for one seat (brief §5). */
export type SeatVisualState = 'available' | 'selected' | 'held' | 'sold' | 'off'

export const SEAT_TYPE_LABEL: Record<SeatType, string> = {
  REGULAR: 'Ghế thường',
  VIP: 'Ghế VIP',
  SWEETBOX: 'Ghế đôi',
}

export const SEAT_STATE_LABEL: Record<SeatVisualState, string> = {
  available: 'còn trống',
  selected: 'đang chọn',
  held: 'đang được người khác giữ',
  sold: 'đã bán',
  off: 'tạm ngưng phục vụ',
}

/**
 * Grid columns one seat covers. A SWEETBOX (couple) seat is one seat with one
 * price that spans two columns, starting at `seat.number`. `SeatView` has no
 * width field yet, so this is a UI convention until the API adds one (OQ-05).
 */
export function seatSpan(type: SeatType): 1 | 2 {
  return type === 'SWEETBOX' ? 2 : 1
}

export function visualState(seat: SeatView, selected: boolean, mine: boolean): SeatVisualState {
  if (seat.operationalStatus === 'OUT_OF_SERVICE' || seat.state === null) return 'off'
  if (selected || mine) return 'selected'
  if (seat.state === 'SOLD') return 'sold'
  if (seat.state === 'HELD') return 'held'
  return 'available'
}

/** Screen-reader label, e.g. "Ghế D7, ghế VIP, 95.000 ₫, còn trống". */
export function seatAriaLabel(seat: SeatView, state: SeatVisualState): string {
  if (state === 'off') return `Ghế ${seat.label}, ${SEAT_STATE_LABEL.off}`
  const price = seat.price !== null ? `, ${formatVnd(seat.price)}` : ''
  // "Ghế VIP" -> "ghế VIP" mid-sentence; keep the rest of the name as written.
  const typeName = SEAT_TYPE_LABEL[seat.type].replace(/^Ghế/, 'ghế')
  return `Ghế ${seat.label}, ${typeName}${price}, ${SEAT_STATE_LABEL[state]}`
}
