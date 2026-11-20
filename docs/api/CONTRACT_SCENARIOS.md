# MEDI-CINE - Contract scenarios

These scenarios record prerequisites, inputs, expected results, and postconditions for contract acceptance. The OpenAPI examples were checked against their schemas. These scenarios describe future backend verification, including concurrency and latency checks.

## Fixtures and the core booking sequence

Synthetic fixtures use Customer A `usr_demo_01`, Customer B `usr_demo_02`, Staff `stf_demo_01`, and Admin `adm_user_01` with opaque role-bound sessions. Movie `mov_demo_01` plays in room `rom_demo_01` at showtime `shw_demo_01`, starting at 2026-11-21T12:00:00Z. The film is 120 minutes and the cleaning interval is 15 minutes. Seats seat_a01/A1 and seat_a02/A2 are REGULAR and ACTIVE. The unit price is 100000 VND at pricingVersion 1. At T0=2026-11-20T10:00:00Z, the 600-second hold expires at 10:10:00Z. The hold and cleaning values are the approved defaults. The example review score is 4.

1. A `createHold` with showtimeId+both seatIds, key example_hold_key_0001 =>201 hld_demo_01, ACTIVE deadline10:10Z, both HELD.
2. A `createQuote` for hold, promotionCode=null, key example_quote_key_0001 =>201 qte_demo_01, subtotal200000,discount0,total200000. Optional DEMO10 fixture =>new qte_demo_02,total190000; never silently use this in the no-code sequence.
3. A confirms qte_demo_01, `createBooking` body holdId=hld_demo_01,quoteId=qte_demo_01,key example_booking_key_01 =>201 bkg_demo_01 PENDING, paymentStatus=null, issuance NOT_REQUESTED, both HELD; snapshot200000 immutable.
4. A `initiatePayment` body{} key example_payment_key_01 =>201 pay_demo_01 PENDING/READY URL, amount200000. Browser return ?success=true does not change status.
5. At10:02Z verified provider result matches payment+booking+ref+200000VND, active hold/showtime. `receivePaymentWebhook` returns IPN acknowledgment 00 after durable recording, worker commits SUCCESS booking/payment and both SOLD, issuance PENDING. `listBookingTickets` =>202 no QR until issuance READY, then200 tkt_demo_01(A1)/tkt_demo_02(A2), each UNUSED and owner-only QR.
6. At2026-11-21T11:45Z approved window [11:30Z, 12:15Z), Staff lookup/preview tkt_demo_01 =>200 VALID; `confirmAdmission` attempt atm_demo_01+ticket/showtime =>201 adm_demo_01, tkt_demo_01 USED, tkt_demo_02 UNUSED; repeated same attempt returns200 original; new attempt409. No money or seat change.
7. A now eligible review mov_demo_01 due SUCCESS+USED. submit rating4 =>201, second different-key duplicate409. Reporting cohort showtime includes200000 gross,2 sold seats,1 admission,capacity2 =>100% sale occupancy/50% admission. Late verified collections are excluded from booked revenue and reported under collectedAmount. Example report asOf must be after fixture state transitions when executing this sequence.

Each scenario below resets fixtures/state unless explicitly a retry/race continuation; OpenAPI individual schema examples are representation examples at their indicated context, not an assertion every resource exists simultaneously in PENDING core state.

## Source-flow scenarios

### UC01 — Browse Movies and View Movie Details

| Scenario / flow | Operation/event/client | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-U01-B01 / basic 1-4 | listMovies + CLIENT-FILTER | Visitor opens catalogue; search=Example, status=NOW_SHOWING | 200 MoviePage; filter/empty are read-only. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U01-B02 / basic 5-6 | getMovie + listShowtimes + listMovieReviews | Select mov_demo_01; query movieId=mov_demo_01 | 200 active movie metadata + showtimes/reviews; no mutation. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U01-B03 / basic 7 | CLIENT-NAVIGATE + getSeatMap | Select shw_demo_01 or leave detail | 200 SeatMap on selection; navigation only otherwise. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U01-A01 / §1.2.2.1, p11 | listMovies | No movies or search=NoMatch | 200 MoviePage items=[] | No state mutation; client clears filters/retries. |
| SC-U01-A02 / §1.2.2.2, p11 | getMovie + listShowtimes | Movie has zero active showtimes | 200 Movie + ShowtimePage items=[] | No hold; user returns catalogue. |
| SC-U01-A03 / §1.2.2.3, p11 | getMovie + listShowtimes | Backend cannot retrieve detail/schedule | 503 SERVICE_UNAVAILABLE | No fabricated data, retry safe. |

### UC02 — Select Seats

| Scenario / flow | Operation/event/client | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-U02-B01 / basic 1-2 | getShowtime + getSeatMap + EVT-SEAT | Public shw_demo_01 ACTIVE room/layout/prices | 200 current serverTime/epoch/version; live updates sanitized. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U02-B02 / basic 3-5 | CLIENT-SELECT | Highlight A1/A2 then confirm locally | No HTTP mutation until hold; UI summary provisional. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U02-B03 / basic 6-7 | createHold + getHold + EVT-SEAT | Customer A; seat_a01/seat_a02 AVAILABLE | 201 hld_demo_01 ACTIVE until10:10Z; both HELD; other viewers receive event. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U02-A01 / §2.2.2.1, p13 | createHold + login | Visitor confirms seats without token | 401 AUTH_REQUIRED; login200 then recheck | No seats held before authentication; cancel login client-only. |
| SC-U02-A02 / §2.2.2.2, p13 | createHold + getSeatMap + EVT-SEAT | Other customer holds A1 while A requests A1/A2 | 409 SEAT_CONFLICT, conflictingSeatIds=[seat_a01] | Neither A seat acquired; refresh current map; no owner leak. |
| SC-U02-A03 / §2.2.2.3, p13 | getSeatMap | All configured seats HELD/SOLD/unavailable | 200 snapshot with zero selectable seats | No hold attempt needed; select another showtime. |
| SC-U02-A04 / §2.2.2.4, p14 | CLIENT-SELECT | Deselect A2 before confirm hold | No HTTP endpoint | Only local highlight/provisional summary changes. |
| SC-U02-A05 / §2.2.2.5, p14 | JOB-HOLD-EXPIRY + getHold + EVT-SEAT | now>=10:10Z before payment completes | getHold200 status EXPIRED,remainingSeconds0 | Release only still-owned HELD; map AVAILABLE; retry new selection. |

### UC03 — Book Movie Tickets

