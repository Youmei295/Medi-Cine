# MEDI-CINE - API guide

This guide describes the proposed API. UC17 and UC20 are optional. OpenAPI is the authoritative source for machine-readable schemas and HTTP examples. Operation IDs connect the guide, traceability, and scenarios. The decision log records source precedence and open policies. See [openapi.yaml](openapi.yaml), [DECISIONS.md](DECISIONS.md), and [STATE_AND_EVENTS.md](STATE_AND_EVENTS.md).

## Transport, values, and validation

The base path is /api/v1 over HTTPS with UTF-8 JSON. Strict schemas reject unknown body fields with 422. Malformed JSON or header syntax returns 400. IDs are opaque and case-sensitive and follow `[A-Za-z0-9][A-Za-z0-9_-]{2,63}`. Do not infer ordering or personal data from an ID. Only explicitly nullable fields accept null. In PATCH requests, omitting an optional field preserves its current value. The versioned Admin PATCH operations (MovieUpdate, RoomUpdate, ShowtimeUpdate, PriceRuleUpdate, and PromotionUpdate) require expectedVersion and at least one other field. A stale version returns 409 VERSION_CONFLICT and commits no partial update. Providing the current value may be a no-op under the relevant operation rules. ProfileInput has its own unversioned policy below. Request schemas specify types, bounds, and required fields. Core operations accept no arbitrary status, role, or customerId assignments. ADR-11 and Q-06 describe the proposed limits. Configured limits may be lower than schema maxima. An input above a configured limit returns 422 LIMIT_EXCEEDED without truncation.

Use integer VND. For a percentage discount in basis points calculate floor((subtotal*bps + 5000)/10000) once for the booking, then cap it at maxDiscount and subtotal. Allocate the rounded amount proportionally by largest remainder, with seatId ascending to break ties. Use one code per booking and revalidate before confirmation. Preserve the finalized amount. Zero returns 422 ZERO_PAYABLE_UNSUPPORTED. A positive amount below the active gateway minimum returns 422 PAYMENT_BELOW_GATEWAY_MINIMUM. The published VNPAY minimum is 5,000 VND. Check for a merchant-specific limit before enabling payment.

Timestamps use RFC 3339 with an offset. Responses use UTC with the Z suffix. The cinema UI uses Asia/Ho_Chi_Minh and the date filter uses that local calendar date. Report intervals are half-open [from,to) instant ranges. The server clock determines expiry. A hold expires when now >= expiresAt. Responses give serverTime, expiresAt, and remainingSeconds=max(0,floor((expiresAt-now)/1s)). The client countdown is informational. The configurable hold TTL defaults to 600 seconds. Quoting, booking creation, payment, and retries never extend it. Quote expiry cannot exceed the hold expiry or the configured quote TTL. A change in current price or pricing version can invalidate a quote before expiresAt.

Collection cursors are opaque and bound to the filters, sort order, and user where applicable. The limit defaults to 20 and accepts 1 through 100. A total count is not guaranteed. An empty collection returns 200 with an empty items array and nextCursor=null. The default order is createdAt descending, then id descending. Showtime lists use startsAt ascending, then id ascending. Each cursor uses the corresponding sort tuple. The API accepts no arbitrary sort parameter. Unsupported query input returns 400 INVALID_QUERY. A malformed or foreign cursor returns 400 INVALID_CURSOR. listBookingTickets returns every ticket for a single booking, up to 20, with nextCursor=null and no pagination request. Movie search matches a trimmed, case-insensitive title substring. Genre matches a configured value exactly, ignoring case. The status enum defaults to all active statuses when omitted. Showtime date, format, movie, and room filters intersect. Public showtimes must be active and bookable, while Staff and Admin can see additional states. Empty search returns 400, and omitting it clears the filter. Booking history tests the status enum exactly. Notification read=true or read=false filters readAt. Omit read to include both. Reports require from and to with from<to and a proposed maximum range of 366 days. Report filters intersect, and groupBy defaults to DAY.

## Authentication and authorization

Provision Admin and Staff through deployment configuration. Staff may view admission showtimes, look up tickets, and preview or confirm admission. An Admin needs an independent SHOWTIME_CANCEL grant to preview cancellation impact or cancel a showtime. REFUND_APPROVE is a separate audited permission for internal refund authorization. Neither grant implies the other. Record actor, action, permission result, target, time, and correlation ID. Deployment configuration and refund approval have no public API in this revision.

`registerCustomer` creates CUSTOMER only; login is separate. `login` returns opaque bearer `accessToken`, `expiresAt`, User; Authorization header `Bearer <opaque>`. Expiry policy configurable (example8h PROPOSED); token digest server-side, revoke checked each protected request. Logout deletes active server session then clears client state; expired/revoked retry401 also clears local state. Credentials update requires old password, then revokes all sessions including current; re-login. No refresh/password-reset/admin-impersonation endpoints inferred. DisplayName/email/password policy schemas are proposal; passwords never returned/logged, credential examples synthetic.

RBAC and ownership checked independently. CUSTOMER does not call staff/admin endpoints. ADMIN can staff operations per UCS §12.4.1 PDF p45, §19.3.3 p63; ADMIN **does not inherit** Customer personal purchase/profile/review/notification APIs. Any authenticated role may session introspect/logout. Unauthenticated401; wrong role403 before resource lookup. Right Customer role but foreign/missing owned resource404 RESOURCE_NOT_FOUND indistinguishable; no QR, owner ID or other customer's seat hold details. CustomerId never accepted for /me/core create; identity from session. Staff sees only minimum ticket metadata, no Customer private account/payment details.

Permission matrix below is per operation, derived from `x-roles` in OpenAPI; Public means any visitor without authentication required, Provider is separate authenticity path, never Customer bearer. UC sources and specific guards are in each operation section.

| OperationId | Public | Customer | Staff | Admin | Provider | Ownership |
| --- | --- | --- | --- | --- | --- | --- |
| `getCapabilities` | yes | - | - | - | - | NONE |
| `listMovies` | yes | - | - | - | - | NONE |
| `getMovie` | yes | - | - | - | - | NONE |
| `listShowtimes` | yes | - | - | - | - | NONE |
| `getShowtime` | yes | - | - | - | - | NONE |
| `getSeatMap` | yes | - | - | - | - | NONE |
| `registerCustomer` | yes | - | - | - | - | NONE |
| `login` | yes | - | - | - | - | NONE |
| `getSession` | - | yes | yes | yes | - | NONE |
| `logout` | - | yes | yes | yes | - | NONE |
| `getProfile` | - | yes | - | - | - | SELF |
| `updateProfile` | - | yes | - | - | - | SELF |
| `updateCredentials` | - | yes | - | - | - | SELF |
| `createHold` | - | yes | - | - | - | SELF |
| `getHold` | - | yes | - | - | - | SELF |
| `releaseHold` | - | yes | - | - | - | SELF |
| `createQuote` | - | yes | - | - | - | SELF |
| `createBooking` | - | yes | - | - | - | SELF |
| `listBookings` | - | yes | - | - | - | SELF |
| `getBooking` | - | yes | - | - | - | SELF |
| `initiatePayment` | - | yes | - | - | - | SELF |
| `getPayment` | - | yes | - | - | - | SELF |
| `receivePaymentWebhook` | - | - | - | - | yes | NONE |
| `listBookingTickets` | - | yes | - | - | - | SELF |
| `getTicket` | - | yes | - | - | - | SELF |
| `downloadTicket` | - | yes | - | - | - | SELF |
| `getTicketQrImage` | - | yes | - | - | - | SELF |
| `listAdmissionShowtimes` | - | - | yes | yes | - | NONE |
| `lookupTicket` | - | - | yes | yes | - | NONE |
| `previewAdmission` | - | - | yes | yes | - | NONE |
| `confirmAdmission` | - | - | yes | yes | - | NONE |
| `listAdminMovies` | - | - | - | yes | - | NONE |
| `createMovie` | - | - | - | yes | - | NONE |
| `getAdminMovie` | - | - | - | yes | - | NONE |
| `updateMovie` | - | - | - | yes | - | NONE |
| `listAdminRooms` | - | - | - | yes | - | NONE |
| `createRoom` | - | - | - | yes | - | NONE |
| `getAdminRoom` | - | - | - | yes | - | NONE |
| `updateRoom` | - | - | - | yes | - | NONE |
| `listAdminShowtimes` | - | - | - | yes | - | NONE |
| `createShowtime` | - | - | - | yes | - | NONE |
| `getAdminShowtime` | - | - | - | yes | - | NONE |
| `updateShowtime` | - | - | - | yes | - | NONE |
| `listAdminPriceRules` | - | - | - | yes | - | NONE |
| `createPriceRule` | - | - | - | yes | - | NONE |
| `getAdminPriceRule` | - | - | - | yes | - | NONE |
| `updatePriceRule` | - | - | - | yes | - | NONE |
| `listAdminPromotions` | - | - | - | yes | - | NONE |
| `createPromotion` | - | - | - | yes | - | NONE |
| `getAdminPromotion` | - | - | - | yes | - | NONE |
| `updatePromotion` | - | - | - | yes | - | NONE |
| `replaceRoomLayout` | - | - | - | yes | - | NONE |
| `getCancellationImpact` | - | - | - | yes | - | NONE |
| `cancelShowtime` | - | - | - | yes | - | NONE |
| `getDashboard` | - | - | - | yes | - | NONE |
| `getReport` | - | - | - | yes | - | NONE |
| `listMovieReviews` | yes | - | - | - | - | NONE |
| `submitMovieReview` | - | yes | - | - | - | SELF |
| `getReviewEligibility` | - | yes | - | - | - | SELF |
| `listNotifications` | - | yes | - | - | - | SELF |
| `getNotification` | - | yes | - | - | - | SELF |
| `markNotificationRead` | - | yes | - | - | - | SELF |
| `askAssistant` | yes | - | - | - | - | NONE |
| `createPushSubscription` | - | yes | - | - | - | SELF |
| `deletePushSubscription` | - | yes | - | - | - | SELF |
| `getAdminPayment` | - | - | - | yes | - | NONE |


