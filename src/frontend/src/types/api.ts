// Types mirrored from docs/api/openapi.yaml (status: PROPOSED).
// Only the schemas needed by UC01 (browse), UC02 (seats), UC03 (booking)
// and UC06 (login) are copied here. Keep field names identical to the
// contract so the mock layer can be swapped for the real API later.

export type Id = string
/** RFC 3339 date-time, UTC with the Z suffix in responses. */
export type Timestamp = string
/** Integer VND amount (D6). One unit = one Vietnamese dong. */
export type Money = number

// ---- Enums (API names; SAD names are mapped in CLAUDE.md "Enums") ----
export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN'
export type MovieStatus = 'NOW_SHOWING' | 'COMING_SOON' | 'INACTIVE'
export type ScreenFormat = '2D' | '3D' | 'IMAX'
export type SeatType = 'REGULAR' | 'VIP' | 'SWEETBOX'
export type SeatState = 'AVAILABLE' | 'HELD' | 'SOLD'
export type SeatOperationalStatus = 'ACTIVE' | 'OUT_OF_SERVICE'
export type PricingCategory = 'WEEKDAY' | 'WEEKEND' | 'EARLY'
export type ShowtimeStatus = 'DRAFT' | 'ACTIVE' | 'CANCELLED' | 'COMPLETED'
export type HoldStatus = 'ACTIVE' | 'RELEASED' | 'EXPIRED' | 'CONSUMED'
export type BookingStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED'
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED'
export type DiscountType = 'FIXED_AMOUNT' | 'PERCENTAGE'

// ---- Identity (UC06) ----
export interface User {
  id: Id
  displayName: string
  email: string
  role: Role
  active: boolean
}

export interface Session {
  accessToken: string
  tokenType: 'Bearer'
  expiresAt: Timestamp
  user: User
}

// ---- Catalogue (UC01) ----
export interface Movie {
  id: Id
  version: number
  averageRating: number | null
  reviewCount: number
  title: string
  genres: string[]
  durationMinutes: number
  supportedFormats: ScreenFormat[]
  posterUrl: string | null
  trailerUrl: string | null
  /** Vietnamese rating label, e.g. P, K, T13, T16, T18. */
  ageRating: string
  status: MovieStatus
}

/**
 * UI-only extension. The contract's Movie has no synopsis, backdrop image or
 * release date yet, but the details screen (UCS UC01) shows "movie details"
 * and coming-soon movies need a date. Raised as HANDOVER OQ-02.
 */
export interface MovieDetails extends Movie {
  synopsis?: string
  /** Landscape still (https), used as page background. */
  backdropUrl?: string | null
  /** YYYY-MM-DD, local release date. */
  releaseDate?: string
}

export interface Showtime {
  id: Id
  version: number
  movieId: Id
  roomId: Id
  startsAt: Timestamp
  endsAt: Timestamp
  cleaningMinutes: number
  occupiedUntil: Timestamp
  format: ScreenFormat
  layoutVersion: number
  pricingCategory: PricingCategory
  status: ShowtimeStatus
  cancellationStatus: 'NONE' | 'PROCESSING' | 'COMPLETED'
}

export interface Room {
  id: Id
  name: string
  format: ScreenFormat
  rows: number
  columns: number
}

// ---- Seat map and hold (UC02) ----
export interface SeatView {
  seatId: Id
  /** 1-based; row 1 is nearest the screen. */
  row: number
  /** 1-based column coordinate, left to right facing the screen. */
  number: number
  /** Display label only; never parse it as coordinates. */
  label: string
  type: SeatType
  operationalStatus: SeatOperationalStatus
  /** null when the seat is OUT_OF_SERVICE. */
  state: SeatState | null
  price: Money | null
}

export interface SeatMap {
  showtimeId: Id
  layoutVersion: number
  rows: number
  columns: number
  screenPosition: 'FRONT_ROW_1'
  streamEpoch: Id
  version: number
  serverTime: Timestamp
  currency: 'VND'
  /** Grid positions absent from this list are gaps or aisles. */
  seats: SeatView[]
}

export interface Hold {
  id: Id
  showtimeId: Id
  seatIds: Id[]
  status: HoldStatus
  serverTime: Timestamp
  expiresAt: Timestamp
  remainingSeconds: number
  bookingId: Id | null
}

// ---- Pricing, quote and booking (UC03, UC18) ----
export interface PriceRule {
  id: Id
  version: number
  seatType: SeatType
  category: PricingCategory
  amount: Money
  currency: 'VND'
}

export interface PromotionConditions {
  minimumSubtotal: Money
  movieIds: Id[]
  showtimeIds: Id[]
  seatTypes: SeatType[]
}

export interface Promotion {
  id: Id
  version: number
  code: string
  name: string
  startsAt: Timestamp
  endsAt: Timestamp
  active: boolean
  conditions: PromotionConditions
  discountType: DiscountType
  /** VND for FIXED_AMOUNT; basis points (1–10000) for PERCENTAGE. */
  value: number
  maxDiscount: Money | null
}

export interface PriceLine {
  seatId: Id
  seatLabel: string
  seatType: SeatType
  unitPrice: Money
  discount: Money
  payable: Money
}

export interface Quote {
  id: Id
  holdId: Id
  showtimeId: Id
  movieId: Id
  movieTitle: string
  roomId: Id
  roomName: string
  startsAt: Timestamp
  items: PriceLine[]
  subtotal: Money
  discount: Money
  total: Money
  currency: 'VND'
  promotionCode: string | null
  pricingVersion: number
  promotionVersion: number | null
  serverTime: Timestamp
  expiresAt: Timestamp
  remainingSeconds: number
}

export interface Booking {
  id: Id
  holdId: Id
  status: BookingStatus
  paymentStatus: PaymentStatus | null
  paymentId: Id | null
  quoteSnapshot: Quote
  createdAt: Timestamp
  serverTime: Timestamp
  expiresAt: Timestamp
  remainingSeconds: number
  failureReason: string | null
  ticketIssuanceStatus: 'NOT_REQUESTED' | 'PENDING' | 'READY' | 'RETRYING'
  resolutionStatus: 'NONE' | 'REQUIRED' | 'IN_PROGRESS' | 'RESOLVED'
  showtimeStatus: ShowtimeStatus
}

// ---- Errors ----
export interface ApiError {
  code: string
  message: string
  details: { field: string; reason: string }[]
  requestId: Id
  context?: {
    conflictingSeatIds?: Id[]
    currentQuote?: Quote
    reason?: string
  }
}