| Scenario / flow | Operation/event/client | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-U03-B01 / basic 1-2 | getHold + createQuote | Owner hld_demo_01 live, promotionCode=null | 200 hold,201 qte_demo_01 itemized200000VND, no booking. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U03-B02 / basic 3-4 | CLIENT-PROMO + createQuote | Optional DEMO10 valid fixed10000 | 201 new quote total190000; no booking/payment. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U03-B03 / basic 5-7 | CLIENT-CONFIRM + createBooking | Confirm displayed qte_demo_01; body holdId+quoteId | 201 bkg_demo_01 PENDING, HELD, snapshot200000; no ticket. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U03-B04 / basic 8 | getBooking + CLIENT-NAVIGATE | New booking reference after commit | 200 PENDING remainingSeconds; navigate payment, not paid yet. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U03-A01 / §3.2.2.1, p16 | createBooking + JOB-HOLD-EXPIRY | hld_demo_01 expired before commit | 409 HOLD_EXPIRED | No PENDING created, seats released conditionally. |
| SC-U03-A02 / §3.2.2.2, p16 | releaseHold + CLIENT-CANCEL | Customer cancels before booking exists | 204 releaseHold | No PENDING/payment/ticket, owned HELD->AVAILABLE. |
| SC-U03-A03 / §3.2.2.3, p17 | createBooking + createQuote + CLIENT-CONFIRM | Pricing/promo version changes after qte_demo_01 | 409 QUOTE_STALE with currentQuote or reason; createQuote201 replacement | No booking until customer reviews/reconfirms; may cancel/release or expiry. |
| SC-U03-A04 / §3.2.2.4, p17 | createBooking | Existing matching PENDING bkg_demo_01 for same hold; new HTTP key | 200 existing bkg_demo_01 and old committed amount | Exactly one domain booking, HELD, no second payment. |
| SC-U03-A05 / §3.2.2.5, p17 | createBooking + getBooking | Persistence unavailable during creation; valid hold remains | 503 SERVICE_UNAVAILABLE; same-key/domain lookup retry | No incomplete booking reported; no payment/ticket; release on cancel/expiry. |

### UC04 — Make Payment

| Scenario / flow | Operation/event/client | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-U04-B01 / basic 1-3 | initiatePayment | PENDING bkg_demo_01 + live hold | 201 pay_demo_01 PENDING, server checkout URL; unique logical transaction. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U04-B02 / basic 4 | CLIENT-PAYMENT-RETURN | Follow provider URL then frontend /payment-return?status=success | Browser navigation only, polls getPayment/getBooking; no browser success authority. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U04-B03 / basic 5-7 | receivePaymentWebhook + getPayment + JOB-PAYMENT-RECONCILE | Raw verified result matches pay/bkg/ref200000VND; timely | IPN acknowledgment 00 after durable recording (02 duplicate); if verified timely SUCCESS; unknown PENDING+reconcile. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U04-B04 / basic 8-9 | EVT-SEAT + JOB-TICKET-ISSUE + JOB-NOTIFICATION + getBooking | Timely success committed, showtime ACTIVE | SOLD, booking/payment SUCCESS; issuance PENDING->READY, notification independent. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U04-A01 / §4.2.2.1, p20 | receivePaymentWebhook + EVT-PAYMENT-FAILED | Provider verified cancellation/decline while live | IPN acknowledgment 00 after durable recording, getPayment200 FAILED | Booking FAILED, conditional release HELD->AVAILABLE, no ticket. |
| SC-U04-A02 / §4.2.2.2, p20 | JOB-HOLD-EXPIRY + getPayment | Provider time window/hold deadline reached | getPayment200 EXPIRED, booking EXPIRED | Release allocations, no ticket; start new seats. |
| SC-U04-A03 / §4.2.2.3, p21 | initiatePayment + receivePaymentWebhook | Duplicate start new key, or duplicate provider event | 200 existing payment / IPN acknowledgment 02 for duplicate | No new charge/booking/ticket/event side effect. |
| SC-U04-A04 / §4.2.2.4, p21 | initiatePayment + receivePaymentWebhook + JOB-PAYMENT-RECONCILE | Provider create unreachable or unknown result/invalid callback | 503 before persist;202 pending if persisted uncertain;IPN acknowledgment 97 for invalid signature | PENDING unknown until verified/expiry; do not release due solely invalid callback. |
| SC-U04-A05 / §4.2.2.5, p21 | receivePaymentWebhook + JOB-PAYMENT-RECONCILE | EXPIRED booking/released seats then verified provider success | IPN acknowledgment 00 after durable recording; getPayment200 EXPIRED/providerOutcome SUCCESS | No SUCCESS booking/SOLD/ticket; money exception REQUIRED and notify. |

### UC05 — View and Retrieve E-Ticket

| Scenario / flow | Operation/event/client | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-U05-B01 / basic 1-3 | listBookingTickets + getTicket | Owner A selects SUCCESS bkg_demo_01 | 200 issued TicketPage/Ticket; strict owner+payment guard. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U05-B02 / basic 4-6 | getTicketQrImage + downloadTicket + CLIENT-DISPLAY | Issued tkt_demo_01/tkt_demo_02 | 200 image/png or application/pdf; UNUSED/USED current; no usage mutation. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U05-B03 / basic 7 | CLIENT-NAVIGATE | Customer closes view | No HTTP required; ticket state unchanged. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U05-A01 / §5.2.2.1, p23 | listBookingTickets | Owned booking/payment PENDING/FAILED/EXPIRED | 409 BOOKING_UNPAID | No valid QR, UI displays current booking/payment status. |
| SC-U05-A02 / §5.2.2.2, p23 | listBookingTickets | Booking/payment SUCCESS, issuer not ready | 202 TicketPending + Retry-After3 | No QR; stays SUCCESS/SOLD; retry issuing/polling unique tickets. |
| SC-U05-A03 / §5.2.2.3, p24 | getTicket + listBookingTickets | No session or Customer B accesses A ticket/booking | 401 AUTH_REQUIRED or404 RESOURCE_NOT_FOUND | No disclosure; login then owner recheck. |
| SC-U05-A04 / §5.2.2.4, p24 | getTicket + downloadTicket | Temporary ticket storage/download backend unavailable | 503 SERVICE_UNAVAILABLE | No booking/payment/usage mutation; retry. |
| SC-U05-A05 / §5.2.2.5, p24 | getTicket + downloadTicket | Owner reads previously USED ticket | 200 Ticket USED / binary PDF historical | No additional admission, retain usedAt. |

### UC06 — Register, Log In, and Manage Profile