## HTTP errors, retries, and idempotency

Error common: `{code,message,details:[{field,reason}],requestId,context?}`. No stack/secret/owner leak; X-Request-Id on every response, no private values in trace ID. Codes are stable, message can localize; client branches by code. 400 parse/query/header shape; 401 invalid/expired login or provider authenticity; 403 authenticated role/policy/eligibility denial; 404 absent or concealed ownership; 409 concurrent/domain/state/version/stale quote; 422 typed field/cross-field/business input invalid; 429 rate with Retry-After; 502/504 upstream transport may be normalized to declared503 SERVICE_UNAVAILABLE/PROVIDER_UNAVAILABLE/AI_UNAVAILABLE, never a domain success. Unexpected500 must use same Error shape, retry only with safe operation semantics. Explicit operation responses list applicable errors; no requirement to return every status everywhere. Preview validation domain invalid is 200 result=INVALID; confirm rejection is 409. Empty collections are successful.

Every request to an operation marked REQUIRED in OpenAPI must include Idempotency-Key. This applies to the first request and to retries. The key is 16 to 128 ASCII characters. Its scope is **authenticated actor ID + operationId**. The public registration scope is normalized email + operationId; public requests never cross-user replay. Retain completed response/status/headers (except fresh request trace) >=24h from first acceptance PROPOSED. Fingerprint method+canonical path params+body including expectedVersion, excludes token/trace; same scope key+different fingerprint409 IDEMPOTENCY_KEY_REUSED, concurrent processing409 IDEMPOTENCY_IN_PROGRESS with retryAfterSeconds/Retry-After. First writer owns key; same completed fingerprint returns exact original status/body plus optional Idempotency-Replayed:true; failure before execution can retry, deterministic post-execution rejection cached, 5xx/unknown only replay after outcome reconciled. Same-actor duplicate booking/payment/admission under **new key** follows domain reuse200, distinct from same-key exact replay201/202. No retry extends TTL or recomputes a committed price.

24h expiry only retry record: never removes unique booking/hold, payment/booking, ticket/booking-seat, review/customer-movie, admission/ticket, attempt/actor rules. After HTTP key expires, read resource/domain state before repeat. Reusing a hold with terminal booking cannot create a new one409 HOLD_ALREADY_CONSUMED. Different-key createBooking with existing PENDING reuses that booking even stale old quote; changed quote for already committed booking cannot silently reprice. Other active holds belong to one authenticated session plus customer; sessions of same customer may retrieve their holds, but no transfer to another customer; logout cannot extend hold, expiry still releases.

GET safe retry and no operational state mutation. `lookupTicket`/`previewAdmission` POST are read-only and safe repeat, no key required. Login creates a new session on retry; client disposes old token, rate-limited. PUT mark-read idempotent first readAt, DELETE subscription/release idempotent where domain guard permits. RetryAfterSeconds for polling example3s PROPOSED, exponential backoff up to30s, cease payment initiation at expiry and inspect status. Financial unknown never resubmit as a new purchase. Client network failure cannot prove server rollback; read/get or same key retry before any new intent.

## Core workflow and safeguards

Public movie/showtime/seat reads do not hold; client highlight/deselect only updates local UI. `createHold` Customer atomically holds entire selection, conflict returns conflictingSeatIds only, owner hidden. `createQuote` current prices+promo, immutable quote, original+discount+total. Changing/removing code creates a new quote with promotionCode or null. Invalid/ineligible promo422 leaves base price, never applies discount; service503 allows retry or explicit new quote null. `createBooking` requires user confirmation of returned current quote. Expired quote409 QUOTE_EXPIRED; price/promo-version mismatch409 QUOTE_STALE with currentQuote where available (valid replacement without invalid code), or context.reason explaining rejected promo. UI MUST show changed amount/promo and get explicit confirmation with new quoteId; no automatic silent retry acceptance. If quote generation unavailable,503, hold remains until original deadline. Quote/version check and booking commit atomic relative to pricing/promotion version selection.

PENDING booking holds HELD seats and snapshot price, no valid ticket. Price/promo changes later affect future quotes, never PENDING/SUCCESS snapshot (UCS §10.2.2.3 p39, §15.2.2.3 p52). `initiatePayment`, redirect client navigation, provider inbound callback, owner status query and internal reconciliation are separate steps. `listBookingTickets` returns202 while SUCCESS issuance pending; `getBooking` shows same issuance state. Binary PDF/PNG owner-protected no-store; historical USED ticket download changes no usage. Detailed race/recovery contract is in STATE_AND_EVENTS, including late money without seat sale.

Admin movie duration edit recalculates affected occupied intervals (duration+cleaning) in room serialization, rejects overlap409. Deactivate hides from new scheduling but preserves existing active showtimes/historical snapshots; public currently inactive movie returns404, existing owner's bookings stay accessible. No hard-delete contract. Room create auto grid; layout replacement validates unique IDs/coordinates/labels and bounds. Block structural/type/status/room format/deactivation while active referenced shows exist (conservative proposal); cancel/reschedule unbooked shows first, never rewrite sold/history capacity. Room rows*columns config cap10000 and held purchase cap20 are proposals, cinema scale15-20 rooms is target not cap.

Showtime future startsAt, active compatible room/movie, server derives format/end/occupiedUntil and configured cleaning interval, no client price/end overrides. Occupied room interval `[startsAt,endsAt+cleaningMinutes)`; adjacent start exactly occupiedUntil allowed, less conflicts. Serialize overlap check/create/update/duration edits per room. Cleaning defaults to 15 minutes. An invalid stored setting returns 422 CLEANING_INTERVAL_UNCONFIGURED. Pricing rule unique seatType/category; active showtime cannot open bookable seats without valid price. Mapping category assignment explicit Admin, never inferred client-side timezone. Reschedule with HELD/SOLD blocked409; cancellation requires current impact warning/confirmation and works with HELD/SOLD (UCS §9.2.2.3 p36). Eligible paid cancellations enter the authorized full-refund queue.

Reviews require own SUCCESS booking and >=1 USED ticket for the **same movie** (UCS §§14.2.2.1/14.3.1 pp49-50); unused paid ticket alone ineligible. Duplicate per Customer/movie409, no update policy endpoint chosen. Public response reveals displayName/rating/text only. Display sanitized/escaped; reject control/invalid text per documented limits, plain text only.

## Reporting formulas (PROPOSED time basis, source semantics preserved)

UCS §13.2.1/.2 pp47-48, SAD §4.11 pp35-36. Consistent asOf snapshot. Scope uses showtime.startsAt in `[from,to)` and optional movie/room/showtime filters; this aligns revenue, sold and capacity into one **showtime-cohort** report, not a settlement-date ledger (time basis PROPOSED, confirm with finance). DAY group uses Asia/Ho_Chi_Minh showtime date. No payment-created-date filter silently mixed with capacity date.

- Report integer VND amounts per showtime cohort at asOf. collectedAmount sums verified collections once per payment, including late collections. refundedAmount sums only provider-confirmed full refunds. pendingAmount sums unresolved collection attempts, including conflicts without a verified collection. pendingRefundAmount tracks verified collections awaiting refund approval or a confirmed refund result. It overlaps collectedAmount until resolution and must not be added to it. Keep revenue as historical booked sales for compatible analytics.
- TicketsSold = count SOLD booking seat items for qualifying SUCCESS paid bookings, including ticket issuance still pending; one item/seat, not callback count or HTTP request count.
- SoldSeats = same seat-item count for cohort; Admissions = count distinct ticket IDs with USED/auditable successful admission. Retries not another admission. Cancelled future shows retain sold/history evidence per Q-03; used admissions not erased.
- Capacity = sum historical active-seat capacity snapshot at activation for cohort showtimes (exclude out-of-service seats), once per showtime; cancelled showtimes retained for cohort history, DRAFT not counted. OccupancyPercent = capacity==0 ? 0 : 100*soldSeats/capacity; admissionPercent = capacity==0 ? 0 : 100*admissions/capacity. Rounded two decimal places half-up proposal, distinguish sale from physical attendance.
- ActiveShowtimes = count status ACTIVE in same cohort at asOf. Empty cohort returns all zeros/rows=[]; report never divides by zero. Invalid date/filter400, no state mutation. ADMIN only, Staff403.

## Public layout and update rules

`getSeatMap` exposes rows, columns, screenPosition, and each seat's row and number in the versioned layout snapshot. The proposed coordinates start at 1. Row 1 is nearest the screen. Rows increase toward the back, and seat numbers increase from left to right while facing the screen. Display labels are arbitrary. A missing position is a gap or aisle. OUT_OF_SERVICE seats retain their coordinates with null state and price. Render positions from coordinates alone. A geometry change requires a new layoutVersion. WSS sends resync_required with LAYOUT_CHANGED, and the client fetches a complete snapshot again. The geometryWithAisle example uses two rows, an aisle in column 2, and the labels Blue, Moon, Leaf, and Sun. Leaf is out of service. Its separate fixture is shw_geometry_01.

The proposed updateProfile policy is last successful commit wins. A valid body includes only displayName, for example {"displayName":"New Name"}, and the request must carry Idempotency-Key. Profile updates use neither expectedVersion nor User.version. Concurrent edits under different keys can both return 200. A subsequent GET reads the latest committed name. A matching key and fingerprint replay the original response, which may be historical after a later edit. Supplying expectedVersion returns 422 for an unknown field. The session token identifies the owner, and this operation changes displayName only. Credential updates use a separate PUT with an old-password check and session revocation.

