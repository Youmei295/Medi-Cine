// In-browser mock of the MEDI-CINE REST API (docs/api/openapi.yaml).
// Reads the JSON files in ./data and returns contract-shaped objects.
// Holds, quotes and bookings are kept in memory (lost on reload).

import type {
  ApiError,
  Booking,
  Hold,
  Id,
  Movie,
  MovieDetails,
  MovieStatus,
  PriceRule,
  PricingCategory,
  Promotion,
  Quote,
  Room,
  SeatMap,
  SeatType,
  SeatView,
  Session,
  Showtime,
  User,
} from '../types/api'
import moviesData from './data/movies.json'
import roomsData from './data/rooms.json'
import showtimesData from './data/showtimes.json'
import seatStatesData from './data/seat-states.json'
import priceRulesData from './data/price-rules.json'
import promotionsData from './data/promotions.json'
import usersData from './data/users.json'

const LATENCY_MS = 300
const CLEANING_MINUTES = 15
const LAYOUT_VERSION = 1

/** Thrown by every mock call that fails; carries a contract-shaped Error body. */
export class ApiRequestError extends Error {
  readonly status: number
  readonly body: ApiError

  constructor(status: number, code: string, message: string, context?: ApiError['context']) {
    super(`${status} ${code}`)
    this.status = status
    this.body = { code, message, details: [], requestId: `req-${Date.now()}`, context }
  }
}

// ---- MOCK ONLY switches (demos and screenshots of alternative flows) ----
/**
 * Like ?mockNow, `?name=value` on any URL turns a switch on for the tab
 * (sessionStorage) and `?name=0` turns it off. Switches that change a booking
 * are set on the seat page before holding: typing them on the review page
 * would reload it and lose the in-memory hold.
 *   mockPriceChange=1  first "Tiếp tục thanh toán" of each hold: price changed (UC03 3.2.2.3)
 *   mockBookingFail=1  first "Tiếp tục thanh toán" of each hold fails (UC03 3.2.2.5)
 *   mockFail=a,b|all   those operations fail like an unreachable server (503, UC01 1.2.2.3 …)
 *   mockEmpty=1        the cinema has no movies and no showtimes (UC01 1.2.2.1)
 *   mockLatency=ms     every call waits this long (max 20 s): loading states
 */
const MOCK_SWITCHES = ['mockPriceChange', 'mockBookingFail', 'mockFail', 'mockEmpty', 'mockLatency'] as const
type MockSwitch = (typeof MOCK_SWITCHES)[number]

/** Query string whose switches were last stored (see captureMockFlags). */
let capturedSearch: string | null = null

/**
 * Stores the switches found in the current URL for this tab, once per URL:
 * re-reading an unchanged URL on every call would turn a switch back on after
 * it was cleared, so "Thử lại" on `/?mockFail=…` could never succeed.
 */
function captureMockFlags() {
  if (window.location.search === capturedSearch) return
  capturedSearch = window.location.search
  const params = new URLSearchParams(window.location.search)
  MOCK_SWITCHES.forEach((name) => {
    const value = params.get(name)
    if (value === null) return
    if (value === '0' || value === '') sessionStorage.removeItem(`medicine.${name}`)
    else sessionStorage.setItem(`medicine.${name}`, value)
  })
}

function mockSetting(name: MockSwitch): string | null {
  captureMockFlags()
  return sessionStorage.getItem(`medicine.${name}`)
}

const mockFlag = (name: MockSwitch): boolean => mockSetting(name) === '1'

function latencyMs(): number {
  const raw = Number(mockSetting('mockLatency'))
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 20_000) : LATENCY_MS
}

const wait = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), latencyMs()))

/** Operations `?mockFail=` can break. */
export type FailableOperation =
  | 'listMovies'
  | 'getMovie'
  | 'listShowtimes'
  | 'getShowtime'
  | 'getSeatMap'
  | 'createHold'
  | 'createQuote'
  | 'getBooking'