| Scenario / flow | Operation/event/client | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-U06-B01 / basic 1a-1d | CLIENT-REGISTER + registerCustomer | Synthetic displayName/email/password, no role | 201 User CUSTOMER; no implicit login. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U06-B02 / basic 2a-2c | login + getSession + CLIENT-ROLE-ROUTE | Valid Customer/Staff/Admin credentials | 200 Session opaque token/expiry; role route display only, server enforces. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U06-B03 / basic 3a-3b | getProfile | Authenticated Customer A opens profile | 200 own User. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U06-B04 / basic 3c-3d | updateProfile + updateCredentials | displayName edit or old/new password input | 200 profile or204 credentials; credential change revokes sessions. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U06-B05 / basic 4a-4b | logout + CLIENT-LOGOUT | Any role active token | 204 invalidate server session; later protected request401. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U06-A01 / §6.2.2.1, p26 | registerCustomer + login + updateProfile | Missing email/password or empty displayName | 422 VALIDATION_ERROR (malformed JSON400) | No account/profile change, show field details. |
| SC-U06-A02 / §6.2.2.2, p27 | registerCustomer | Normalized email already exists | 409 ACCOUNT_EXISTS | No duplicate account, switch login. |
| SC-U06-A03 / §6.2.2.3, p27 | login | Bad password or inactive account | 401 INVALID_CREDENTIALS | No new session; same outward failure avoids credential leak. |
| SC-U06-A04 / §6.2.2.4, p27 | getReport + confirmAdmission | Customer requests Admin report or staff admission | 403 ROLE_FORBIDDEN; unauthenticated401 | No administrative/admission change; private data hidden. |

### UC07 — Manage Movie Catalogue

| Scenario / flow | Operation/event/client | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-U07-B01 / basic 1-2 | listAdminMovies | Admin authenticated | 200 includes active/inactive metadata, not public restriction. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U07-B02 / basic 3a-3d | CLIENT-FORM + createMovie | Valid MovieInput Example Film120minutes | 201 new Movie; audit persisted. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U07-B03 / basic 4a-4d | getAdminMovie + updateMovie | expectedVersion=1,title=Example Film 2 | 200 version2; validate duration schedule guards. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U07-B04 / basic 5a-5b | updateMovie | expectedVersion=2,status=INACTIVE | 200 deactivate for new discovery/scheduling, preserve history; no DELETE. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U07-A01 / §7.2.2.1, p29 | createMovie + updateMovie | title empty/duration0/malformed URL/unknown age config | 422 VALIDATION_ERROR | Atomic reject; prior movie unchanged. |
| SC-U07-A02 / §7.2.2.2, p29 | createMovie | Same normalized title+identifying attrs under ADR-identity proposal | 409 MOVIE_DUPLICATE | No duplicate; edit existing or correct metadata. |
| SC-U07-A03 / §7.2.2.3, p30 | updateMovie | Movie has active future shows/SUCCESS references, request INACTIVE | 200 safe deactivate new scheduling only | No hard deletion/history damage; existing show/ticket references retained. |
| SC-U07-A04 / §7.2.2.4, p30 | updateMovie | duration increase creates room overlap including cleaning | 409 DURATION_SCHEDULE_CONFLICT | Duration unchanged; adjust schedule before retry. |
| SC-U07-A05 / §7.2.2.5, p30 | listAdminMovies + createMovie | Staff/Customer targets admin movie endpoint | 403 ROLE_FORBIDDEN (401 if no session) | No movie mutation, authorization failure audit. |

### UC08 — Manage Cinema Rooms and Seats

| Scenario / flow | Operation/event/client | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-U08-B01 / basic 1-2 | listAdminRooms | Admin authenticated | 200 configured rooms/capacity/status. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U08-B02 / basic 3a-3d | CLIENT-FORM + createRoom | Room A,2D,rows1,columns2 | 201 rom_demo_01 with generated stable seat_a01/seat_a02 (fixture IDs). | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U08-B03 / basic 4a-4d | getAdminRoom + replaceRoomLayout | Full valid same-ID layout; expectedVersion current; no active refs | 200 layout version increment; configuration not inventory. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U08-B04 / basic 5a-5b | updateRoom | name/format/operationalStatus, expectedVersion | 200 if safe; future/historical capacity guards, audit. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U08-A01 / §8.2.2.1, p32 | createRoom + replaceRoomLayout | rows0,unknown format,duplicate label/out-of-bounds coordinate | 422 VALIDATION_ERROR/INVALID_LAYOUT/DUPLICATE_SEAT_LABEL | No partial grid/layout update. |
| SC-U08-A02 / §8.2.2.2, p33 | createRoom + updateRoom | Room name already assigned | 409 ROOM_NAME_DUPLICATE | No conflicting name saved. |
| SC-U08-A03 / §8.2.2.3, p33 | replaceRoomLayout + updateRoom | Active referenced showtime with HELD or SOLD seats | 409 LAYOUT_IN_USE | Existing room/seat/booking layout intact; wait completion/cancel safe shows. |
| SC-U08-A04 / §8.2.2.4, p33 | listAdminRooms + replaceRoomLayout | Non-Admin attempts room config | 403 ROLE_FORBIDDEN | No room/seat change. |

### UC09 — Manage Showtime Schedule

| Scenario / flow | Operation/event/client | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-U09-B01 / basic 1-2 | listAdminShowtimes | Admin date/movie/room/format filters | 200 schedule with statuses and occupiedUntil. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U09-B02 / basic 3a-3e | listAdminMovies + listAdminRooms + createShowtime | Active movie/room compatible; startsAt=2026-11-21T12:00Z,cleaning configured | 201 nonoverlapping showtime, ACTIVE inventory initialized; computed end14:00Z+15m fixture. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U09-B03 / basic 4a-4c | getAdminShowtime + updateShowtime | expectedVersion; unbooked room/time update or DRAFT->ACTIVE | 200 validated room window; ACTIVE seat snapshot initialized once. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U09-B04 / basic 5a-5b | getCancellationImpact + CLIENT-CONFIRM + cancelShowtime + JOB-SHOWTIME-CANCEL | Current impact token+explicit confirm+reason | 202 CANCELLED/PROCESSING, slot released, admissions/new selection fenced, background resolution. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U09-A01 / §9.2.2.1, p35 | createShowtime + updateShowtime | Movie120m at12:00+cleaning15, next proposed14:10 same room | 409 SCHEDULE_OVERLAP | No overlapping showtime;14:15 boundary allowed. |
| SC-U09-A02 / §9.2.2.2, p36 | createShowtime + updateShowtime | Past start/inactive movie/room/incompatible format or invalid configuration | 422 INVALID_REFERENCE/VALIDATION_ERROR/CLEANING_INTERVAL_UNCONFIGURED | No schedule saved. |
| SC-U09-A03 / §9.2.2.3, p36 | updateShowtime + getCancellationImpact + cancelShowtime + JOB-SHOWTIME-CANCEL | HELD/SOLD exists: attempt reschedule; separately explicitly cancel | 409 SHOWTIME_HAS_RESERVATIONS on room/time change;202 confirmed cancellation | Reschedule blocked; cancellation fences new sale/admission, notifies and queues refund/status handling Q-03. |
| SC-U09-A04 / §9.2.2.4, p36 | createShowtime + cancelShowtime | Customer/Staff attempts schedule management | 403 ROLE_FORBIDDEN | No change, audit denial. |