`updateShowtime` controls every mutable field: movieId/roomId/startsAt/pricingCategory effective changes only on DRAFT/ACTIVE and **no HELD or SOLD allocations**; otherwise409 SHOWTIME_HAS_RESERVATIONS. An unchanged value is no-op, no inventory reset/history rewrite. Input status supports ACTIVE only: DRAFT->ACTIVE validated activation; ACTIVE->ACTIVE no-op/safe unreserved edit, never demotion. status=DRAFT rejected422 VALIDATION_ERROR, even without reservations. CANCELLED/COMPLETED source states reject every edit or ACTIVE request409 SHOWTIME_TERMINAL. Valid edits recheck active/format-compatible references, future time, configured prices/cleaning, room overlap and version-bound layout; changing unreserved room replaces inventory projection with new layout/version, not appending old seats. Admin-only expectedVersion checked together with guards under showtime/room serialization; concurrent hold/payment/admission/cancel cannot slip between guard and commit. `cancelShowtime` remains sole explicit warned/confirmed cancellation. No terminal resurrection workflow proposed.

## Operation reference

All operations below carry source locator, role/ownership, preconditions/effects/retry rules. Exact request fields/types/required/null/defaults and media examples remain in linked OpenAPI, avoiding duplicated schemas. Public/source references are relative to repository root. Schema names and per-status examples are directly searchable in YAML.

### getCapabilities

Method and path: `GET /api/v1/capabilities`. Use cases: supporting only.

Sources: PROPOSED supporting: UC17 §17.2.2.3 PDF p57, UC20 §20.4 PDF pp66-67; Public feature flags and hold settings with no secrets..

Access: PUBLIC. Ownership: NONE.

Expose configured age ratings and the current hold TTL, which defaults to 600 seconds. Read-only

See [OpenAPI](openapi.yaml) for request fields and examples.

| Status | Result |
| --- | --- |
| 200 | The operation succeeds without changing domain state. |
| 503 | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

### listMovies

`GET /api/v1/movies` — **PROPOSED**. UC: UC01.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §1.2-1.5; PDF pp11-12.

Security/ownership: PUBLIC / NONE. Preconditions: Apply the role and input schema requirements. Where the request supplies an ID, the target resource must exist.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: query `limit` (optional), query `cursor` (optional), query `search` (optional), query `genre` (optional), query `status` (optional). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / MoviePage | The operation succeeds without changing domain state. |
| 400 | application/json / Error | INVALID_QUERY / INVALID_CURSOR |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./movies.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### getMovie

`GET /api/v1/movies/{movieId}` — **PROPOSED**. UC: UC01.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §1.2-1.5; PDF pp11-12.

Security/ownership: PUBLIC / NONE. Preconditions: Only active movies are public. An INACTIVE movie returns 404.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: path `movieId` (required). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / Movie | The operation succeeds without changing domain state. |
| 404 | application/json / Error | MOVIE_NOT_FOUND. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./movies/{movieId}.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### listShowtimes

`GET /api/v1/showtimes` — **PROPOSED**. UC: UC01.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §1.2-1.5; PDF pp11-12.

Security/ownership: PUBLIC / NONE. Preconditions: Only ACTIVE showtimes still accepting bookings are returned. If none remain, return items=[]. Interpret date in Asia/Ho_Chi_Minh.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: query `limit` (optional), query `cursor` (optional), query `movieId` (optional), query `roomId` (optional), query `date` (optional), query `format` (optional). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / ShowtimePage | The operation succeeds without changing domain state. |
| 400 | application/json / Error | INVALID_QUERY / INVALID_CURSOR |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./showtimes.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### getShowtime

`GET /api/v1/showtimes/{showtimeId}` — **PROPOSED**. UC: UC01, UC02.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §1.2-1.5; PDF pp11-12; pa/pa3/Use_Case_Specification_v1.1.pdf §2.2-2.5; PDF pp13-15.

Security/ownership: PUBLIC / NONE. Preconditions: Public access is limited to ACTIVE showtimes. The server supplies the time and format.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: path `showtimeId` (required). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / Showtime | The operation succeeds without changing domain state. |
| 404 | application/json / Error | SHOWTIME_NOT_FOUND. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./showtimes/{showtimeId}.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### getSeatMap

`GET /api/v1/showtimes/{showtimeId}/seats` — **PROPOSED**. UC: UC02.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §2.2-2.5; PDF pp13-15.

Security/ownership: PUBLIC / NONE. Preconditions: The snapshot is authoritative. For OUT_OF_SERVICE seats, state=null. The response omits owner and hold IDs. See STATE_AND_EVENTS.md for WSS resynchronization. Public layout includes rows/columns/screenPosition and per-seat row/number bound to layoutVersion; gaps absent, labels arbitrary, no Admin API required.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: path `showtimeId` (required). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / SeatMap | The operation succeeds without changing domain state. |
| 404 | application/json / Error | SHOWTIME_NOT_FOUND. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./showtimes/{showtimeId}/seats.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### registerCustomer

`POST /api/v1/auth/registrations` — **PROPOSED**. UC: UC06.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §6.2-6.5; PDF pp26-28.

Security/ownership: PUBLIC / NONE. Preconditions: Apply the role and input schema requirements. Where the request supplies an ID, the target resource must exist.

Effects: Creates a CUSTOMER account. Login is a separate operation. Supplying a role returns 422. Retry: REQUIRED; Follow the retry and domain rules above.

Parameters: header `Idempotency-Key` (required). Body: `RegisterInput`.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 201 | application/json / User | Creates a CUSTOMER account. Login is a separate operation. Supplying a role returns 422. |
| 409 | application/json / Error | ACCOUNT_EXISTS. The response never reports an unverified success. |
| 429 | application/json / Error | RATE_LIMITED. The response never reports an unverified success. |
| 400 | application/json / Error | MALFORMED_REQUEST. The response never reports an unverified success. |
| 422 | application/json / Error | VALIDATION_ERROR / LIMIT_EXCEEDED |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./auth/registrations.post` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### login

`POST /api/v1/auth/sessions` — **PROPOSED**. UC: UC06.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §6.2-6.5; PDF pp26-28.

Security/ownership: PUBLIC / NONE. Preconditions: Apply the role and input schema requirements. Where the request supplies an ID, the target resource must exist.

Effects: Creates an expiring opaque bearer session. Invalid credentials and inactive accounts return the same error. The session has no refresh token. Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: none. Body: `LoginInput`.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / Session | Creates an expiring opaque bearer session. Invalid credentials and inactive accounts return the same error. The session has no refresh token. |
| 401 | application/json / Error | INVALID_CREDENTIALS. The response never reports an unverified success. |
| 429 | application/json / Error | RATE_LIMITED. The response never reports an unverified success. |
| 400 | application/json / Error | MALFORMED_REQUEST. The response never reports an unverified success. |
| 422 | application/json / Error | VALIDATION_ERROR / LIMIT_EXCEEDED |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./auth/sessions.post` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### getSession

`GET /api/v1/auth/session` — **PROPOSED**. UC: UC06.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §6.2-6.5; PDF pp26-28.

Security/ownership: CUSTOMER, STAFF, ADMIN / NONE. Preconditions: Apply the role and input schema requirements. Where the request supplies an ID, the target resource must exist.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: none. Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / SessionInfo | The operation succeeds without changing domain state. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./auth/session.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### logout

`DELETE /api/v1/auth/session` — **PROPOSED**. UC: UC06.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §6.2-6.5; PDF pp26-28.

Security/ownership: CUSTOMER, STAFF, ADMIN / NONE. Preconditions: Apply the role and input schema requirements. Where the request supplies an ID, the target resource must exist.

Effects: The server immediately revokes the current token. Retrying with the revoked token returns 401. The client clears local session state in either case. Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: none. Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 204 |  | The server immediately revokes the current token. Retrying with the revoked token returns 401. The client clears local session state in either case. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./auth/session.delete` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### getProfile

`GET /api/v1/me/profile` — **PROPOSED**. UC: UC06.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §6.2-6.5; PDF pp26-28.

Security/ownership: CUSTOMER / SELF. Preconditions: Apply the role and input schema requirements. Where the request supplies an ID, the target resource must exist.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: none. Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / User | The operation succeeds without changing domain state. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./me/profile.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### updateProfile

`PATCH /api/v1/me/profile` — **PROPOSED**. UC: UC06.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §6.2-6.5; PDF pp26-28.

Security/ownership: CUSTOMER / SELF. Preconditions: Apply the role and input schema requirements. Where the request supplies an ID, the target resource must exist.

Effects: Updates displayName only. Email, role, and activation status are unchanged by the operation. Retry: REQUIRED; Follow the retry and domain rules above.

Parameters: header `Idempotency-Key` (required). Body: `ProfileInput`.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / User | Updates displayName only. Email, role, and activation status are unchanged by the operation. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | application/json / Error | MALFORMED_REQUEST. The response never reports an unverified success. |
| 422 | application/json / Error | VALIDATION_ERROR / LIMIT_EXCEEDED |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |
| 409 | application/json / Error | Retry/domain conflict |

Find the applicable examples under `paths./me/profile.patch` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### updateCredentials

`PUT /api/v1/me/credentials` — **PROPOSED**. UC: UC06.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §6.2-6.5; PDF pp26-28.

Security/ownership: CUSTOMER / SELF. Preconditions: Apply the role and input schema requirements. Where the request supplies an ID, the target resource must exist.

Effects: Verifies currentPassword and revokes all sessions after the update. The user must log in again. Retry: REQUIRED; Follow the retry and domain rules above.

Parameters: header `Idempotency-Key` (required). Body: `CredentialInput`.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 204 |  | Verifies currentPassword and revokes all sessions after the update. The user must log in again. |
| 403 | application/json / Error | CURRENT_PASSWORD_INVALID. The response never reports an unverified success. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 400 | application/json / Error | MALFORMED_REQUEST. The response never reports an unverified success. |
| 422 | application/json / Error | VALIDATION_ERROR / LIMIT_EXCEEDED |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |
| 409 | application/json / Error | Retry/domain conflict |

Find the applicable examples under `paths./me/credentials.put` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### createHold

`POST /api/v1/seat-holds` — **PROPOSED**. UC: UC02.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §2.2-2.5; PDF pp13-15.

Security/ownership: CUSTOMER / SELF. Preconditions: All seats must belong to the same ACTIVE showtime, have ACTIVE configuration, and be authoritatively AVAILABLE. The bearer session identifies the owner.

Effects: Moves all selected seats from AVAILABLE to HELD atomically. Retries never extend the original hold expiry. Retry: REQUIRED; Follow the retry and domain rules above.

Parameters: header `Idempotency-Key` (required). Body: `HoldInput`.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 201 | application/json / Hold | Moves all selected seats from AVAILABLE to HELD atomically. Retries never extend the original hold expiry. |
| 409 | application/json / Error | SEAT_CONFLICT / SHOWTIME_CLOSED / PRICING_UNAVAILABLE. The response never reports an unverified success. |
| 404 | application/json / Error | SHOWTIME_NOT_FOUND. The response never reports an unverified success. |
| 429 | application/json / Error | RATE_LIMITED. The response never reports an unverified success. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | application/json / Error | MALFORMED_REQUEST. The response never reports an unverified success. |
| 422 | application/json / Error | VALIDATION_ERROR / LIMIT_EXCEEDED |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./seat-holds.post` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### getHold