/** A 503 after the usual delay when `?mockFail=` names this operation (or `all`); else null. */
function failure(operation: FailableOperation): Promise<never> | null {
  const names = (mockSetting('mockFail') ?? '').split(',').map((n) => n.trim())
  if (!names.includes(operation) && !names.includes('all')) return null
  const error = new ApiRequestError(503, 'SERVICE_UNAVAILABLE', 'Máy chủ tạm thời không phản hồi.')
  return new Promise((_, reject) => setTimeout(() => reject(error), latencyMs()))
}

const MOCK_NOW_KEY = 'medicine.mockNow'

/**
 * Server clock of the mock. MOCK ONLY: `?mockNow=2026-11-20T12:00:00%2B07:00`
 * pins the clock for demos and screenshots (kept for the tab in sessionStorage);
 * `?mockNow=off` returns to the real clock. The sample dates follow this clock
 * (see dataShiftDays). Hold timers always use the real clock.
 */
export function mockNow(): Date {
  captureMockFlags() // pages that only read the clock also pick up the mock switches
  const param = new URLSearchParams(window.location.search).get('mockNow')
  if (param === 'off') sessionStorage.removeItem(MOCK_NOW_KEY)
  else if (param && !Number.isNaN(Date.parse(param))) sessionStorage.setItem(MOCK_NOW_KEY, param)
  const pinned = sessionStorage.getItem(MOCK_NOW_KEY)
  return pinned ? new Date(pinned) : new Date()
}

// ---- Data access ----
const priceRules = priceRulesData as PriceRule[]

interface RawRoom extends Room {
  layout: string[]
}
const rooms: RawRoom[] = roomsData.rooms.map((r) => ({
  ...r,
  format: r.format as Room['format'],
  rows: r.layout.length,
  columns: Math.max(...r.layout.map((line) => line.length)),
}))

interface RawSeatStates {
  held?: string[]
  sold?: string[]
  takenOnHold?: string[]
  allSold?: boolean
}
const seatStates = seatStatesData.showtimes as Record<Id, RawSeatStates>

const addMinutes = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() + minutes * 60_000).toISOString().replace('.000Z', 'Z')

/*
 * MOCK ONLY — sample dates that follow the clock. The JSON files hold one fixed
 * week: showtimes on 20–23/11/2026 (Fri–Mon, Vietnam time), release dates and
 * promotion windows around it. On every call the whole set is moved by whole
 * days so that 20/11/2026 lands on "today" of mockNow(): the site always has
 * showtimes today and the next three days, whenever it is opened. With
 * `?mockNow=2026-11-20…` the shift is 0 and everything matches the JSON (and the
 * Phase 7 screenshots). Times of day never change; the pricing category is
 * worked out again from the shifted date (EARLY before 12:00, WEEKEND on
 * Saturday/Sunday, else WEEKDAY), the rule the JSON was written with.
 * Known limit (HANDOVER): only four days of showtimes; more sample data is
 * planned. The real backend owns real dates, so none of this goes to the API.
 */
const DATA_FIRST_DAY = Date.parse('2026-11-20T00:00:00+07:00')
const DAY_MS = 86_400_000
const VN_OFFSET_MS = 7 * 3_600_000
const vnDay = (ms: number) => Math.floor((ms + VN_OFFSET_MS) / DAY_MS)

/** Whole days between the sample week's first day and today (Vietnam time). */
function dataShiftDays(): number {
  return vnDay(mockNow().getTime()) - vnDay(DATA_FIRST_DAY)
}

const shiftIso = (iso: string, days: number) =>
  days === 0 ? iso : new Date(Date.parse(iso) + days * DAY_MS).toISOString().replace('.000Z', 'Z')