### UC10 — Manage Ticket Pricing

| Scenario / flow | Operation/event/client | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-U10-B01 / basic 1-2 | listAdminPriceRules | Admin opens pricing table | 200 seat-type/category rules. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U10-B02 / basic 3a-3d | CLIENT-FORM + createPriceRule | REGULAR/WEEKDAY amount100000 currencyVND | 201 unique positive rule. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U10-B03 / basic 4a-4d | getAdminPriceRule + updatePriceRule | expectedVersion=1,amount110000 | 200 version2; future quotes new amount, old committed bookings unchanged. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U10-A01 / §10.2.2.1, p38 | createPriceRule + updatePriceRule | amount0/negative/non-integer/missing | 422 VALIDATION_ERROR | No price update. |
| SC-U10-A02 / §10.2.2.2, p38 | createPriceRule | Active REGULAR/WEEKDAY rule exists | 409 PRICE_RULE_DUPLICATE | One current rule combination, no duplicate. |
| SC-U10-A03 / §10.2.2.3, p39 | updatePriceRule + createQuote + createBooking | Change100000->110000 while live holds + PENDING/SUCCESS bookings | 200 new rule; held old quote createBooking409 QUOTE_STALE | Existing PENDING/SUCCESS snapshot untouched; new quotes use new price, explicit re-confirm. |
| SC-U10-A04 / §10.2.2.4, p39 | listAdminPriceRules + updatePriceRule | Staff/Customer accesses pricing admin | 403 ROLE_FORBIDDEN | No pricing read/mutation. |

### UC11 — View Booking History

| Scenario / flow | Operation/event/client | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-U11-B01 / basic 1-3 | listBookings | Owner A status optional; no other Customer filter | 200 own chronological current/history list. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U11-B02 / basic 4-5 | getBooking | bkg_demo_01 owner A | 200 snapshot items/payment/current status/deadline; ticket state via listBookingTickets. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U11-B03 / basic 6 | listBookingTickets + getTicket | SUCCESS booking, actual issued tickets | 200 QR ticket; 202 if paid issuance pending, no usage mutation. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U11-A01 / §11.2.2.1, p41 | listBookings | Owner has no booking | 200 items=[],nextCursor=null | Client offers browse; no state change. |
| SC-U11-A02 / §11.2.2.2, p41 | getBooking | Owned FAILED/EXPIRED booking selected | 200 with failureReason/status/snapshot | No valid ticket and seats no longer reserved; show history. |
| SC-U11-A03 / §11.2.2.3, p41 | getBooking + getHold | Owned pending or recently expired record | 200 latest status,remainingSeconds,expiresAt | Read-only; if pending+valid allow payment, expired no seat claim. |
| SC-U11-A04 / §11.2.2.4, p42 | listBookings + login | Missing/expired session | 401 AUTH_REQUIRED; login then retry | No foreign history exposure. |
| SC-U11-A05 / §11.2.2.5, p42 | listBookings + getBooking | Backend/network cannot load history/detail | 503 SERVICE_UNAVAILABLE or client transport error | Safe retry, no records modified. |

### UC12 — Validate E-Ticket and Record Admission

| Scenario / flow | Operation/event/client | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-U12-B01 / basic 1-3 | listAdmissionShowtimes + CLIENT-CAMERA | Staff/Admin select shw_demo_01, local webcam QR decode | 200 showtimes; camera/browser permission is client-only. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U12-B02 / basic 4-6 | lookupTicket + previewAdmission | tkt_demo_01 UNUSED, booking/payment SUCCESS, active/window allowed | 200 preview VALID/NONE with seat/movie/showtime; not USED. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U12-B03 / basic 7-8 | CLIENT-CONFIRM + confirmAdmission | Staff confirm attemptId=atm_demo_01 plus showtime/ticket | 201 admission adm_demo_01, atomic ticket USED and audit. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U12-A01 / §12.2.2.1, p44 | CLIENT-CAMERA + lookupTicket + previewAdmission | Camera permission denied/unreadable QR; manual known ID | lookup200 then preview200; cancel no API | No admission/USED until confirm, retry scan or leave. |
| SC-U12-A02 / §12.2.2.2, p44 | previewAdmission + confirmAdmission | tkt_demo_01 already USED by earlier attempt | 200 USED/ALREADY_USED preview;409 TICKET_ALREADY_USED new confirm | Return prior usedAt to authorized staff; no second admission. |
| SC-U12-A03 / §12.2.2.3, p44 | previewAdmission + confirmAdmission | Well-formed unknown QR/ID; bad QR signature | 200 INVALID/NOT_FOUND; confirm404 TICKET_NOT_FOUND | No usage state change, staff denies/retries. |
| SC-U12-A04 / §12.2.2.4, p45 | previewAdmission + confirmAdmission | Defensive record exists but booking/payment not SUCCESS | 200 INVALID/UNPAID;409 UNPAID_TICKET | No admission or valid ticket creation. |
| SC-U12-A05 / §12.2.2.5, p45 | previewAdmission + confirmAdmission | Paid UNUSED ticket for other/cancelled/out-of-window showtime | 200 INVALID with WRONG_SHOWTIME/SHOWTIME_CANCELLED/OUTSIDE_WINDOW; confirm409 corresponding code | Ticket not USED; future ticket preserved; cancelled fenced. |
| SC-U12-A06 / §12.2.2.6, p45 | previewAdmission + confirmAdmission | Customer role or unauthenticated caller | 403 ROLE_FORBIDDEN or401 AUTH_REQUIRED | No validation/private ticket data/admission mutation. |

### UC13 — View Dashboard and Reports

| Scenario / flow | Operation/event/client | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-U13-B01 / basic 1-3 | getDashboard | Admin from/to required; cohort shw_demo_01 | 200 gross revenue200000, collectedAmount200000, refundedAmount0, pendingAmount0, pendingRefundAmount0, sold2,admissions1,capacity2,occupancy100,admission50. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U13-B02 / basic 4-5 | CLIENT-FILTER + getReport | groupBy=SHOWTIME,date range/movies/room valid | 200 authoritative consistent asOf rows; no financial mutation. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U13-B03 / basic 6 | CLIENT-DISPLAY | Admin reviews report | No additional API for view/export. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U13-A01 / §13.2.2.1, p47 | getDashboard + getReport | No eligible cohort data | 200 zeros, rows=[] | No divide-by-zero; no mutation. |
| SC-U13-A02 / §13.2.2.2, p47 | getReport | from>to or invalid filter/range | 400 INVALID_QUERY | Retain client previous view, no report/record mutation. |
| SC-U13-A03 / §13.2.2.3, p47 | getReport | Mix SUCCESS200000/2SOLD with PENDING/FAILED/EXPIRED/HELD | 200 revenue200000,ticketsSold2 | Exclude all unconfirmed revenue and held seats; no join double count. |
| SC-U13-A04 / §13.2.2.4, p48 | getDashboard + getReport | Staff/Customer requests reports | 403 ROLE_FORBIDDEN; no token401 | No revenue/private report disclosure. |