`GET /api/v1/seat-holds/{holdId}` — **PROPOSED**. UC: UC02, UC03.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §2.2-2.5; PDF pp13-15; pa/pa3/Use_Case_Specification_v1.1.pdf §3.2-3.5; PDF pp16-19.

Security/ownership: CUSTOMER / SELF. Preconditions: Owner only. Returns serverTime, expiresAt, and remainingSeconds. Reading neither creates nor extends the hold.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: path `holdId` (required). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / Hold | The operation succeeds without changing domain state. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 404 | application/json / Error | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./seat-holds/{holdId}.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### releaseHold

`DELETE /api/v1/seat-holds/{holdId}` — **PROPOSED**. UC: UC02, UC03.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §2.2-2.5; PDF pp13-15; pa/pa3/Use_Case_Specification_v1.1.pdf §3.2-3.5; PDF pp16-19.

Security/ownership: CUSTOMER / SELF. Preconditions: Only the owner can release a hold with no booking. Retrying after release or expiry has no effect. UC03 cancellation here occurs before booking creation.

Effects: Moves the hold from ACTIVE to RELEASED. Releases only seats still assigned to that hold and leaves SOLD seats intact. Retry: REQUIRED; Follow the retry and domain rules above.

Parameters: path `holdId` (required), header `Idempotency-Key` (required). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 204 |  | Moves the hold from ACTIVE to RELEASED. Releases only seats still assigned to that hold and leaves SOLD seats intact. |
| 409 | application/json / Error | HOLD_HAS_BOOKING / HOLD_CONSUMED. The response never reports an unverified success. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 404 | application/json / Error | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./seat-holds/{holdId}.delete` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### createQuote

Method and path: `POST /api/v1/seat-holds/{holdId}/quotes`. Use cases: UC03, UC18.

Sources: pa/pa3/Use_Case_Specification_v1.1.pdf §3.2-3.5; PDF pp16-19 | pa/pa3/Use_Case_Specification_v1.1.pdf §18.2-18.5; PDF pp59-61.

Access: CUSTOMER. Ownership: SELF.

Requires an active hold owned by the caller. Use promotionCode=null to remove the code. Quotes are immutable and do not extend the hold. Use one code per booking. Calculate percentage discounts in integer basis points and round the booking-level discount once to the nearest dong, half up, before applying caps. Reject zero and totals below the gateway minimum. Revalidate before committing the booking and preserve the finalized amount thereafter. Calculates current prices and discounts on the server without creating a booking or payment. An invalid code leaves the existing quote intact. The client must discard the discounted total and request a quote with promotionCode=null before confirmation. Each request requires Idempotency-Key. Reuse it for exact retries.

See [OpenAPI](openapi.yaml) for request fields and examples.

| Status | Result |
| --- | --- |
| 201 | Calculates current prices and discounts on the server without creating a booking or payment. An invalid code leaves the existing quote intact. The client must discard the discounted total and request a quote with promotionCode=null before confirmation. |
| 409 | HOLD_EXPIRED / HOLD_HAS_BOOKING. The response never reports an unverified success. |
| 422 | PROMOTION_INVALID / PROMOTION_INELIGIBLE / ZERO_PAYABLE_UNSUPPORTED / LIMIT_EXCEEDED / PAYMENT_BELOW_GATEWAY_MINIMUM |
| 503 | PROMOTION_SERVICE_UNAVAILABLE / SERVICE_UNAVAILABLE. The response never reports an unverified success. |
| 401 | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 404 | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 400 | MALFORMED_REQUEST. The response never reports an unverified success. |

### createBooking

Method and path: `POST /api/v1/bookings`. Use cases: UC03.

Sources: pa/pa3/Use_Case_Specification_v1.1.pdf §3.2-3.5; PDF pp16-19.

Access: CUSTOMER. Ownership: SELF.

The caller must own the hold, and the quote must belong to that hold and be current and unexpired. A matching PENDING booking for the same hold returns 200 with its original snapshot even under a different key. Use one code per booking. Calculate percentage discounts in integer basis points and round the booking-level discount once to the nearest dong, half up, before applying caps. Reject zero and totals below the gateway minimum. Revalidate before committing the booking and preserve the finalized amount thereafter. Creates a PENDING booking with paymentStatus=null and issuance NOT_REQUESTED. The seats remain HELD and the price becomes fixed at booking commit. Each request requires Idempotency-Key. Reuse it for exact retries.

See [OpenAPI](openapi.yaml) for request fields and examples.

| Status | Result |
| --- | --- |
| 201 | Creates a PENDING booking with paymentStatus=null and issuance NOT_REQUESTED. The seats remain HELD and the price becomes fixed at booking commit. |
| 404 | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 409 | HOLD_EXPIRED / QUOTE_EXPIRED / QUOTE_STALE / HOLD_ALREADY_CONSUMED. The response never reports an unverified success. |
| 503 | SERVICE_UNAVAILABLE. The response never reports an unverified success. |
| 401 | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | MALFORMED_REQUEST. The response never reports an unverified success. |
| 422 | VALIDATION_ERROR / ZERO_PAYABLE_UNSUPPORTED / LIMIT_EXCEEDED / PAYMENT_BELOW_GATEWAY_MINIMUM |
| 200 | A duplicate or retry returns the existing resource without creating a second one. |

### listBookings

`GET /api/v1/me/bookings` — **PROPOSED**. UC: UC11.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §11.2-11.5; PDF pp41-43.

Security/ownership: CUSTOMER / SELF. Preconditions: Owner only. Sort by createdAt descending, then id descending. The read neither expires nor modifies records.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: query `limit` (optional), query `cursor` (optional), query `status` (optional). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / BookingPage | The operation succeeds without changing domain state. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | application/json / Error | INVALID_QUERY / INVALID_CURSOR |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./me/bookings.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### getBooking

`GET /api/v1/bookings/{bookingId}` — **PROPOSED**. UC: UC03, UC04, UC11.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §3.2-3.5; PDF pp16-19; pa/pa3/Use_Case_Specification_v1.1.pdf §4.2-4.5; PDF pp20-22; pa/pa3/Use_Case_Specification_v1.1.pdf §11.2-11.5; PDF pp41-43.

Security/ownership: CUSTOMER / SELF. Preconditions: Owner only. Returns the latest state. Zero remaining time does not authorize the browser to change the status.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: path `bookingId` (required). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / Booking | The operation succeeds without changing domain state. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 404 | application/json / Error | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./bookings/{bookingId}.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### initiatePayment

Method and path: `POST /api/v1/bookings/{bookingId}/payments`. Use cases: UC04.

Sources: pa/pa3/Use_Case_Specification_v1.1.pdf §4.2-4.5; PDF pp20-22.

Access: CUSTOMER. Ownership: SELF.

Requires a PENDING booking and a live hold owned by the caller. Each booking has one logical payment even across different keys. The server configures the return URL and accepts no return URL from the client. Requires verified merchant sandbox setup. Use the finalized amount in integer VND and validate the active gateway minimum. The browser return only displays status. Confirm through verified IPN or QueryDr. Persist PENDING before calling the provider. Return 201 for a READY session or 202 with CREATING or UNAVAILABLE when session creation is uncertain. Reuse providerReference on retry. Each request requires Idempotency-Key. Reuse it for exact retries.

See [OpenAPI](openapi.yaml) for request fields and examples.

| Status | Result |
| --- | --- |
| 201 | Persist PENDING before calling the provider. Return 201 for a READY session or 202 with CREATING or UNAVAILABLE when session creation is uncertain. Reuse providerReference on retry. |
| 409 | BOOKING_NOT_PENDING / HOLD_EXPIRED. The response never reports an unverified success. |
| 503 | PROVIDER_UNAVAILABLE / SERVICE_UNAVAILABLE / PAYMENT_SANDBOX_UNAVAILABLE |
| 401 | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 404 | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 400 | MALFORMED_REQUEST. The response never reports an unverified success. |
| 422 | VALIDATION_ERROR / LIMIT_EXCEEDED / PAYMENT_BELOW_GATEWAY_MINIMUM |
| 200 | A duplicate or retry returns the existing resource without creating a second one. |
| 202 | Session creation is uncertain. Poll getPayment. Do not initiate another transaction. Any retry must reuse the same logical payment. |

### getPayment

`GET /api/v1/payments/{paymentId}` — **PROPOSED**. UC: UC04.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §4.2-4.5; PDF pp20-22.

Security/ownership: CUSTOMER / SELF. Preconditions: Ownership is checked through the booking. The persisted status is authoritative regardless of the browser redirect.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: path `paymentId` (required). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / Payment | The operation succeeds without changing domain state. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 404 | application/json / Error | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./payments/{paymentId}.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### receivePaymentWebhook

Method and path: `GET /api/v1/integrations/payments/vnpay/ipn`. Use cases: UC04.

Sources: pa/pa3/Use_Case_Specification_v1.1.pdf §4.2-4.5; PDF pp20-22 | https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html.

Access: PROVIDER. Ownership: NONE.

Provider only. VNPAY Sandbox 2.1.0 signed query callback. Verify the full signed parameter set using the provider canonicalization. Validate vnp_TmnCode, vnp_TxnRef, and vnp_Amount against the stored attempt. The wire amount equals VND times 100. A successful payment requires both vnp_ResponseCode and vnp_TransactionStatus to be 00. Activation awaits project sandbox access evidence. Verify signature, merchant, reference, and amount before deduplication. Identify the attempt by vnp_TmnCode and vnp_TxnRef and associate vnp_TransactionNo with the evidence. Hash the UTF-8 VNPAY 2.1.0 canonical signed parameter string, excluding signature fields, with SHA-256. An already accepted fingerprint for that transaction is an exact replay. A new fingerprint is new evidence even if the booking is terminal. If it conflicts with a recorded result or provider transaction number, durably store it and queue signed QueryDr before acknowledging with 00. Set verificationStatus=CONFLICT and keep reconciliation pending without changing booking, seat, or ticket state. Return 99 if durable acceptance fails. A browser return cannot confirm payment. This provider callback is non-cacheable and must not be prefetched.

See [OpenAPI](openapi.yaml) for request fields and examples.

| Status | Result |
| --- | --- |
| 200 | VNPAY acknowledgment: 00 for newly accepted evidence after durable recording and, for conflicts, durable QueryDr scheduling. 02 only for a fingerprint already recorded under the same transaction identity. 01 unknown reference, 04 amount mismatch, 97 invalid signature, 99 other error or temporary inability to durably accept. Acceptance of conflicting evidence does not confirm payment or regress fulfillment. |

### listBookingTickets

`GET /api/v1/bookings/{bookingId}/tickets` — **PROPOSED**. UC: UC05.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §5.2-5.5; PDF pp23-25.

Security/ownership: CUSTOMER / SELF. Preconditions: Requires the owner and a SUCCESS booking. Returns 202 without a QR code while issuance is PENDING or RETRYING. At READY, returns every seat ticket for the booking with a null cursor.

Effects: Read-only, including for USED tickets. Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: path `bookingId` (required). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / TicketPage | Read-only, including for USED tickets. |
| 409 | application/json / Error | BOOKING_UNPAID. The response never reports an unverified success. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 404 | application/json / Error | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |
| 202 | application/json / TicketPending | Payment succeeded and issuance is pending. Includes Retry-After and retryAfterSeconds. No QR code is returned. |

Find the applicable examples under `paths./bookings/{bookingId}/tickets.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### getTicket