const shiftDate = (ymd: string, days: number) =>
  days === 0 ? ymd : new Date(Date.parse(`${ymd}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)

/** EARLY before 12:00 local, WEEKEND on Sat/Sun, else WEEKDAY (rule used by showtimes.json). */
function pricingCategoryOf(startsAt: string): PricingCategory {
  const local = new Date(Date.parse(startsAt) + VN_OFFSET_MS)
  if (local.getUTCHours() < 12) return 'EARLY'
  const weekday = local.getUTCDay()
  return weekday === 0 || weekday === 6 ? 'WEEKEND' : 'WEEKDAY'
}

interface SampleData {
  shift: number
  movies: MovieDetails[]
  showtimes: Showtime[]
  promotions: Promotion[]
}
let sample: SampleData | null = null

/** The sample data moved to today's dates; rebuilt only when the day changes. */
function data(): SampleData {
  const shift = dataShiftDays()
  if (sample?.shift === shift) return sample
  const movies = (moviesData as MovieDetails[]).map((m) =>
    m.releaseDate ? { ...m, releaseDate: shiftDate(m.releaseDate, shift) } : m,
  )
  const promotions = (promotionsData as Promotion[]).map((p) => ({
    ...p,
    startsAt: shiftIso(p.startsAt, shift),
    endsAt: shiftIso(p.endsAt, shift),
  }))
  const showtimes = showtimesData.showtimes.map((s) => buildShowtime(s, shift, movies))
  sample = { shift, movies, showtimes, promotions }
  return sample
}

type RawShowtime = (typeof showtimesData.showtimes)[number]

function buildShowtime(s: RawShowtime, shift: number, movies: MovieDetails[]): Showtime {
  const movie = movies.find((m) => m.id === s.movieId)
  const startsAt = shiftIso(s.startsAt, shift)
  const endsAt = addMinutes(startsAt, movie?.durationMinutes ?? 0)
  return {
    ...s,
    startsAt,
    format: s.format as Showtime['format'],
    pricingCategory: shift === 0 ? (s.pricingCategory as PricingCategory) : pricingCategoryOf(startsAt),
    status: s.status as Showtime['status'],
    version: 1,
    endsAt,
    cleaningMinutes: CLEANING_MINUTES,
    occupiedUntil: addMinutes(endsAt, CLEANING_MINUTES),
    layoutVersion: LAYOUT_VERSION,
    cancellationStatus: 'NONE',
  }
}

const SEAT_CODES: Record<string, SeatType> = { R: 'REGULAR', V: 'VIP', S: 'SWEETBOX', X: 'REGULAR' }
const ROW_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function priceFor(seatType: SeatType, category: PricingCategory): number {
  const rule = priceRules.find((r) => r.seatType === seatType && r.category === category)
  if (!rule) throw new Error(`Missing price rule ${seatType}/${category}`)
  return rule.amount
}

// ---- UC01: catalogue ----
export interface ListMoviesQuery {
  status?: Exclude<MovieStatus, 'INACTIVE'>
  search?: string
  genre?: string
}

/**
 * Lower case without tone marks and with đ -> d, so "bo sua" finds "Bò Sữa Bay":
 * Vietnamese users often type without diacritics. The contract does not say
 * how `search` matches; this is the mock's choice (proposed to backend, OQ-06).
 */
function foldVietnamese(text: string): string {
  return text.normalize('NFD').replace(/\p{Mn}/gu, '').replace(/đ/gi, 'd').toLocaleLowerCase('vi')
}

/** listMovies: INACTIVE movies are never returned to customers. */
export function listMovies(query: ListMoviesQuery = {}): Promise<Movie[]> {
  const failed = failure('listMovies')
  if (failed) return failed
  if (mockFlag('mockEmpty')) return wait([])
  const search = query.search ? foldVietnamese(query.search.trim()) : ''
  const result = data().movies.filter(
    (m) =>
      m.status !== 'INACTIVE' &&
      (!query.status || m.status === query.status) &&
      (!query.genre || m.genres.includes(query.genre)) &&
      (!search || foldVietnamese(m.title).includes(search)),
  )
  return wait(result)
}

export function listGenres(): string[] {
  return [...new Set(data().movies.filter((m) => m.status !== 'INACTIVE').flatMap((m) => m.genres))].sort((a, b) =>
    a.localeCompare(b, 'vi'),
  )
}

export function getMovie(movieId: Id): Promise<MovieDetails> {
  const failed = failure('getMovie')
  if (failed) return failed
  const movie = data().movies.find((m) => m.id === movieId && m.status !== 'INACTIVE')
  if (!movie) return Promise.reject(new ApiRequestError(404, 'MOVIE_NOT_FOUND', 'Không tìm thấy phim.'))
  return wait(movie)
}

export interface ListShowtimesQuery {
  movieId?: Id
  format?: Showtime['format']
}

/**
 * listShowtimes: only ACTIVE showtimes still accepting bookings (start time
 * after the server clock), ordered by start time. Contract: no movieId =
 * every movie.
 */
export function listShowtimes(query: ListShowtimesQuery = {}): Promise<Showtime[]> {
  const failed = failure('listShowtimes')
  if (failed) return failed
  if (mockFlag('mockEmpty')) return wait([])
  const now = mockNow().toISOString()
  const result = data().showtimes
    .filter(
      (s) =>
        s.status === 'ACTIVE' &&
        s.startsAt > now &&
        (!query.movieId || s.movieId === query.movieId) &&
        (!query.format || s.format === query.format),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  return wait(result)
}

export interface ShowtimeContext {
  showtime: Showtime
  movie: MovieDetails
  room: Room
}

export function getShowtime(showtimeId: Id): Promise<ShowtimeContext> {
  const failed = failure('getShowtime')
  if (failed) return failed
  const showtime = data().showtimes.find((s) => s.id === showtimeId)
  const movie = data().movies.find((m) => m.id === showtime?.movieId)
  const raw = rooms.find((r) => r.id === showtime?.roomId)
  if (!showtime || !movie || !raw)
    return Promise.reject(new ApiRequestError(404, 'SHOWTIME_NOT_FOUND', 'Không tìm thấy suất chiếu.'))
  const { layout: _layout, ...room } = raw
  return wait({ showtime, movie, room })
}

// ---- UC02: seat map ----
export function getSeatMap(showtimeId: Id): Promise<SeatMap> {
  const failed = failure('getSeatMap')
  if (failed) return failed
  const showtime = data().showtimes.find((s) => s.id === showtimeId)
  const room = rooms.find((r) => r.id === showtime?.roomId)
  if (!showtime || !room)
    return Promise.reject(new ApiRequestError(404, 'SHOWTIME_NOT_FOUND', 'Không tìm thấy suất chiếu.'))

  const states = seatStates[showtimeId] ?? {}
  const heldNow = new Set([...activeHoldLabels(showtimeId), ...(takenLabels.get(showtimeId) ?? [])])
  const seats: SeatView[] = []
  room.layout.forEach((line, rowIndex) => {
    let count = 0
    let pairOpen = false
    ;[...line].forEach((code, colIndex) => {
      // "SS" is ONE sweetbox seat that spans two columns; `number` = its left
      // column, the right column is left out of `seats` (UI convention, OQ-05).
      if (code === 'S' && pairOpen) {
        pairOpen = false
        return
      }
      pairOpen = code === 'S'
      if (code === '.') return
      count += 1
      const label = `${ROW_LETTERS[rowIndex]}${count}`
      const type = SEAT_CODES[code]
      const outOfService = code === 'X'
      const state = outOfService
        ? null
        : states.allSold || states.sold?.includes(label)
          ? 'SOLD'
          : states.held?.includes(label) || heldNow.has(label)
            ? 'HELD'
            : 'AVAILABLE'
      seats.push({
        seatId: `${showtime.roomId}-${label}`,
        row: rowIndex + 1,
        number: colIndex + 1,
        label,
        type,
        operationalStatus: outOfService ? 'OUT_OF_SERVICE' : 'ACTIVE',
        state,
        price: outOfService ? null : priceFor(type, showtime.pricingCategory),
      })
    })
  })

  return wait({
    showtimeId,
    layoutVersion: LAYOUT_VERSION,
    rows: room.rows,
    columns: room.columns,
    screenPosition: 'FRONT_ROW_1',
    streamEpoch: 'epoch-mock',
    version: 0,
    serverTime: new Date().toISOString(),
    currency: 'VND',
    seats,
  })
}

// ---- UC02: seat holds (createHold / getHold / releaseHold) ----
const DEFAULT_HOLD_SECONDS = 600 // D8
const holds = new Map<Id, Hold>()
/** Seats that "another customer" grabbed during this session (alt 2.2.2.2). */
const takenLabels = new Map<Id, Set<string>>()

const labelOf = (seatId: Id) => seatId.split('-').pop() ?? seatId

/** MOCK ONLY: `?mockHoldSeconds=20` shortens the hold to demo expiry (alt 2.2.2.5). */
function holdSeconds(): number {
  const raw = Number(new URLSearchParams(window.location.search).get('mockHoldSeconds'))
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, DEFAULT_HOLD_SECONDS) : DEFAULT_HOLD_SECONDS
}

function refreshHold(hold: Hold): Hold {
  const remaining = Math.max(0, Math.round((Date.parse(hold.expiresAt) - Date.now()) / 1000))
  if (hold.status === 'ACTIVE' && remaining === 0) hold.status = 'EXPIRED'
  return { ...hold, serverTime: new Date().toISOString(), remainingSeconds: hold.status === 'ACTIVE' ? remaining : 0 }
}

function activeHoldLabels(showtimeId: Id): string[] {
  return [...holds.values()]
    .map(refreshHold)
    .filter((h) => h.showtimeId === showtimeId && h.status === 'ACTIVE')
    .flatMap((h) => h.seatIds.map(labelOf))
}

/**
 * createHold: all-or-nothing. If any seat is no longer AVAILABLE the whole
 * request is rejected with 409 SEATS_UNAVAILABLE + conflictingSeatIds.
 */
export async function createHold(showtimeId: Id, seatIds: Id[]): Promise<Hold> {
  await failure('createHold')
  const map = await getSeatMap(showtimeId)
  // A showtime that has started no longer accepts holds (contract: 409 SHOWTIME_CLOSED).
  // The lists already hide it; this guards a link or a page left open past the start.
  const showtime = data().showtimes.find((s) => s.id === showtimeId)
  if (showtime && showtime.startsAt <= mockNow().toISOString()) {
    throw new ApiRequestError(409, 'SHOWTIME_CLOSED', 'Suất chiếu đã bắt đầu, không còn nhận đặt vé.')
  }
  const byId = new Map(map.seats.map((s) => [s.seatId, s]))
  const taken = new Set(seatStates[showtimeId]?.takenOnHold ?? [])

  const conflicting = seatIds.filter((id) => byId.get(id)?.state !== 'AVAILABLE' || taken.has(labelOf(id)))
  if (conflicting.length > 0) {
    // The scripted "other customer" now owns those seats.
    const set = takenLabels.get(showtimeId) ?? new Set<string>()
    conflicting.forEach((id) => set.add(labelOf(id)))
    takenLabels.set(showtimeId, set)
    throw new ApiRequestError(409, 'SEATS_UNAVAILABLE', 'Một số ghế vừa được người khác giữ.', {
      conflictingSeatIds: conflicting,
    })
  }

  const now = new Date()
  const hold: Hold = {
    id: `hold-${now.getTime()}`,
    showtimeId,
    seatIds,
    status: 'ACTIVE',
    serverTime: now.toISOString(),
    expiresAt: new Date(now.getTime() + holdSeconds() * 1000).toISOString(),
    remainingSeconds: holdSeconds(),
    bookingId: null,
  }
  holds.set(hold.id, hold)
  return wait(refreshHold(hold))
}

export function getHold(holdId: Id): Promise<Hold> {
  const hold = holds.get(holdId)
  if (!hold) return Promise.reject(new ApiRequestError(404, 'HOLD_NOT_FOUND', 'Không tìm thấy lượt giữ ghế.'))
  return wait(refreshHold(hold))
}

export function releaseHold(holdId: Id): Promise<void> {
  const hold = holds.get(holdId)
  if (hold && hold.status === 'ACTIVE') hold.status = 'RELEASED'
  return wait(undefined)
}

// ---- UC03 + UC18: quote and booking (createQuote / createBooking / getBooking) ----
const quotes = new Map<Id, Quote>()
/** Latest quote per hold: createBooking accepts only this one (else QUOTE_STALE). */
const latestQuote = new Map<Id, Id>()
const bookings = new Map<Id, Booking>()
const bookingByHold = new Map<Id, Id>()
/** Holds whose scripted price change / failure already happened once. */
const priceChanged = new Set<Id>()
const failedOnce = new Set<Id>()

/** Reason a code cannot be used; the UI words it (UC18, brief §6). */
export type PromotionProblem = 'NOT_FOUND' | 'EXPIRED' | 'NOT_STARTED' | 'MIN_SUBTOTAL' | 'SEAT_TYPE' | 'NOT_FOR_SHOWTIME'

function promotionError(problem: PromotionProblem, code: string): ApiRequestError {
  const ineligible = problem === 'MIN_SUBTOTAL' || problem === 'SEAT_TYPE' || problem === 'NOT_FOR_SHOWTIME'
  const error = new ApiRequestError(
    422,
    ineligible ? 'PROMOTION_INELIGIBLE' : 'PROMOTION_INVALID',
    ineligible ? 'Mã giảm giá không áp dụng cho đơn này.' : 'Mã giảm giá không dùng được.',
  )
  error.body.details = [{ field: 'promotionCode', reason: problem }]
  error.body.context = { reason: code }
  return error
}

function activeHold(holdId: Id): Hold {
  const stored = holds.get(holdId)
  if (!stored) throw new ApiRequestError(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy lượt giữ ghế.')
  const hold = refreshHold(stored)
  if (hold.status !== 'ACTIVE') throw new ApiRequestError(409, 'HOLD_EXPIRED', 'Lượt giữ ghế đã hết hạn.')
  return hold
}

/**
 * Prices and discount for a hold (D6): integer VND; a percentage is in basis
 * points, the booking-level discount is rounded once (half up) and then capped;
 * the discount is spread over the eligible lines, the remainder on the last one.
 */
async function priceHold(hold: Hold, code: string | null, surcharge = 0, version = 1): Promise<Quote> {
  const showtime = data().showtimes.find((s) => s.id === hold.showtimeId)!
  const movie = data().movies.find((m) => m.id === showtime.movieId)!
  const room = rooms.find((r) => r.id === showtime.roomId)!
  const map = await getSeatMap(hold.showtimeId)
  const seats = hold.seatIds.map((id) => map.seats.find((s) => s.seatId === id)!)
  const lines = seats.map((s) => ({
    seatId: s.seatId,
    seatLabel: s.label,
    seatType: s.type,
    unitPrice: priceFor(s.type, showtime.pricingCategory) + surcharge,
    discount: 0,
    payable: 0,
  }))
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice, 0)

  let promotion: Promotion | null = null
  if (code) {
    const now = mockNow().toISOString()
    promotion = data().promotions.find((p) => p.code === code && p.active) ?? null
    if (!promotion) throw promotionError('NOT_FOUND', code)
    if (now >= promotion.endsAt) throw promotionError('EXPIRED', code)
    if (now < promotion.startsAt) throw promotionError('NOT_STARTED', code)
    const c = promotion.conditions
    if ((c.movieIds.length && !c.movieIds.includes(movie.id)) || (c.showtimeIds.length && !c.showtimeIds.includes(showtime.id)))
      throw promotionError('NOT_FOR_SHOWTIME', code)
    if (c.seatTypes.length && !lines.some((l) => c.seatTypes.includes(l.seatType))) throw promotionError('SEAT_TYPE', code)
    if (subtotal < c.minimumSubtotal) throw promotionError('MIN_SUBTOTAL', code)
  }

  let discount = 0
  if (promotion) {
    const p = promotion
    const eligible = lines.filter((l) => !p.conditions.seatTypes.length || p.conditions.seatTypes.includes(l.seatType))
    const base = eligible.reduce((sum, l) => sum + l.unitPrice, 0)
    discount = p.discountType === 'PERCENTAGE' ? Math.floor((base * p.value) / 10000 + 0.5) : p.value
    if (p.maxDiscount !== null) discount = Math.min(discount, p.maxDiscount)
    discount = Math.min(discount, base - 1) // ZERO_PAYABLE_UNSUPPORTED: keep at least 1 ₫ payable
    let left = discount
    eligible.forEach((l, i) => {
      const share = i === eligible.length - 1 ? left : Math.floor((discount * l.unitPrice) / base)
      l.discount = share
      left -= share
    })
  }
  lines.forEach((l) => (l.payable = l.unitPrice - l.discount))

  const now = new Date()
  return {
    id: `quote-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
    holdId: hold.id,
    showtimeId: showtime.id,
    movieId: movie.id,
    movieTitle: movie.title,
    roomId: room.id,
    roomName: room.name,
    startsAt: showtime.startsAt,
    items: lines,
    subtotal,
    discount,
    total: subtotal - discount,
    currency: 'VND',
    promotionCode: promotion?.code ?? null,
    pricingVersion: version,
    promotionVersion: promotion?.version ?? null,
    serverTime: now.toISOString(),
    // Quotes never extend the hold (API_GUIDE): they expire with it.
    expiresAt: hold.expiresAt,
    remainingSeconds: hold.remainingSeconds,
  }
}