### UC14 — Submit Movie Reviews and Ratings

| Scenario / flow | Operation/event/client | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-U14-B01 / basic 1-3 | getReviewEligibility + CLIENT-FORM | Owner has SUCCESS+USED for mov_demo_01 | 200 eligible=true; render submission form. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U14-B02 / basic 4-7 | submitMovieReview + listMovieReviews + getMovie | rating4,text=Great film. unique Customer/movie | 201 Review, public list updates; average/count updated, no PII/booking IDs. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U14-A01 / §14.2.2.1, p49 | getReviewEligibility + submitMovieReview | Customer has SUCCESS but no USED for selected movie, or USED other movie | 200 eligible=false; submit403 REVIEW_INELIGIBLE | No review/rating change. |
| SC-U14-A02 / §14.2.2.2, p49 | submitMovieReview | rating0/6/fraction/missing or text>2000 | 422 VALIDATION_ERROR | No review saved. |
| SC-U14-A03 / §14.2.2.3, p49 | submitMovieReview | Customer/movie review exists under different HTTP key | 409 REVIEW_ALREADY_EXISTS | No duplicate, notify recorded; no edit endpoint. |
| SC-U14-A04 / §14.2.2.4, p50 | submitMovieReview + login | Visitor submits review without session | 401 AUTH_REQUIRED then login/eligibility check | No review until auth+eligibility verified. |

### UC15 — Manage Promotions and Discount Codes

| Scenario / flow | Operation/event/client | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-U15-B01 / basic 1-2 | listAdminPromotions | Admin opens promotion management | 200 code/conditions/period/status. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U15-B02 / basic 3a-3d | CLIENT-FORM + createPromotion | DEMO10 fixed10000,dates ordered,active conditions valid | 201 unique promotion; no retroactive discount. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U15-B03 / basic 4a-4d | getAdminPromotion + updatePromotion | expectedVersion1,changes valid | 200 new version used future quotes only. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U15-B04 / basic 5a-5b | updatePromotion | expectedVersion current,active=false | 200 inactive for new quotes, historical discounts retained. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U15-A01 / §15.2.2.1, p51 | createPromotion + updatePromotion | Empty code/negative/excessive percent/end<=start | 422 VALIDATION_ERROR | No promotion change. |
| SC-U15-A02 / §15.2.2.2, p52 | createPromotion + updatePromotion | Code DEMO10 already exists another record | 409 PROMOTION_CODE_DUPLICATE | No duplicate identifier. |
| SC-U15-A03 / §15.2.2.3, p52 | updatePromotion + createQuote + createBooking | Deactivate code used by live hold/PENDING/SUCCESS | 200 update, future quote422 PROMOTION_INVALID; stale confirm409 QUOTE_STALE | Preserve committed discounts; hold-only quote requires review/reconfirm. |
| SC-U15-A04 / §15.2.2.4, p52 | listAdminPromotions + updatePromotion | Staff/Customer attempts promotion admin | 403 ROLE_FORBIDDEN | No restricted configuration exposure/mutation. |

### UC16 — View Notifications and Reminders

| Scenario / flow | Operation/event/client | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-U16-B01 / basic 1-3 | JOB-NOTIFICATION + JOB-REMINDER + listNotifications | Owner A has persisted event-based records | 200 chronological readAt null/non-null; GET no mutation. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U16-B02 / basic 4-5 | getNotification + markNotificationRead + CLIENT-DISPLAY | GET detail succeeds, then explicit PUT read | 200 current detail then200 readAt; suppress stale cancelled/USED reminders. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U16-B03 / basic 6-8 | getBooking + listBookingTickets + getMovie + CLIENT-NAVIGATE | Related booking SUCCESS/ticket ready or promotion | 200 allowed related resources; no implicit read on push dismissal. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U16-A01 / §16.2.2.1, p54 | listNotifications | Owner no notification records | 200 items=[] | No state change; browse link client-only. |
| SC-U16-A02 / §16.2.2.2, p54 | listNotifications + getNotification | Store/linked current data unavailable | 503 SERVICE_UNAVAILABLE | Do not display unverified current state; GET failure no implicit mark-read. |
| SC-U16-A03 / §16.2.2.3, p54 | getNotification + getBooking + getTicket | Old reminder now cancelled showtime or USED ticket | 200 currentShowtimeStatus CANCELLED or currentTicketStatus USED | Display latest state, no stale valid admission/booking claim. |
| SC-U16-A04 / §16.2.2.4, p55 | listNotifications + getNotification + login | Missing/expired Customer session | 401 AUTH_REQUIRED | No private records; reauthenticate then recheck owner. |

### UC17 — Use AI Movie and Showtime Assistant

| Scenario / flow | Operation/event/client | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-U17-B01 / basic 1-2 | getCapabilities + CLIENT-ASSISTANT | AI enabled, show discovery prompt examples | 200 flags; UI prompt only. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U17-B02 / basic 3-6 | askAssistant | Public sanitized query:Find drama films that are currently showing | 200 grounded real movie/showtime cards, no PII or mutation. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U17-B03 / basic 7 | getMovie + getSeatMap + CLIENT-NAVIGATE | Select validated recommendation mov_demo_01/shw_demo_01 | 200 authoritative details/map; still must authenticate to hold. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U17-A01 / §17.2.2.1, p56 | askAssistant | Enabled, no authoritative matches to query | 200 recommendations=[] plus search fallback | No fabricated movies/showtimes; core unchanged. |
| SC-U17-A02 / §17.2.2.2, p56 | askAssistant | Empty/>1000/malformed/out-of-scope/pay-or-hold prompt | 422 VALIDATION_ERROR or ASSISTANT_QUERY_UNSUPPORTED | No operational action, no forwarding secrets. |
| SC-U17-A03 / §17.2.2.3, p57 | getCapabilities + askAssistant | Feature disabled/provider timeout/quota failure | flags aiEnabled=false or503 FEATURE_DISABLED/AI_UNAVAILABLE | Static standard /movies browsing fallback; booking unaffected. |

### UC18 — Apply Promotions and Discount Codes