`GET /api/v1/tickets/{ticketId}` — **PROPOSED**. UC: UC05.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §5.2-5.5; PDF pp23-25.

Security/ownership: CUSTOMER / SELF. Preconditions: Requires the owner, an issued ticket, and a SUCCESS booking. CANCELLED and USED tickets remain available as historical records.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: path `ticketId` (required). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / Ticket | The operation succeeds without changing domain state. |
| 409 | application/json / Error | BOOKING_UNPAID. The response never reports an unverified success. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 404 | application/json / Error | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./tickets/{ticketId}.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### downloadTicket

`GET /api/v1/tickets/{ticketId}/download` — **PROPOSED**. UC: UC05.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §5.2-5.5; PDF pp23-25.

Security/ownership: CUSTOMER / SELF. Preconditions: Requires the owner, an issued ticket, and a SUCCESS booking. Returns a PDF with the QR code and usage status, Content-Disposition attachment, and no-store.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: path `ticketId` (required). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/pdf / binary | Protected binary, Cache-Control no-store. Ticket status is unchanged by the read. |
| 409 | application/json / Error | BOOKING_UNPAID. The response never reports an unverified success. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 404 | application/json / Error | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./tickets/{ticketId}/download.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### getTicketQrImage

`GET /api/v1/tickets/{ticketId}/qr` — **PROPOSED**. UC: UC05.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §5.2-5.5; PDF pp23-25.

Security/ownership: CUSTOMER / SELF. Preconditions: Owner + issued + booking SUCCESS; image/png protected, no-store.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: path `ticketId` (required). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | image/png / binary | Protected binary, Cache-Control no-store. Ticket status is unchanged by the read. |
| 409 | application/json / Error | BOOKING_UNPAID. The response never reports an unverified success. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 404 | application/json / Error | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./tickets/{ticketId}/qr.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### listAdmissionShowtimes

`GET /api/v1/staff/showtimes` — **PROPOSED**. UC: UC12.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §12.2-12.5; PDF pp44-46.

Security/ownership: STAFF, ADMIN / NONE. Preconditions: Showtime view for admission staff. Omits financial and private customer fields. Includes CANCELLED showtimes so staff can explain invalid admission attempts.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: query `limit` (optional), query `cursor` (optional), query `movieId` (optional), query `roomId` (optional), query `date` (optional), query `format` (optional). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / ShowtimePage | The operation succeeds without changing domain state. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | application/json / Error | INVALID_QUERY / INVALID_CURSOR |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./staff/showtimes.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### lookupTicket

`POST /api/v1/staff/ticket-lookups` — **PROPOSED**. UC: UC19, UC12.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §19.2-19.5; PDF pp62-64; pa/pa3/Use_Case_Specification_v1.1.pdf §12.2-12.5; PDF pp44-46.

Security/ownership: STAFF, ADMIN / NONE. Preconditions: Validates the identifier format and returns the minimum ticket fields. Omits QR data, account details, and payment secrets.

Effects: Lookup is read-only. Ticket usage status is unchanged by the lookup. Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: none. Body: `TicketLookupInput`.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / TicketLookup | Lookup is read-only. Ticket usage status is unchanged by the lookup. |
| 404 | application/json / Error | TICKET_NOT_FOUND. The response never reports an unverified success. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | application/json / Error | MALFORMED_REQUEST. The response never reports an unverified success. |
| 422 | application/json / Error | VALIDATION_ERROR / LIMIT_EXCEEDED |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./staff/ticket-lookups.post` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### previewAdmission

Method and path: `POST /api/v1/staff/admission-validations`. Use cases: UC12.

Sources: pa/pa3/Use_Case_Specification_v1.1.pdf §12.2-12.5; PDF pp44-46.

Access: STAFF, ADMIN. Ownership: NONE.

Authoritative lookup/signature/payment/showtime/window/ticket; unknown => 200 INVALID NOT_FOUND. Use the server clock. Admit only when startsAt minus 30 minutes <= server time < startsAt plus 15 minutes. Apply zero extra tolerance and reject cancelled showtimes. No Staff override. Read-only. VALID, USED, and INVALID are preview outcomes. The operation persists no status.

See [OpenAPI](openapi.yaml) for request fields and examples.

| Status | Result |
| --- | --- |
| 200 | Read-only. VALID, USED, and INVALID are preview outcomes. The operation persists no status. |
| 401 | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | MALFORMED_REQUEST. The response never reports an unverified success. |
| 422 | VALIDATION_ERROR / LIMIT_EXCEEDED |
| 503 | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

### confirmAdmission

Method and path: `POST /api/v1/staff/admissions`. Use cases: UC12.

Sources: pa/pa3/Use_Case_Specification_v1.1.pdf §12.2-12.5; PDF pp44-46.

Access: STAFF, ADMIN. Ownership: NONE.

Revalidate every guard at commit. Move UNUSED to USED conditionally and record one admission per ticket. The same actor and attemptId with the same payload returns the original admission with 200. A different payload or new attempt for a USED ticket returns 409. Use the server clock. Admit only when startsAt minus 30 minutes <= server time < startsAt plus 15 minutes. Apply zero extra tolerance and reject cancelled showtimes. No Staff override. Atomically records the admission, the USED state, and the audit entry. Seat sales and payment capture are outside this operation. Each request requires Idempotency-Key. Reuse it for exact retries.

See [OpenAPI](openapi.yaml) for request fields and examples.

| Status | Result |
| --- | --- |
| 201 | Atomically records the admission, the USED state, and the audit entry. Seat sales and payment capture are outside this operation. |
| 409 | TICKET_ALREADY_USED / ADMISSION_ATTEMPT_REUSED / WRONG_SHOWTIME / SHOWTIME_CANCELLED / OUTSIDE_ADMISSION_WINDOW / TICKET_CANCELLED / UNPAID_TICKET / IDEMPOTENCY_IN_PROGRESS / IDEMPOTENCY_KEY_REUSED |
| 404 | TICKET_NOT_FOUND. The response never reports an unverified success. |
| 401 | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | MALFORMED_REQUEST. The response never reports an unverified success. |
| 422 | VALIDATION_ERROR / LIMIT_EXCEEDED |
| 503 | SERVICE_UNAVAILABLE. The response never reports an unverified success. |
| 200 | A duplicate or retry returns the existing resource without creating a second one. |

### listAdminMovies

`GET /api/v1/admin/movies` — **PROPOSED**. UC: UC07.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §7.2-7.5; PDF pp29-31.

Security/ownership: ADMIN / NONE. Preconditions: Admin sees inactive/drafts; all lists cursor order createdAt desc,id desc.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: query `limit` (optional), query `cursor` (optional). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / MoviePage | The operation succeeds without changing domain state. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | application/json / Error | INVALID_QUERY / INVALID_CURSOR |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./admin/movies.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### createMovie

Method and path: `POST /api/v1/admin/movies`. Use cases: UC07.

Sources: pa/pa3/Use_Case_Specification_v1.1.pdf §7.2-7.5; PDF pp29-31.

Access: ADMIN. Ownership: NONE.

Check for duplicates using normalized title, duration, and ageRating. Validate approved age classifications and configured room-format rules. A title-only match is accepted and flagged for review. A full match on normalized title, duration, and ageRating returns 409 MOVIE_DUPLICATE. Persist validated resource; audit; no historical rewrite. Each request requires Idempotency-Key. Reuse it for exact retries.

See [OpenAPI](openapi.yaml) for request fields and examples.

| Status | Result |
| --- | --- |
| 201 | Persist validated resource; audit; no historical rewrite. |
| 409 | MOVIE_DUPLICATE. The response never reports an unverified success. |
| 422 | INVALID_REFERENCE / VALIDATION_ERROR / LIMIT_EXCEEDED |
| 401 | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | MALFORMED_REQUEST. The response never reports an unverified success. |
| 503 | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

### getAdminMovie

`GET /api/v1/admin/movies/{movieId}` — **PROPOSED**. UC: UC07.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §7.2-7.5; PDF pp29-31.

Security/ownership: ADMIN / NONE. Preconditions: Apply the role and input schema requirements. Where the request supplies an ID, the target resource must exist.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: path `movieId` (required). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / Movie | The operation succeeds without changing domain state. |
| 404 | application/json / Error | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./admin/movies/{movieId}.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### updateMovie

Method and path: `PATCH /api/v1/admin/movies/{movieId}`. Use cases: UC07.

Sources: pa/pa3/Use_Case_Specification_v1.1.pdf §7.2-7.5; PDF pp29-31.

Access: ADMIN. Ownership: NONE.

expectedVersion; duration increase rechecks schedules/cleaning. INACTIVE forbids new scheduling, preserve existing shows/history; no hard-delete. Validate approved age classifications and configured room-format rules. A title-only match is accepted and flagged for review. A full match on normalized title, duration, and ageRating returns 409 MOVIE_DUPLICATE. Update metadata only; historical booking movie data stays snapshot. Each request requires Idempotency-Key. Reuse it for exact retries.

See [OpenAPI](openapi.yaml) for request fields and examples.

| Status | Result |
| --- | --- |
| 200 | Update metadata only; historical booking movie data stays snapshot. |
| 409 | VERSION_CONFLICT / DURATION_SCHEDULE_CONFLICT / IDEMPOTENCY_IN_PROGRESS / IDEMPOTENCY_KEY_REUSED / MOVIE_DUPLICATE |
| 404 | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 401 | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | MALFORMED_REQUEST. The response never reports an unverified success. |
| 422 | VALIDATION_ERROR / LIMIT_EXCEEDED |
| 503 | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

### listAdminRooms

`GET /api/v1/admin/rooms` — **PROPOSED**. UC: UC08.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §8.2-8.5; PDF pp32-34.

Security/ownership: ADMIN / NONE. Preconditions: Admin sees inactive/drafts; all lists cursor order createdAt desc,id desc.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: query `limit` (optional), query `cursor` (optional). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / RoomPage | The operation succeeds without changing domain state. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | application/json / Error | INVALID_QUERY / INVALID_CURSOR |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./admin/rooms.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### createRoom

`POST /api/v1/admin/rooms` — **PROPOSED**. UC: UC08.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §8.2-8.5; PDF pp32-34.

Security/ownership: ADMIN / NONE. Preconditions: Unique room name; generate grid stable IDs; capacity rows*columns.

Effects: Persist validated resource; audit; no historical rewrite. Retry: REQUIRED; Follow the retry and domain rules above.

Parameters: header `Idempotency-Key` (required). Body: `RoomInput`.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 201 | application/json / Room | Persist validated resource; audit; no historical rewrite. |
| 409 | application/json / Error | ROOM_NAME_DUPLICATE. The response never reports an unverified success. |
| 422 | application/json / Error | INVALID_REFERENCE / VALIDATION_ERROR / LIMIT_EXCEEDED |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | application/json / Error | MALFORMED_REQUEST. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./admin/rooms.post` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### getAdminRoom