/**
 * createQuote: server-side prices for an active hold, with an optional code
 * (null removes it). An invalid code throws 422 and leaves the previous quote
 * current (UC18: base price kept).
 */
export async function createQuote(holdId: Id, promotionCode: string | null): Promise<Quote> {
  await failure('createQuote')
  const hold = activeHold(holdId)
  if (bookingByHold.has(holdId)) throw new ApiRequestError(409, 'HOLD_HAS_BOOKING', 'Lượt giữ ghế này đã có đơn.')
  const code = promotionCode?.trim().toUpperCase() || null
  const quote = await priceHold(hold, code, priceChanged.has(holdId) ? 10000 : 0, priceChanged.has(holdId) ? 2 : 1)
  quotes.set(quote.id, quote)
  latestQuote.set(holdId, quote.id)
  return quote
}

function refreshBooking(booking: Booking): Booking {
  const remaining = Math.max(0, Math.floor((Date.parse(booking.expiresAt) - Date.now()) / 1000))
  if (booking.status === 'PENDING' && remaining === 0) booking.status = 'EXPIRED'
  return { ...booking, serverTime: new Date().toISOString(), remainingSeconds: booking.status === 'PENDING' ? remaining : 0 }
}

/**
 * createBooking: needs the hold's current quote. The same hold returns the
 * same PENDING booking (UC03 alt 3.2.2.4). Creates a PENDING booking only:
 * no payment, no ticket, seats stay HELD (P1, P2). Its payment deadline is the
 * hold's expiry, since nothing extends the hold.
 * Mock switches (per tab, see mockFlag): ?mockPriceChange=1 (3.2.2.3, first
 * attempt → QUOTE_STALE with the new quote), ?mockBookingFail=1 (3.2.2.5, first
 * attempt → 503).
 */
