# MEDI-CINE - TARGET API documentation

This guide introduces the MEDI-CINE API for frontend and backend implementers. The four cinema PDFs provide the project requirements. The [Rust backend](../../backend/src/main.rs) exposes operational probes at `/health` and `/ready`. The cinema endpoints under `/api/v1` are planned. See the [repository README](../../README.md) for the project layout and backend status.

## How to use this documentation

1. Review the sources, conflicts, proposals, and approved decisions and remaining evidence in [DECISIONS.md](DECISIONS.md).
2. Use [openapi.yaml](openapi.yaml) as the canonical definition of HTTP schemas and operations. The base path is /api/v1. Use tooling that supports OpenAPI 3.1 and its JSON Schema nullability rules.
3. See [API_GUIDE.md](API_GUIDE.md) for conventions, permissions, and operation rules. See [STATE_AND_EVENTS.md](STATE_AND_EVENTS.md) for payment races, admission, WSS, and background processing.
4. [TRACEABILITY.md](TRACEABILITY.md) maps all 20 use cases and 90 alternative flows to operations, events, client actions, jobs, and scenarios. [CONTRACT_SCENARIOS.md](CONTRACT_SCENARIOS.md) describes expected behavior for future acceptance testing.

Eighteen core use cases and two optional use cases map to the fourteen Vision capabilities. UC17 covers AI discovery, and UC20 covers PWA push notifications. Each optional feature has a fallback and can be disabled independently of booking, payment, and admission. Feature flags and administrative payment queries are supporting operations. The team selected VNPAY Sandbox. Project merchant access remains open.

Static validation covers the OpenAPI specification, references, JSON Schema examples, unique operation IDs, source branches, forward and reverse traceability, and document links. NFR-01 through NFR-10 remain NOT RUN. Run them once the relevant backend and UI workflows are implemented.

## Booking and check-in walkthrough