`GET /api/v1/admin/rooms/{roomId}` — **PROPOSED**. UC: UC08.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §8.2-8.5; PDF pp32-34.

Security/ownership: ADMIN / NONE. Preconditions: Apply the role and input schema requirements. Where the request supplies an ID, the target resource must exist.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: path `roomId` (required). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / Room | The operation succeeds without changing domain state. |
| 404 | application/json / Error | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./admin/rooms/{roomId}.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### updateRoom

`PATCH /api/v1/admin/rooms/{roomId}` — **PROPOSED**. UC: UC08.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §8.2-8.5; PDF pp32-34.

Security/ownership: ADMIN / NONE. Preconditions: expectedVersion; format/deactivation blocked with active shows/HELD/SOLD. Name edit preserves IDs.

Effects: Update room without rewriting historical capacity. Retry: REQUIRED; Follow the retry and domain rules above.

Parameters: path `roomId` (required), header `Idempotency-Key` (required). Body: `RoomUpdate`.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / Room | Update room without rewriting historical capacity. |
| 409 | application/json / Error | VERSION_CONFLICT / ROOM_NAME_DUPLICATE / LAYOUT_IN_USE. The response never reports an unverified success. |
| 404 | application/json / Error | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | application/json / Error | MALFORMED_REQUEST. The response never reports an unverified success. |
| 422 | application/json / Error | VALIDATION_ERROR / LIMIT_EXCEEDED |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./admin/rooms/{roomId}.patch` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### listAdminShowtimes

`GET /api/v1/admin/showtimes` — **PROPOSED**. UC: UC09.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §9.2-9.5; PDF pp35-37.

Security/ownership: ADMIN / NONE. Preconditions: Admin sees inactive/drafts; all lists cursor order createdAt desc,id desc.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: query `limit` (optional), query `cursor` (optional), query `movieId` (optional), query `roomId` (optional), query `date` (optional), query `format` (optional), query `status` (optional). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / ShowtimePage | The operation succeeds without changing domain state. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | application/json / Error | INVALID_QUERY / INVALID_CURSOR |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./admin/showtimes.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### createShowtime

Method and path: `POST /api/v1/admin/showtimes`. Use cases: UC09.

Sources: pa/pa3/Use_Case_Specification_v1.1.pdf §9.2-9.5; PDF pp35-37.

Access: ADMIN. Ownership: NONE.

Future start, compatible active movie/room, pricing configured; occupied [start,end+cleaning), same room serialized overlap check. Default cleaning time is 15 minutes when no override is configured. Reject an invalid cleaning setting. Use approved classification and room-format configuration. Persist validated resource; audit; no historical rewrite. Each request requires Idempotency-Key. Reuse it for exact retries.

See [OpenAPI](openapi.yaml) for request fields and examples.

| Status | Result |
| --- | --- |
| 201 | Persist validated resource; audit; no historical rewrite. |
| 409 | SCHEDULE_OVERLAP. The response never reports an unverified success. |
| 422 | INVALID_REFERENCE / VALIDATION_ERROR / CLEANING_INTERVAL_UNCONFIGURED / LIMIT_EXCEEDED |
| 401 | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | MALFORMED_REQUEST. The response never reports an unverified success. |
| 503 | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

### getAdminShowtime

`GET /api/v1/admin/showtimes/{showtimeId}` — **PROPOSED**. UC: UC09.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §9.2-9.5; PDF pp35-37.

Security/ownership: ADMIN / NONE. Preconditions: Apply the role and input schema requirements. Where the request supplies an ID, the target resource must exist.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: path `showtimeId` (required). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / Showtime | The operation succeeds without changing domain state. |
| 404 | application/json / Error | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./admin/showtimes/{showtimeId}.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### updateShowtime

Method and path: `PATCH /api/v1/admin/showtimes/{showtimeId}`. Use cases: UC09.

Sources: pa/pa3/Use_Case_Specification_v1.1.pdf §9.2-9.5; PDF pp35-37.

Access: ADMIN. Ownership: NONE.

expectedVersion; DRAFT/ACTIVE only, terminal CANCELLED/COMPLETED reject409 SHOWTIME_TERMINAL. Movie/room/time/pricingCategory effective changes blocked409 SHOWTIME_HAS_RESERVATIONS if any HELD/SOLD. status may only be ACTIVE: DRAFT->ACTIVE validates references/format/future time/prices/overlap/layout; ACTIVE->ACTIVE no-op unless safe unreserved field edit. DRAFT demotion rejected422. Cancellation only cancelShowtime explicit warning. Serialize with hold/payment/admission/cancel using authoritative showtime/version fence. Default cleaning time is 15 minutes when no override is configured. Reject an invalid cleaning setting. Use approved classification and room-format configuration. Update safe schedule; no overlap; active inventory initialized idempotently. Each request requires Idempotency-Key. Reuse it for exact retries.

See [OpenAPI](openapi.yaml) for request fields and examples.

| Status | Result |
| --- | --- |
| 200 | Update safe schedule; no overlap; active inventory initialized idempotently. |
| 409 | VERSION_CONFLICT / SCHEDULE_OVERLAP / SHOWTIME_HAS_RESERVATIONS / IDEMPOTENCY_IN_PROGRESS / IDEMPOTENCY_KEY_REUSED / SHOWTIME_TERMINAL |
| 404 | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 401 | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | MALFORMED_REQUEST. The response never reports an unverified success. |
| 422 | VALIDATION_ERROR / CLEANING_INTERVAL_UNCONFIGURED / LIMIT_EXCEEDED |
| 503 | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

### listAdminPriceRules

`GET /api/v1/admin/price-rules` — **PROPOSED**. UC: UC10.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §10.2-10.5; PDF pp38-40.

Security/ownership: ADMIN / NONE. Preconditions: Admin sees inactive/drafts; all lists cursor order createdAt desc,id desc.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: query `limit` (optional), query `cursor` (optional). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / PriceRulePage | The operation succeeds without changing domain state. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | application/json / Error | INVALID_QUERY / INVALID_CURSOR |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./admin/price-rules.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### createPriceRule

`POST /api/v1/admin/price-rules` — **PROPOSED**. UC: UC10.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §10.2-10.5; PDF pp38-40.

Security/ownership: ADMIN / NONE. Preconditions: Unique seatType/category; amount >0.

Effects: Persist validated resource; audit; no historical rewrite. Retry: REQUIRED; Follow the retry and domain rules above.

Parameters: header `Idempotency-Key` (required). Body: `PriceRuleInput`.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 201 | application/json / PriceRule | Persist validated resource; audit; no historical rewrite. |
| 409 | application/json / Error | PRICE_RULE_DUPLICATE. The response never reports an unverified success. |
| 422 | application/json / Error | INVALID_REFERENCE / VALIDATION_ERROR / LIMIT_EXCEEDED |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | application/json / Error | MALFORMED_REQUEST. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./admin/price-rules.post` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### getAdminPriceRule