| Scenario / flow | Operation/event/client | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-U18-B01 / basic 1-3 | CLIENT-PROMO + getHold | Owner live hld_demo_01 enters code | No domain mutation; review quote/current time. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U18-B02 / basic 4-6 | createQuote | promotionCode=DEMO10,subtotal200000,fixed10000 | 201 valid quote total190000 with itemized allocation; no booking/payment. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U18-B03 / basic 7 | CLIENT-CONFIRM + createBooking | Explicit acceptance of newest quoteId | 201 PENDING snapshot, UC03 owns creation. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U18-A01 / §18.2.2.1, p59 | createQuote | Code absent/inactive/expired/not found | 422 PROMOTION_INVALID | No new discounted quote; original base price retained, retry another/null. |
| SC-U18-A02 / §18.2.2.2, p59 | createQuote | Valid code but minimum/seat/movie conditions not satisfied | 422 PROMOTION_INELIGIBLE | No discount; no sensitive admin rule leak. |
| SC-U18-A03 / §18.2.2.3, p59 | createQuote + CLIENT-PROMO | Previously DEMO10 then promotionCode=null or replacement | 201 new quote with restored base or new valid discount | No stacking; no old quote auto-confirm, no booking mutation. |
| SC-U18-A04 / §18.2.2.4, p60 | createQuote + JOB-HOLD-EXPIRY | Hold expires during applying code | 409 HOLD_EXPIRED | No quote used for booking; conditional release, reselect. |
| SC-U18-A05 / §18.2.2.5, p60 | createQuote | Promotion data service unavailable | 503 PROMOTION_SERVICE_UNAVAILABLE | No unverified discount; retry while live or new null quote; base unchanged. |

### UC19 — Manual Identifier Lookup

| Scenario / flow | Operation/event/client | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-U19-B01 / basic 1-3 | CLIENT-MANUAL-LOOKUP | Staff cannot scan; obtains readable tkt_demo_01 | No incomplete server call; manually enter opaque ID. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U19-B02 / basic 4-6 | lookupTicket | ticketIdentifier=tkt_demo_01 valid format | 200 minimal ticket/showtime/seat, no QR/usage change. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U19-B03 / basic 7 | CLIENT-NAVIGATE + previewAdmission | Staff selects matched record | 200 validation result via UC12; still no admission until confirm. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U19-A01 / §19.2.2.1, p62 | lookupTicket | ticketIdentifier empty/format invalid | 422 VALIDATION_ERROR | No lookup result/admission; correct input. |
| SC-U19-A02 / §19.2.2.2, p62 | lookupTicket | Well-formed tkt_unknown_01 absent | 404 TICKET_NOT_FOUND | No record selected, no admission. |
| SC-U19-A03 / §19.2.2.3, p62 | CLIENT-MANUAL-LOOKUP | Customer cannot provide complete identifier | No HTTP request for incomplete field | Ask customer to retrieve ticket via history; otherwise exit. |
| SC-U19-A04 / §19.2.2.4, p63 | lookupTicket | Authoritative lookup unavailable | 503 SERVICE_UNAVAILABLE | No unverified success; retry/exit. |
| SC-U19-A05 / §19.2.2.5, p63 | CLIENT-CANCEL | Staff cancels manual lookup/returns scanner | No HTTP admission endpoint invoked | Pending read response may be ignored; no ticket state modified. |

### UC20 — Receive PWA Push Notifications

| Scenario / flow | Operation/event/client | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-U20-B01 / basic 1-3 | createPushSubscription + JOB-NOTIFICATION + JOB-PUSH-DISPATCH | OPTIONAL enabled, permission granted, eligible in-app record, active owner device | 201 subscription; job submits minimal title/summary/notificationId to push service, no core dependency. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U20-B02 / basic 4-5 | CLIENT-SERVICE-WORKER | Service accepted and browser receives push | Browser may display/open/dismiss; acceptance not guaranteed delivery; no read mutation. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U20-B03 / basic 6-7 | getNotification + getBooking + getTicket + CLIENT-NAVIGATE | Customer opens online; active owner session | 200 latest detail/linked resource; optional mark read only explicit Notifications detail flow. | The outcome follows the guards and concurrency rules in STATE_AND_EVENTS.md. Client-only actions leave domain state unchanged. |
| SC-U20-A01 / §20.2.2.1, p65 | JOB-PUSH-DISPATCH + deletePushSubscription + CLIENT-PERMISSION | Inactive/unsupported/revoked permission/subscription | No push submit; DELETE204 when online owner cleanup | In-app record available; no operational change. |
| SC-U20-A02 / §20.2.2.2, p65 | JOB-PUSH-DISPATCH | Push service timeout/5xx/rejects submission | Record retry/failure, never assert delivered | Core transaction remains; in-app record available; stale410 deactivates. |
| SC-U20-A03 / §20.2.2.3, p65 | CLIENT-OFFLINE | Device loses network before push/current-detail fetch | No guarantee delivery/current details; cached summary labelled offline | No offline payment/admission; resume online GET on reconnect. |
| SC-U20-A04 / §20.2.2.4, p66 | getNotification + login | Open push without active session | 401 AUTH_REQUIRED; login then owner check | No private notification disclosure. |
| SC-U20-A05 / §20.2.2.5, p66 | getNotification + getBooking + getTicket | Related state changed since push original summary | 200 latest status, not cached assumption | No mutation; render cancelled/USED/current state. |
| SC-U20-A06 / §20.2.2.6, p66 | CLIENT-PUSH-DISMISS | User dismisses or ignores delivered push | No REST mark-as-read | readAt unchanged; notification remains in list. |

## Additional concurrency, retry, privacy, and recovery scenarios