Use the operation IDs below to find request and response examples in [OpenAPI](openapi.yaml). The [core scenario](CONTRACT_SCENARIOS.md#fixtures-and-the-core-booking-sequence) follows one booking from seat selection through admission. HTTP paths use the /api/v1 base.

1. **Browse.** Call [listShowtimes](API_GUIDE.md#listshowtimes), then [getSeatMap](API_GUIDE.md#getseatmap) for the chosen showtime.
2. **Hold, quote, and book.** Sign in as a Customer. Send the selected seat IDs to [createHold](API_GUIDE.md#createhold) and keep the hold ID and expiry. Call [createQuote](API_GUIDE.md#createquote) for that hold, then [createBooking](API_GUIDE.md#createbooking) with the hold and quote IDs after confirming the price. Include Idempotency-Key wherever required and reuse it for exact retries.
3. **Pay and check status.** Call [initiatePayment](API_GUIDE.md#initiatepayment) for the booking. Use the returned checkout URL when ready. The browser return only displays status. Poll [getPayment](API_GUIDE.md#getpayment) while payment is pending and reuse the existing payment if initiation is uncertain.
4. **Retrieve tickets.** After verified payment, call [listBookingTickets](API_GUIDE.md#listbookingtickets) as the booking owner. A 202 response means ticket issuance is pending. Wait for a 200 response before using the ticket IDs or QR codes.
5. **Check in.** Staff may use [lookupTicket](API_GUIDE.md#lookupticket) or scan the QR code, then call [previewAdmission](API_GUIDE.md#previewadmission) and [confirmAdmission](API_GUIDE.md#confirmadmission). Confirmation records admission once. The server accepts check-in from 30 minutes before showtime inclusive until 15 minutes after showtime exclusive, and rejects cancelled showtimes.

## Operation catalogue

| OperationId | Method/path (base /api/v1) | UC / rationale | Access | Status |
| --- | --- | --- | --- | --- |
| `getCapabilities` | `GET /capabilities` | supporting operation | PUBLIC | PROPOSED |
| `listMovies` | `GET /movies` | UC01 | PUBLIC | PROPOSED |
| `getMovie` | `GET /movies/{movieId}` | UC01 | PUBLIC | PROPOSED |
| `listShowtimes` | `GET /showtimes` | UC01 | PUBLIC | PROPOSED |
| `getShowtime` | `GET /showtimes/{showtimeId}` | UC01, UC02 | PUBLIC | PROPOSED |
| `getSeatMap` | `GET /showtimes/{showtimeId}/seats` | UC02 | PUBLIC | PROPOSED |
| `registerCustomer` | `POST /auth/registrations` | UC06 | PUBLIC | PROPOSED |
| `login` | `POST /auth/sessions` | UC06 | PUBLIC | PROPOSED |
| `getSession` | `GET /auth/session` | UC06 | CUSTOMER, STAFF, ADMIN | PROPOSED |
| `logout` | `DELETE /auth/session` | UC06 | CUSTOMER, STAFF, ADMIN | PROPOSED |
| `getProfile` | `GET /me/profile` | UC06 | CUSTOMER | PROPOSED |
| `updateProfile` | `PATCH /me/profile` | UC06 | CUSTOMER | PROPOSED |
| `updateCredentials` | `PUT /me/credentials` | UC06 | CUSTOMER | PROPOSED |
| `createHold` | `POST /seat-holds` | UC02 | CUSTOMER | PROPOSED |
| `getHold` | `GET /seat-holds/{holdId}` | UC02, UC03 | CUSTOMER | PROPOSED |
| `releaseHold` | `DELETE /seat-holds/{holdId}` | UC02, UC03 | CUSTOMER | PROPOSED |
| `createQuote` | `POST /seat-holds/{holdId}/quotes` | UC03, UC18 | CUSTOMER | PROPOSED |
| `createBooking` | `POST /bookings` | UC03 | CUSTOMER | PROPOSED |
| `listBookings` | `GET /me/bookings` | UC11 | CUSTOMER | PROPOSED |
| `getBooking` | `GET /bookings/{bookingId}` | UC03, UC04, UC11 | CUSTOMER | PROPOSED |
| `initiatePayment` | `POST /bookings/{bookingId}/payments` | UC04 | CUSTOMER | PROPOSED |
| `getPayment` | `GET /payments/{paymentId}` | UC04 | CUSTOMER | PROPOSED |
| `receivePaymentWebhook` | `GET /integrations/payments/vnpay/ipn` | UC04 | PROVIDER | PROPOSED |
| `listBookingTickets` | `GET /bookings/{bookingId}/tickets` | UC05 | CUSTOMER | PROPOSED |
| `getTicket` | `GET /tickets/{ticketId}` | UC05 | CUSTOMER | PROPOSED |
| `downloadTicket` | `GET /tickets/{ticketId}/download` | UC05 | CUSTOMER | PROPOSED |
| `getTicketQrImage` | `GET /tickets/{ticketId}/qr` | UC05 | CUSTOMER | PROPOSED |
| `listAdmissionShowtimes` | `GET /staff/showtimes` | UC12 | STAFF, ADMIN | PROPOSED |
| `lookupTicket` | `POST /staff/ticket-lookups` | UC19, UC12 | STAFF, ADMIN | PROPOSED |
| `previewAdmission` | `POST /staff/admission-validations` | UC12 | STAFF, ADMIN | PROPOSED |
| `confirmAdmission` | `POST /staff/admissions` | UC12 | STAFF, ADMIN | PROPOSED |
| `listAdminMovies` | `GET /admin/movies` | UC07 | ADMIN | PROPOSED |
| `createMovie` | `POST /admin/movies` | UC07 | ADMIN | PROPOSED |
| `getAdminMovie` | `GET /admin/movies/{movieId}` | UC07 | ADMIN | PROPOSED |
| `updateMovie` | `PATCH /admin/movies/{movieId}` | UC07 | ADMIN | PROPOSED |
| `listAdminRooms` | `GET /admin/rooms` | UC08 | ADMIN | PROPOSED |
| `createRoom` | `POST /admin/rooms` | UC08 | ADMIN | PROPOSED |
| `getAdminRoom` | `GET /admin/rooms/{roomId}` | UC08 | ADMIN | PROPOSED |
| `updateRoom` | `PATCH /admin/rooms/{roomId}` | UC08 | ADMIN | PROPOSED |
| `listAdminShowtimes` | `GET /admin/showtimes` | UC09 | ADMIN | PROPOSED |
| `createShowtime` | `POST /admin/showtimes` | UC09 | ADMIN | PROPOSED |
| `getAdminShowtime` | `GET /admin/showtimes/{showtimeId}` | UC09 | ADMIN | PROPOSED |
| `updateShowtime` | `PATCH /admin/showtimes/{showtimeId}` | UC09 | ADMIN | PROPOSED |
| `listAdminPriceRules` | `GET /admin/price-rules` | UC10 | ADMIN | PROPOSED |
| `createPriceRule` | `POST /admin/price-rules` | UC10 | ADMIN | PROPOSED |
| `getAdminPriceRule` | `GET /admin/price-rules/{priceRuleId}` | UC10 | ADMIN | PROPOSED |
| `updatePriceRule` | `PATCH /admin/price-rules/{priceRuleId}` | UC10 | ADMIN | PROPOSED |
| `listAdminPromotions` | `GET /admin/promotions` | UC15 | ADMIN | PROPOSED |
| `createPromotion` | `POST /admin/promotions` | UC15 | ADMIN | PROPOSED |
| `getAdminPromotion` | `GET /admin/promotions/{promotionId}` | UC15 | ADMIN | PROPOSED |
| `updatePromotion` | `PATCH /admin/promotions/{promotionId}` | UC15 | ADMIN | PROPOSED |
| `replaceRoomLayout` | `PUT /admin/rooms/{roomId}/layout` | UC08 | ADMIN | PROPOSED |
| `getCancellationImpact` | `GET /admin/showtimes/{showtimeId}/cancellation-impact` | UC09 | ADMIN | PROPOSED |
| `cancelShowtime` | `POST /admin/showtimes/{showtimeId}/cancellations` | UC09 | ADMIN | PROPOSED |
| `getDashboard` | `GET /admin/dashboard` | UC13 | ADMIN | PROPOSED |
| `getReport` | `GET /admin/reports` | UC13 | ADMIN | PROPOSED |
| `listMovieReviews` | `GET /movies/{movieId}/reviews` | UC01, UC14 | PUBLIC | PROPOSED |
| `submitMovieReview` | `POST /movies/{movieId}/reviews` | UC14 | CUSTOMER | PROPOSED |
| `getReviewEligibility` | `GET /movies/{movieId}/review-eligibility` | UC14 | CUSTOMER | PROPOSED |
| `listNotifications` | `GET /me/notifications` | UC16 | CUSTOMER | PROPOSED |
| `getNotification` | `GET /me/notifications/{notificationId}` | UC16, UC20 | CUSTOMER | PROPOSED |
| `markNotificationRead` | `PUT /me/notifications/{notificationId}/read` | UC16 | CUSTOMER | PROPOSED |
| `askAssistant` | `POST /assistant/queries` | UC17 | PUBLIC | OPTIONAL |
| `createPushSubscription` | `POST /me/push-subscriptions` | UC20 | CUSTOMER | OPTIONAL |
| `deletePushSubscription` | `DELETE /me/push-subscriptions/{subscriptionId}` | UC20 | CUSTOMER | OPTIONAL |
| `getAdminPayment` | `GET /admin/payments/{paymentId}` | supporting operation | ADMIN | PROPOSED |


## Validation

Run `python docs/api/validate_contract.py` from the repository root. The checker uses PyYAML, openapi-spec-validator, jsonschema, and pypdf.

The proposed design covers all 20 use cases and 90 alternative flows. The decision log records the approvals and evidence still needed.