`GET /api/v1/admin/price-rules/{priceRuleId}` — **PROPOSED**. UC: UC10.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §10.2-10.5; PDF pp38-40.

Security/ownership: ADMIN / NONE. Preconditions: Apply the role and input schema requirements. Where the request supplies an ID, the target resource must exist.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: path `priceRuleId` (required). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / PriceRule | The operation succeeds without changing domain state. |
| 404 | application/json / Error | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./admin/price-rules/{priceRuleId}.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### updatePriceRule

`PATCH /api/v1/admin/price-rules/{priceRuleId}` — **PROPOSED**. UC: UC10.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §10.2-10.5; PDF pp38-40.

Security/ownership: ADMIN / NONE. Preconditions: expectedVersion; only amount may change.

Effects: New price used only future quotes/bookings; existing PENDING/SUCCESS snapshots preserved. Retry: REQUIRED; Follow the retry and domain rules above.

Parameters: path `priceRuleId` (required), header `Idempotency-Key` (required). Body: `PriceRuleUpdate`.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / PriceRule | New price used only future quotes/bookings; existing PENDING/SUCCESS snapshots preserved. |
| 409 | application/json / Error | VERSION_CONFLICT. The response never reports an unverified success. |
| 404 | application/json / Error | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | application/json / Error | MALFORMED_REQUEST. The response never reports an unverified success. |
| 422 | application/json / Error | VALIDATION_ERROR / LIMIT_EXCEEDED |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./admin/price-rules/{priceRuleId}.patch` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### listAdminPromotions

`GET /api/v1/admin/promotions` — **PROPOSED**. UC: UC15.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §15.2-15.5; PDF pp51-53.

Security/ownership: ADMIN / NONE. Preconditions: Admin sees inactive/drafts; all lists cursor order createdAt desc,id desc.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: query `limit` (optional), query `cursor` (optional). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / PromotionPage | The operation succeeds without changing domain state. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | application/json / Error | INVALID_QUERY / INVALID_CURSOR |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./admin/promotions.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### createPromotion

`POST /api/v1/admin/promotions` — **PROPOSED**. UC: UC15.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §15.2-15.5; PDF pp51-53.

Security/ownership: ADMIN / NONE. Preconditions: Unique uppercase code; start<end; discount cross-field validation; supported conditions only ADR-07.

Effects: Persist validated resource; audit; no historical rewrite. Retry: REQUIRED; Follow the retry and domain rules above.

Parameters: header `Idempotency-Key` (required). Body: `PromotionInput`.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 201 | application/json / Promotion | Persist validated resource; audit; no historical rewrite. |
| 409 | application/json / Error | PROMOTION_CODE_DUPLICATE. The response never reports an unverified success. |
| 422 | application/json / Error | INVALID_REFERENCE / VALIDATION_ERROR / LIMIT_EXCEEDED |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | application/json / Error | MALFORMED_REQUEST. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./admin/promotions.post` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### getAdminPromotion

`GET /api/v1/admin/promotions/{promotionId}` — **PROPOSED**. UC: UC15.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §15.2-15.5; PDF pp51-53.

Security/ownership: ADMIN / NONE. Preconditions: Apply the role and input schema requirements. Where the request supplies an ID, the target resource must exist.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: path `promotionId` (required). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / Promotion | The operation succeeds without changing domain state. |
| 404 | application/json / Error | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./admin/promotions/{promotionId}.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### updatePromotion

`PATCH /api/v1/admin/promotions/{promotionId}` — **PROPOSED**. UC: UC15.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §15.2-15.5; PDF pp51-53.

Security/ownership: ADMIN / NONE. Preconditions: expectedVersion; immutable old version retained; conditions/date/value validated.

Effects: Apply future validations; old PENDING/SUCCESS discounts preserved. Retry: REQUIRED; Follow the retry and domain rules above.

Parameters: path `promotionId` (required), header `Idempotency-Key` (required). Body: `PromotionUpdate`.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / Promotion | Apply future validations; old PENDING/SUCCESS discounts preserved. |
| 409 | application/json / Error | VERSION_CONFLICT / PROMOTION_CODE_DUPLICATE. The response never reports an unverified success. |
| 404 | application/json / Error | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | application/json / Error | MALFORMED_REQUEST. The response never reports an unverified success. |
| 422 | application/json / Error | VALIDATION_ERROR / LIMIT_EXCEEDED |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./admin/promotions/{promotionId}.patch` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### replaceRoomLayout

`PUT /api/v1/admin/rooms/{roomId}/layout` — **PROPOSED**. UC: UC08.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §8.2-8.5; PDF pp32-34.

Security/ownership: ADMIN / NONE. Preconditions: Full layout replace, expectedVersion; unique seat IDs/coordinates/labels; existing IDs retained for surviving seats. Active future showtime uses layout => block structural/type/status changes until completed or unbooked shows cancelled.

Effects: Version new room layout; no change past showtime capacity or booking snapshots. Retry: REQUIRED; Follow the retry and domain rules above.

Parameters: path `roomId` (required), header `Idempotency-Key` (required). Body: `LayoutInput`.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / Room | Version new room layout; no change past showtime capacity or booking snapshots. |
| 404 | application/json / Error | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 409 | application/json / Error | VERSION_CONFLICT / LAYOUT_IN_USE. The response never reports an unverified success. |
| 422 | application/json / Error | DUPLICATE_SEAT_LABEL / INVALID_LAYOUT / LIMIT_EXCEEDED |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | application/json / Error | MALFORMED_REQUEST. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./admin/rooms/{roomId}/layout.put` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### getCancellationImpact

Method and path: `GET /api/v1/admin/showtimes/{showtimeId}/cancellation-impact`. Use cases: UC09.

Sources: pa/pa3/Use_Case_Specification_v1.1.pdf §9.2-9.5; PDF pp35-37.

Access: ADMIN. Ownership: NONE.

Counts authoritative; token binds version+counts+inventoryVersion+expiresAt; read-only warning. An Admin must also have the separately assigned SHOWTIME_CANCEL permission. Audit the authorization decision. Read-only

See [OpenAPI](openapi.yaml) for request fields and examples.

| Status | Result |
| --- | --- |
| 200 | The operation succeeds without changing domain state. |
| 404 | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 409 | SHOWTIME_ALREADY_CANCELLED. The response never reports an unverified success. |
| 401 | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | ROLE_FORBIDDEN / PERMISSION_REQUIRED |
| 503 | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

### cancelShowtime

Method and path: `POST /api/v1/admin/showtimes/{showtimeId}/cancellations`. Use cases: UC09.

Sources: pa/pa3/Use_Case_Specification_v1.1.pdf §9.2-9.5; PDF pp35-37.

Access: ADMIN. Ownership: NONE.

Explicit confirmation matching current impact token; if changed recompute warning. HELD/SOLD cancellation supported UC9.2.2.3 PDF p36. An Admin must also have the separately assigned SHOWTIME_CANCEL permission. Audit the authorization decision. Cancel immediately and block sale and admission. Preserve paid history and queue eligible payments for authorized full refund. The cancellation permission grants no refund approval. Each request requires Idempotency-Key. Reuse it for exact retries.

See [OpenAPI](openapi.yaml) for request fields and examples.

| Status | Result |
| --- | --- |
| 202 | Fence showtime CANCELLED synchronously against hold/payment/admission; release slot, queue holds/booking resolution/notifications. Do not rewrite SUCCESS financial snapshots or auto-refund; cancellationStatus PROCESSING then COMPLETED; Q-03. |
| 404 | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 409 | CANCELLATION_IMPACT_STALE / VERSION_CONFLICT / SHOWTIME_COMPLETED. The response never reports an unverified success. |
| 401 | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | ROLE_FORBIDDEN / PERMISSION_REQUIRED |
| 400 | MALFORMED_REQUEST. The response never reports an unverified success. |
| 422 | VALIDATION_ERROR / LIMIT_EXCEEDED |
| 503 | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

### getDashboard

Method and path: `GET /api/v1/admin/dashboard`. Use cases: UC13.

Sources: pa/pa3/Use_Case_Specification_v1.1.pdf §13.2-13.5; PDF pp47-48.

Access: ADMIN. Ownership: NONE.

Admin only. See API_GUIDE.md for metrics, formulas, and the time basis. Empty reports return zeros. The proposed maximum range is 366 days. Return collected, refunded, pending collection, and pending refund amounts separately. Keep revenue as booked sales for compatibility. Read-only

See [OpenAPI](openapi.yaml) for request fields and examples.

| Status | Result |
| --- | --- |
| 200 | The operation succeeds without changing domain state. |
| 401 | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | INVALID_QUERY. The response never reports an unverified success. |
| 503 | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

### getReport

Method and path: `GET /api/v1/admin/reports`. Use cases: UC13.

Sources: pa/pa3/Use_Case_Specification_v1.1.pdf §13.2-13.5; PDF pp47-48.