| ID | UC / operations/internal | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-X-SEAT-RACE | UC02 / createHold + getSeatMap | A/B authenticated, both target seat_a01 with distinct keys simultaneously | One201 ACTIVE, other409 SEAT_CONFLICT, no owner leak | One authoritative hold only; repeated50+ load is future implementation test. |
| SC-X-PARTIAL | UC02 / createHold | A2 AVAILABLE, A1 HELD by B; A requests both | 409 SEAT_CONFLICT context.conflictingSeatIds=[seat_a01] | A2 still AVAILABLE; no partial lock. |
| SC-X-FOREIGN-HOLD | UC02/03/18 / getHold + createQuote + createBooking + releaseHold | B supplies A holdId/quoteId | 404 RESOURCE_NOT_FOUND for right Customer role | No disclosure/release/booking; A allocation unchanged. |
| SC-X-QUOTE-EXPIRY | UC03/18 / createBooking + createQuote | quote expiry before hold expiry, no existing booking | 409 QUOTE_EXPIRED; currentQuote when available, otherwise createQuote201 | No booking; hold original deadline; explicit review/confirm new quote. |
| SC-X-IDEMPOTENCY | UC03/04 / createBooking + initiatePayment | Same scope/key body differs or same request in-flight | 409 IDEMPOTENCY_KEY_REUSED / IDEMPOTENCY_IN_PROGRESS+retryAfterSeconds | No duplicate state; same completed key/fingerprint replays original status/body. |
| SC-X-KEY-EXPIRY | UC03/04/12 / createBooking + initiatePayment + confirmAdmission | HTTP key retention passed, domain entity already exists | Get current status; booking/payment domain reuse or terminal409, admission new attempt409 | Uniqueness survives expired HTTP retry cache. |
| SC-X-INVALID-SIGNATURE | UC04 / receivePaymentWebhook | Bad/missing actual provider signature, otherwise success-looking body | IPN acknowledgment 97 | No SUCCESS/release/ticket, safe audit no secrets. |
| SC-X-PAYMENT-MISMATCH | UC04 / receivePaymentWebhook | Verified signature but amount199999/currency!=VND or wrong booking/ref | IPN acknowledgment 04 for an amount mismatch or 01 for an unknown reference | Quarantine, no domain transition; reconcile discrepancy, not unchecked success. |
| SC-X-PROVIDER-ORDER | UC04 / receivePaymentWebhook + JOB-PAYMENT-RECONCILE | Commit signed success for merchant DEMOV210, reference BOOKING001, transaction 12996460, amount 20000000, codes 00/00. Sign a different outcome for the same identity using codes 24/02. Replay the original and the conflicting payload separately. | Original acceptance 00. The new signed conflict returns 00 only after the evidence and QueryDr work item are durable. Each exact replay returns 02 after its fingerprint has been accepted. If conflict persistence fails, return 99 and reevaluate the retry. | verificationStatus=CONFLICT until verified. Preserve SUCCESS/SOLD and existing tickets. No duplicate fulfillment or QueryDr job for the same accepted fingerprint. |
| SC-X-GATEWAY-UNKNOWN | UC04 / initiatePayment + getPayment | Provider accepted create but network response lost | 202 existing pay_demo_01 PENDING/sessionStatus CREATING or UNAVAILABLE | Retry query same stable reference; no new payment/charge/key workaround. |
| SC-X-PAYMENT-EXPIRY-RACE | UC04 / receivePaymentWebhook + JOB-HOLD-EXPIRY | Provider result processing competes expiry at10:10Z | At commit now<deadline success can win. At or after the deadline expiry wins. IPN acknowledgment follows durable recording | Either SUCCESS+SOLD unique or EXPIRED+release+money resolution; never sell to both. |
| SC-X-LATE-SUCCESS-RESOLD | UC04 / receivePaymentWebhook | Expired A booking, A1 already SOLD to B, verified A payment success arrives | IPN acknowledgment 00 after durable recording, A payment status EXPIRED/providerOutcome SUCCESS | B sale intact; no A QR/booking success/reacquire; finance queue REQUIRED. |
| SC-X-TICKET-RETRY | UC04/05 / listBookingTickets + JOB-TICKET-ISSUE | SUCCESS/SOLD, issuer writes first seat then crashes | 202 until all tickets ready, retry unique booking+seat | Eventually two tickets max; no fake QR, no re-payment or rollback sale. |
| SC-X-FOREIGN-TICKET | UC05 / getTicket + downloadTicket + getTicketQrImage | B guesses A ticket; alternatively Admin calls Customer endpoint | 404 for Customer B;403 Admin role | No ticket/QR/private data, no usage mutation. |
| SC-X-LOOKUP-NO-ADMISSION | UC19/12 / lookupTicket + previewAdmission | Staff lookup/preview UNUSED paid ticket repeatedly | 200 metadata/VALID | UNUSED, no admission record until explicit confirm. |
| SC-X-PREVIEW-RACE | UC12 / previewAdmission + confirmAdmission | Staff1 preview VALID, Staff2 confirms first, Staff1 then confirms distinct attempt | First201, stale-preview confirm409 TICKET_ALREADY_USED | Exactly one admission; preview has no authority reservation. |
| SC-X-CHECKIN-RETRY | UC12 / confirmAdmission | Two parallel different attempts same ticket; then replay successful same actor/attempt | One201, loser409; same attempt different key200 original; attempt reuse different ticket409 ADMISSION_ATTEMPT_REUSED | One admission only, ticket USED; no false duplicate for completed same logical retry. |
| SC-X-WINDOW | UC12 / previewAdmission + confirmAdmission | Fresh eligible ticket in each test. Show at 12:00Z. Attempt at 11:29:59.999Z, 11:30Z, 12:14:59.999Z, and 12:15Z. | Reject, allow, allow, reject respectively. No Staff override. A cancelled show is rejected even within the window. | Only successful confirmation marks the ticket USED. |
| SC-X-CANCEL-STALE | UC09 / getCancellationImpact + cancelShowtime | Impact showed1booking; another hold/payment changes affected counts before confirm | 409 CANCELLATION_IMPACT_STALE, refetch warning | Showtime unchanged until current explicit confirmation; no silently expanding impact. |
| SC-X-CANCEL-RACE | UC04/09/12 / cancelShowtime + receivePaymentWebhook + confirmAdmission | Confirmed cancel concurrent payment success/admission | Serialize showtime fence; cancel202, late payment money queue; post-fence confirm409 SHOWTIME_CANCELLED | No post-cancel new sale/admission; earlier committed financial/admission evidence retained Q-03. |
| SC-X-LAYOUT-DURATION | UC07/08/09 / updateMovie + replaceRoomLayout + updateRoom | Active future showtime HELD/SOLD; destructive layout or duration overlap | 409 LAYOUT_IN_USE/DURATION_SCHEDULE_CONFLICT | Layout IDs, history capacity, price and ticket snapshots unchanged. |
| SC-X-PUSH-OWNERSHIP | UC20 / createPushSubscription + deletePushSubscription | B tries use A active endpoint/device; or delete A subscription | 409 PUSH_ENDPOINT_OWNED_BY_OTHER /404 RESOURCE_NOT_FOUND | No cross-account push transfer; owner unsubscribe/revoke first. |
| SC-X-PUSH-STALE | UC20 / JOB-PUSH-DISPATCH | Service response410 on stored endpoint; or permission revoked offline | Deactivate stale subscription; no claim delivered, in-app remains | Core payment/booking/ticket SUCCESS unaffected; cleanup/retry other devices independent. |
| SC-X-NOTIFICATION-ISOLATION | UC16/20 / JOB-NOTIFICATION + JOB-PUSH-DISPATCH + getNotification | Payment confirmed, notification storage or email/push service fails | Retry durable notification intent; retrieval503 if unavailable | SUCCESS/SOLD/ticket issuance continue, no rollback; no premature mark read. |
| SC-X-AI-SAFETY | UC17 / askAssistant | Prompt includes PII/request to pay/hold or provider fabricates inactive showtime | 422 unsupported for mutating prompt; filter/drop unknown output,200 [] or503 AI_UNAVAILABLE | No hold/book/pay tools/PII sent; normal catalogue available. |
| SC-X-WSS-GAP | UC02 / getSeatMap + EVT-SEAT | Snapshot version42, event43 before subscribe; reconnect duplicate/out-of-order44/43; epoch mismatch | Replay43 after subscribe; duplicates ignored; gap/epoch => resync_required | Never miss between snapshot and subscription; REST authority before hold. |
| SC-X-ACCOUNT | UC06 / login + registerCustomer | Staff and Admin are provisioned through deployment configuration. Customer injects ADMIN at registration. | Preconfigured Staff/Admin can log in. Registration injection returns 422 VALIDATION_ERROR. | The HTTP API exposes no privileged account administration operations. |
| SC-X-ADMIN-PAYMENT | Supporting SAD §4.8 p29 / getAdminPayment | Admin reads late pay_demo_01; Staff tries same | 200 authoritative payment with reconciliation REQUIRED; Staff403 | Read only; no implied refund execution or Customer permission inheritance. |
| SC-X-RECOVERY | UC02/04/05 / JOB-PAYMENT-RECONCILE + JOB-TICKET-ISSUE + EVT-SEAT | Crash after durable provider receipt/local SUCCESS before cache/event/ticket publish | Inbox/recovery replay, authoritative getBooking SUCCESS+issuance PENDING; listTickets202 | No lost success or double sale; replay durable intents, eventually READY; cache/WSS resync. |
| SC-X-ZERO-AMOUNT | UC18/03 / createQuote + createBooking | A discount brings the amount to zero. Repeat with a 4,999 VND total under the published 5,000 VND gateway minimum. | 422 ZERO_PAYABLE_UNSUPPORTED or 422 PAYMENT_BELOW_GATEWAY_MINIMUM, respectively. A 5,000 VND total clears the minimum check. | No ineligible quote is confirmed or sent to VNPAY. |