export async function createBooking(holdId: Id, quoteId: Id): Promise<Booking> {
  const existing = bookingByHold.get(holdId)
  if (existing) return wait(refreshBooking(bookings.get(existing)!))

  const hold = activeHold(holdId)
  const quote = quotes.get(quoteId)
  if (!quote || quote.holdId !== holdId)
    throw new ApiRequestError(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy báo giá.')

  if (mockFlag('mockBookingFail') && !failedOnce.has(holdId)) {
    failedOnce.add(holdId)
    await wait(null)
    throw new ApiRequestError(503, 'SERVICE_UNAVAILABLE', 'Hệ thống đặt vé tạm thời không phản hồi.')
  }

  if (mockFlag('mockPriceChange') && !priceChanged.has(holdId)) {
    // Ticket prices were raised by 10.000 ₫ per seat while the customer reviewed.
    priceChanged.add(holdId)
    const fresh = await priceHold(hold, quote.promotionCode, 10000, 2)
    quotes.set(fresh.id, fresh)
    latestQuote.set(holdId, fresh.id)
    throw new ApiRequestError(409, 'QUOTE_STALE', 'Giá vé đã thay đổi.', { currentQuote: fresh })
  }

  if (latestQuote.get(holdId) !== quoteId) {
    const current = quotes.get(latestQuote.get(holdId)!)
    throw new ApiRequestError(409, 'QUOTE_STALE', 'Báo giá không còn hiệu lực.', { currentQuote: current })
  }

  const now = new Date()
  const booking: Booking = {
    id: bookingReference(),
    holdId,
    status: 'PENDING',
    paymentStatus: null,
    paymentId: null,
    quoteSnapshot: quote,
    createdAt: now.toISOString(),
    serverTime: now.toISOString(),
    expiresAt: hold.expiresAt,
    remainingSeconds: hold.remainingSeconds,
    failureReason: null,
    ticketIssuanceStatus: 'NOT_REQUESTED',
    resolutionStatus: 'NONE',
    showtimeStatus: 'ACTIVE',
  }
  bookings.set(booking.id, booking)
  bookingByHold.set(holdId, booking.id)
  holds.get(holdId)!.bookingId = booking.id
  return wait(refreshBooking(booking))
}

/** Mock booking code: 5 characters without look-alikes (no O/0, I/1), e.g. "BK-7KQ2M". */
function bookingReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 5; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)]
  return `BK-${code}`
}