Access: ADMIN. Ownership: NONE.

Admin only; report snapshot asOf consistent; same formula as dashboard. No export API. Return collected, refunded, pending collection, and pending refund amounts separately. Keep revenue as booked sales for compatibility. Read-only

See [OpenAPI](openapi.yaml) for request fields and examples.

| Status | Result |
| --- | --- |
| 200 | The operation succeeds without changing domain state. |
| 401 | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | INVALID_QUERY. The response never reports an unverified success. |
| 503 | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

### listMovieReviews

`GET /api/v1/movies/{movieId}/reviews` — **PROPOSED**. UC: UC01, UC14.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §1.2-1.5; PDF pp11-12; pa/pa3/Use_Case_Specification_v1.1.pdf §14.2-14.5; PDF pp49-50.

Security/ownership: PUBLIC / NONE. Preconditions: Public displayName only; no customer ID/payment/booking.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: path `movieId` (required), query `limit` (optional), query `cursor` (optional). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / ReviewPage | The operation succeeds without changing domain state. |
| 404 | application/json / Error | MOVIE_NOT_FOUND. The response never reports an unverified success. |
| 400 | application/json / Error | INVALID_QUERY / INVALID_CURSOR |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./movies/{movieId}/reviews.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### submitMovieReview

`POST /api/v1/movies/{movieId}/reviews` — **PROPOSED**. UC: UC14.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §14.2-14.5; PDF pp49-50.

Security/ownership: CUSTOMER / SELF. Preconditions: Eligibility rechecked; unique customer/movie; integer rating from 1 through 5 (approved in Q-06). No edit API; source permits report duplicate alternative.

Effects: Create feedback + update arithmetic average/count; no booking/ticket change. Retry: REQUIRED; Follow the retry and domain rules above.

Parameters: path `movieId` (required), header `Idempotency-Key` (required). Body: `ReviewInput`.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 201 | application/json / Review | Create feedback + update arithmetic average/count; no booking/ticket change. |
| 404 | application/json / Error | MOVIE_NOT_FOUND. The response never reports an unverified success. |
| 403 | application/json / Error | REVIEW_INELIGIBLE. The response never reports an unverified success. |
| 409 | application/json / Error | REVIEW_ALREADY_EXISTS. The response never reports an unverified success. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 400 | application/json / Error | MALFORMED_REQUEST. The response never reports an unverified success. |
| 422 | application/json / Error | VALIDATION_ERROR / LIMIT_EXCEEDED |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./movies/{movieId}/reviews.post` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### getReviewEligibility

`GET /api/v1/movies/{movieId}/review-eligibility` — **PROPOSED**. UC: UC14.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §14.2-14.5; PDF pp49-50.

Security/ownership: CUSTOMER / SELF. Preconditions: SUCCESS own booking + >=1 USED own ticket for same movie; duplicate => ALREADY_REVIEWED.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: path `movieId` (required). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / ReviewEligibility | The operation succeeds without changing domain state. |
| 404 | application/json / Error | MOVIE_NOT_FOUND. The response never reports an unverified success. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./movies/{movieId}/review-eligibility.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### listNotifications

`GET /api/v1/me/notifications` — **PROPOSED**. UC: UC16.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §16.2-16.5; PDF pp54-55.

Security/ownership: CUSTOMER / SELF. Preconditions: Owner only; reverse chronological; GET never marks read.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: query `limit` (optional), query `cursor` (optional), query `read` (optional). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / NotificationPage | The operation succeeds without changing domain state. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | application/json / Error | INVALID_QUERY / INVALID_CURSOR |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./me/notifications.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### getNotification

`GET /api/v1/me/notifications/{notificationId}` — **PROPOSED**. UC: UC16, UC20.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §16.2-16.5; PDF pp54-55; pa/pa3/Use_Case_Specification_v1.1.pdf §20.2-20.5; PDF pp65-67.

Security/ownership: CUSTOMER / SELF. Preconditions: Owner; resolve latest linked operational data. Failure 503, do not claim cached data current. GET no read mutation.

Effects: Read-only Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: path `notificationId` (required). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / Notification | The operation succeeds without changing domain state. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 404 | application/json / Error | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |

Find the applicable examples under `paths./me/notifications/{notificationId}.get` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### markNotificationRead

`PUT /api/v1/me/notifications/{notificationId}/read` — **PROPOSED**. UC: UC16.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §16.2-16.5; PDF pp54-55.

Security/ownership: CUSTOMER / SELF. Preconditions: Apply the role and input schema requirements. Where the request supplies an ID, the target resource must exist.

Effects: Set readAt once, repeated call preserves first timestamp; UI invokes explicitly after successful detail load. Retry: REQUIRED; Follow the retry and domain rules above.

Parameters: path `notificationId` (required), header `Idempotency-Key` (required). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / Notification | Set readAt once, repeated call preserves first timestamp; UI invokes explicitly after successful detail load. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 404 | application/json / Error | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |
| 409 | application/json / Error | Retry/domain conflict |

Find the applicable examples under `paths./me/notifications/{notificationId}/read.put` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### askAssistant

`POST /api/v1/assistant/queries` — **OPTIONAL**. UC: UC17.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §17.2-17.5; PDF pp56-58.

Security/ownership: PUBLIC / NONE. Preconditions: OPTIONAL public discovery; approved catalogue/current showtimes only; sanitize PII before provider; no tool permission to mutate.

Effects: Answer or recommendations=[]; failure fallbackPath /movies in Error.context.reason and UI static fallback; core independent. Retry: DOMAIN_OR_READ; Follow the retry and domain rules above.

Parameters: none. Body: `AssistantInput`.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 200 | application/json / AssistantAnswer | Answer or recommendations=[]; failure fallbackPath /movies in Error.context.reason and UI static fallback; core independent. |
| 422 | application/json / Error | ASSISTANT_QUERY_UNSUPPORTED / LIMIT_EXCEEDED |
| 503 | application/json / Error | FEATURE_DISABLED / AI_UNAVAILABLE. The response never reports an unverified success. |
| 429 | application/json / Error | RATE_LIMITED. The response never reports an unverified success. |
| 400 | application/json / Error | MALFORMED_REQUEST. The response never reports an unverified success. |

Find the applicable examples under `paths./assistant/queries.post` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### createPushSubscription

`POST /api/v1/me/push-subscriptions` — **OPTIONAL**. UC: UC20.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §20.2-20.5; PDF pp65-67.

Security/ownership: CUSTOMER / SELF. Preconditions: OPTIONAL, browser permission already granted; bind session owner + deviceId + endpoint; same owner/device/endpoint upsert reuse ID; deviceId not auth. New account cannot silently take prior endpoint; unsubscribe/revoke first.

Effects: Store active device subscription, no operational changes. Retry: REQUIRED; Follow the retry and domain rules above.

Parameters: header `Idempotency-Key` (required). Body: `PushInput`.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 201 | application/json / PushSubscription | Store active device subscription, no operational changes. |
| 409 | application/json / Error | PUSH_ENDPOINT_OWNED_BY_OTHER / DEVICE_SUBSCRIPTION_CONFLICT. The response never reports an unverified success. |
| 503 | application/json / Error | FEATURE_DISABLED / PUSH_CONFIGURATION_UNAVAILABLE. The response never reports an unverified success. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 400 | application/json / Error | MALFORMED_REQUEST. The response never reports an unverified success. |
| 422 | application/json / Error | VALIDATION_ERROR / LIMIT_EXCEEDED |
| 200 | application/json / PushSubscription | A duplicate or retry returns the existing resource without creating a second one. |

Find the applicable examples under `paths./me/push-subscriptions.post` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### deletePushSubscription

`DELETE /api/v1/me/push-subscriptions/{subscriptionId}` — **OPTIONAL**. UC: UC20.

Source: pa/pa3/Use_Case_Specification_v1.1.pdf §20.2-20.5; PDF pp65-67.

Security/ownership: CUSTOMER / SELF. Preconditions: Owner only; inactive subscription remains known for idempotent 204. Unsubscribe allowed even feature disabled.

Effects: Deactivate subscription; browser also calls PushSubscription.unsubscribe; no mark read. Retry: REQUIRED; Follow the retry and domain rules above.

Parameters: path `subscriptionId` (required), header `Idempotency-Key` (required). Body: none.

| Response | Schema/media | Outcome/errors |
| --- | --- | --- |
| 204 |  | Deactivate subscription; browser also calls PushSubscription.unsubscribe; no mark read. |
| 401 | application/json / Error | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | application/json / Error | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 404 | application/json / Error | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 503 | application/json / Error | SERVICE_UNAVAILABLE. The response never reports an unverified success. |
| 409 | application/json / Error | Retry/domain conflict |

Find the applicable examples under `paths./me/push-subscriptions/{subscriptionId}.delete` in `openapi.yaml`. The synthetic IDs follow CONTRACT_SCENARIOS.md.

### getAdminPayment

Method and path: `GET /api/v1/admin/payments/{paymentId}`. Use cases: supporting only.

Sources: pa/pa3/Software_Architecture_Document_v1.1.pdf §4.8 PDF p29; supporting PROPOSED admin payment status only..

Access: ADMIN. Ownership: NONE.

Supporting SAD §4.8 PDF p29 queryStatus; read persisted reconciliation status, no financial mutation. Read reconciliation and refund progress. Refund approval is a separate audited internal action requiring REFUND_APPROVE. This operation cannot authorize a refund.

See [OpenAPI](openapi.yaml) for request fields and examples.

| Status | Result |
| --- | --- |
| 200 | The operation succeeds without changing domain state. |
| 404 | RESOURCE_NOT_FOUND. The response never reports an unverified success. |
| 401 | AUTH_REQUIRED. The response never reports an unverified success. |
| 403 | ROLE_FORBIDDEN. The response never reports an unverified success. |
| 503 | SERVICE_UNAVAILABLE. The response never reports an unverified success. |