## Additional contract scenarios

| ID | UC / operations | Prerequisite + input | Expected response/outcome | Post-state |
| --- | --- | --- | --- | --- |
| SC-X-GEOMETRY | UC02 / getSeatMap + EVT-SEAT | Public shw_geometry_01 layoutVersion7,2rows/3cols; Blue at1,1; Moon at1,3; Leaf OOS at2,1; Sun at2,3 | 200 snapshot geometryWithAisle; blank column2 both rows, no label parsing/Admin request; Leaf nonselectable state/price null | Layout reconstructible from response alone; events update inventory by seatId; layout change => WSS LAYOUT_CHANGED resync. |
| SC-X-SHOWTIME-GUARDS | UC09 / updateShowtime | Separate cases HELD then SOLD on existing showtime; request movieId=mov_other_01 or pricingCategory=WEEKEND with current expectedVersion | 409 SHOWTIME_HAS_RESERVATIONS for each actual reassignment; room/time same protection | Movie/category/booking/QR/prices/history unchanged, no implicit migration. |
| SC-X-SHOWTIME-TRANSITIONS | UC09 / updateShowtime + cancelShowtime | Cases ACTIVE + status DRAFT; CANCELLED + ACTIVE; COMPLETED + ACTIVE; unreserved DRAFT valid edit/activation | 422 invalid DRAFT target; terminal sources409 SHOWTIME_TERMINAL; safe DRAFT edit/activation200 after overlap/ref/layout checks | No cancellation bypass or revival; explicit warned cancel remains202; valid unreserved updates work. |
| SC-X-SHOWTIME-UPDATE-RACE | UC02/04/09/12 / updateShowtime + createHold + receivePaymentWebhook + confirmAdmission | Admin edit and Customer hold/paid sale compete on same showtime | Common serialization: reservation first=>edit409; safe edit first=>new holds/quotes validate current version; admission rechecks current source | No mixed movie/seat inventory or sold history corruption. |
| SC-X-PROFILE-CONCURRENCY | UC06 / updateProfile + getProfile | Customer A, two keys; bodies displayName=Name A then Name B, commits ordered; same-key replay and phantom expectedVersion separately | Both edits200; GET Name B latest; replay earlier key returns original Name A; adding expectedVersion422 | Last successful commit wins, same-key replay no extra mutation; no profile version required. |
| SC-X-EXAMPLE-SEMANTICS | UC04/05/13 / initiatePayment + listBookingTickets + getReport | Inspect actual YAML examples with two-seat bkg_demo_01 and recorded admission11:45:01Z | 202 session CREATING/null URL; READY list has both seat IDs unique; report asOf12:01Z after admission | Contract examples consistent, validated with semantic assertions; no backend performance test. |

## Planned NFR acceptance execution

NFR-01..NFR-10 in TRACEABILITY.md are the source-linked acceptance scenarios for future implementation/UI environments. Use their operations, dataset/environment and pass conditions as execution checklist; record measured timing, role matrix results, browser screenshots, sanitized logs and setup/demo evidence when a build exists. All are **NOT RUN**, independent of schema/static checks. Contract validation does not count as a passing backend NFR scenario. These checks add no HTTP endpoints or invented approved numeric UI/accessibility threshold.


## Approved policy regression scenarios

| ID | Input and action | Expected outcome |
| --- | --- | --- |
| SC-X-VNPAY-VERIFY | Browser return claims success ahead of IPN. Send signed matching IPN, then repeat it and cross-check QueryDr. | Browser return changes no state. Match merchant and reference and expect vnp_Amount=20000000 for 200000 VND. A verified timely success fulfills once. Return 02 on duplicate IPN. |
| SC-X-AUTHORIZED-REFUND | A valid payment arrives after expiry and seat release, or the cinema cancels a paid showtime. Try refund approval with only SHOWTIME_CANCEL, then with REFUND_APPROVE. | Deny the first approval. Audit and approve the eligible full amount with REFUND_APPROVE. Keep the booking terminal and prevent duplicate refund submission. Pending and confirmed refunds appear separately. |
| SC-X-FINANCE-LEDGER | Verify a late collection of 200000 VND, authorize a full refund, then verify the refund. Separately leave another payment of 100000 VND in conflict. | Collection remains 200000. Pending refund is 200000 before confirmation and zero after. Refunded rises to 200000 on verification. Pending collection remains 100000 while unverified. No new ticket. |
| SC-X-ROUNDING | Quote a 5,001 VND subtotal at 50% before caps and minimum validation. | Booking-level discount rounds from 2500.5 to 2501 VND. A 2,500 VND total fails the gateway minimum. No second percentage rounding per seat. |
| SC-X-MOVIE-TITLE | Create a movie whose normalized title matches another, with different duration or age rating. | Write succeeds with titleReviewRequired=true. A match on normalized title, duration, and age rating still returns MOVIE_DUPLICATE. An unapproved classification or incompatible format configuration is rejected. |
| SC-X-CANCEL-PERMISSION | Admin has REFUND_APPROVE only and attempts cancelShowtime. Repeat with a separately assigned SHOWTIME_CANCEL permission and a valid impact token. | First returns 403 PERMISSION_REQUIRED. Second can cancel and is audited. Cancellation queues eligible refunds without approving them. |