export function getBooking(bookingId: Id): Promise<Booking> {
  const failed = failure('getBooking')
  if (failed) return failed
  const booking = bookings.get(bookingId)
  if (!booking) return Promise.reject(new ApiRequestError(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy đơn đặt vé.'))
  return wait(refreshBooking(booking))
}

// ---- UC06: register + login (mock only) ----
/** Accounts created with registerCustomer during this page load (lost on reload). */
const registered: (typeof usersData.users)[number][] = []
const allUsers = () => [...usersData.users, ...registered]

export interface RegisterInput {
  displayName: string
  email: string
  /** openapi RegisterInput: 12–128 characters. */
  password: string
}

/** registerCustomer: creates a CUSTOMER account; login is a separate call. 409 ACCOUNT_EXISTS. */
export function registerCustomer(input: RegisterInput): Promise<User> {
  const email = input.email.trim().toLowerCase()
  if (allUsers().some((u) => u.email.toLowerCase() === email))
    return Promise.reject(new ApiRequestError(409, 'ACCOUNT_EXISTS', 'Email này đã có tài khoản.'))
  if (input.password.length < 12)
    return Promise.reject(new ApiRequestError(422, 'VALIDATION_FAILED', 'Mật khẩu cần ít nhất 12 ký tự.'))
  const raw = {
    id: `user-${Date.now()}`,
    displayName: input.displayName.trim(),
    email,
    role: 'CUSTOMER',
    active: true,
    mockPassword: input.password,
  }
  registered.push(raw)
  const { mockPassword: _pw, ...user } = raw
  return wait({ ...user, role: 'CUSTOMER' as const })
}

export function login(email: string, password: string): Promise<Session> {
  const raw = allUsers().find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.mockPassword === password,
  )
  if (!raw)
    return Promise.reject(
      new ApiRequestError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.'),
    )
  const { mockPassword: _pw, ...rest } = raw
  const user = { ...rest, role: rest.role as User['role'] }
  return wait({
    accessToken: `mock-token-${user.id}-0123456789abcdef0123456789`,
    tokenType: 'Bearer',
    expiresAt: addMinutes(new Date().toISOString(), 60),
    user,
  })
}
