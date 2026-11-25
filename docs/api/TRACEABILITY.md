# MEDI-CINE - Traceability

UCS denotes `pa/pa3/Use_Case_Specification_v1.1.pdf`. Page references count physical PDF pages from 1. Basic step ranges follow the body text, including lettered account and administration subflows. Alternative IDs retain the original numbering, including the mislabeled §4.2.2.1 heading. Each row links to a scenario. The matrix covers the proposed design, with UC17 and UC20 marked OPTIONAL. Backend implementation remains pending.

CLIENT-* IDs identify browser actions. JOB-* and EVT-* identify the jobs and events in STATE_AND_EVENTS.md. Display, form, and navigation actions run in the client where applicable. The guide, state tables, and scenarios retain the source rules, preconditions, and postconditions. UC16 basic step 5 uses a read-only GET for current details followed by an explicit PUT to mark the selected notification as read.

## Forward mapping

### UC01 — Browse Movies and View Movie Details (PROPOSED)

UCS §§1.1-1.6, PDF pp11-12. Actor: Customer (public reads where allowed).

| Source flow / steps | Operation / event / client / job | Role | Outcome / error | Scenario |
| --- | --- | --- | --- | --- |
| §1.2.1 steps 1-4, pp11-12 | listMovies + CLIENT-FILTER | Customer (public reads where allowed) | 200 MoviePage; filter/empty are read-only. | SC-U01-B01 |
| §1.2.1 steps 5-6, pp11-12 | getMovie + listShowtimes + listMovieReviews | Customer (public reads where allowed) | 200 active movie metadata + showtimes/reviews; no mutation. | SC-U01-B02 |
| §1.2.1 steps 7, pp11-12 | CLIENT-NAVIGATE + getSeatMap | Customer (public reads where allowed) | 200 SeatMap on selection; navigation only otherwise. | SC-U01-B03 |
| §1.2.2.1 — No Movies or Matching Results Available, p11 | listMovies | Customer (public reads where allowed) | 200 MoviePage items=[]; No state mutation; client clears filters/retries. | SC-U01-A01 |
| §1.2.2.2 — No Available Showtimes, p11 | getMovie + listShowtimes | Customer (public reads where allowed) | 200 Movie + ShowtimePage items=[]; No hold; user returns catalogue. | SC-U01-A02 |
| §1.2.2.3 — Movie Details Cannot Be Retrieved, p11 | getMovie + listShowtimes | Customer (public reads where allowed) | 503 SERVICE_UNAVAILABLE; No fabricated data, retry safe. | SC-U01-A03 |

### UC02 — Select Seats (PROPOSED)

UCS §§2.1-2.6, PDF pp13-15. Actor: Customer (public reads where allowed).

| Source flow / steps | Operation / event / client / job | Role | Outcome / error | Scenario |
| --- | --- | --- | --- | --- |
| §2.2.1 steps 1-2, pp13-15 | getShowtime + getSeatMap + EVT-SEAT | Customer (public reads where allowed) | 200 current serverTime/epoch/version; live updates sanitized. | SC-U02-B01 |
| §2.2.1 steps 3-5, pp13-15 | CLIENT-SELECT | Customer (public reads where allowed) | No HTTP mutation until hold; UI summary provisional. | SC-U02-B02 |
| §2.2.1 steps 6-7, pp13-15 | createHold + getHold + EVT-SEAT | Customer (public reads where allowed) | 201 hld_demo_01 ACTIVE until10:10Z; both HELD; other viewers receive event. | SC-U02-B03 |
| §2.2.2.1 — Customer Is Not Logged In, p13 | createHold + login | Customer (public reads where allowed) | 401 AUTH_REQUIRED; login200 then recheck; No seats held before authentication; cancel login client-only. | SC-U02-A01 |
| §2.2.2.2 — Selected Seat Becomes Unavailable (Concurrent Conflict), p13 | createHold + getSeatMap + EVT-SEAT | Customer (public reads where allowed) | 409 SEAT_CONFLICT, conflictingSeatIds=[seat_a01]; Neither A seat acquired; refresh current map; no owner leak. | SC-U02-A02 |
| §2.2.2.3 — No Seats Available for the Selected Showtime (Sold Out), p13 | getSeatMap | Customer (public reads where allowed) | 200 snapshot with zero selectable seats; No hold attempt needed; select another showtime. | SC-U02-A03 |
| §2.2.2.4 — Customer Deselects or Changes Seats Before Confirmation, p14 | CLIENT-SELECT | Customer (public reads where allowed) | No HTTP endpoint; Only local highlight/provisional summary changes. | SC-U02-A04 |
| §2.2.2.5 — Temporary Seat Hold Expires, p14 | JOB-HOLD-EXPIRY + getHold + EVT-SEAT | Customer (public reads where allowed) | getHold200 status EXPIRED,remainingSeconds0; Release only still-owned HELD; map AVAILABLE; retry new selection. | SC-U02-A05 |

### UC03 — Book Movie Tickets (PROPOSED)

UCS §§3.1-3.6, PDF pp16-19. Actor: Customer (public reads where allowed).

| Source flow / steps | Operation / event / client / job | Role | Outcome / error | Scenario |
| --- | --- | --- | --- | --- |
| §3.2.1 steps 1-2, pp16-19 | getHold + createQuote | Customer (public reads where allowed) | 200 hold,201 qte_demo_01 itemized200000VND, no booking. | SC-U03-B01 |
| §3.2.1 steps 3-4, pp16-19 | CLIENT-PROMO + createQuote | Customer (public reads where allowed) | 201 new quote total190000; no booking/payment. | SC-U03-B02 |
| §3.2.1 steps 5-7, pp16-19 | CLIENT-CONFIRM + createBooking | Customer (public reads where allowed) | 201 bkg_demo_01 PENDING, HELD, snapshot200000; no ticket. | SC-U03-B03 |
| §3.2.1 steps 8, pp16-19 | getBooking + CLIENT-NAVIGATE | Customer (public reads where allowed) | 200 PENDING remainingSeconds; navigate payment, not paid yet. | SC-U03-B04 |
| §3.2.2.1 — Temporary Seat Hold Expires Before Booking Confirmation, p16 | createBooking + JOB-HOLD-EXPIRY | Customer (public reads where allowed) | 409 HOLD_EXPIRED; No PENDING created, seats released conditionally. | SC-U03-A01 |
| §3.2.2.2 — Customer Cancels Booking Before Payment, p16 | releaseHold + CLIENT-CANCEL | Customer (public reads where allowed) | 204 releaseHold; No PENDING/payment/ticket, owned HELD->AVAILABLE. | SC-U03-A02 |
| §3.2.2.3 — Ticket Price or Promotion Becomes Invalid Before Confirmation, p17 | createBooking + createQuote + CLIENT-CONFIRM | Customer (public reads where allowed) | 409 QUOTE_STALE with currentQuote or reason; createQuote201 replacement; No booking until customer reviews/reconfirms; may cancel/release or expiry. | SC-U03-A03 |
| §3.2.2.4 — Duplicate Booking Request Submission, p17 | createBooking | Customer (public reads where allowed) | 200 existing bkg_demo_01 and old committed amount; Exactly one domain booking, HELD, no second payment. | SC-U03-A04 |
| §3.2.2.5 — Booking Creation Cannot Be Completed, p17 | createBooking + getBooking | Customer (public reads where allowed) | 503 SERVICE_UNAVAILABLE; same-key/domain lookup retry; No incomplete booking reported; no payment/ticket; release on cancel/expiry. | SC-U03-A05 |

### UC04 — Make Payment (PROPOSED)

UCS §§4.1-4.6, PDF pp20-22. Actor: Customer (public reads where allowed).

| Source flow / steps | Operation / event / client / job | Role | Outcome / error | Scenario |
| --- | --- | --- | --- | --- |
| §4.2.1 steps 1-3, pp20-22 | initiatePayment | Customer (public reads where allowed) | 201 pay_demo_01 PENDING, server checkout URL; unique logical transaction. | SC-U04-B01 |
| §4.2.1 steps 4, pp20-22 | CLIENT-PAYMENT-RETURN | Customer (public reads where allowed) | Browser navigation only, polls getPayment/getBooking; no browser success authority. | SC-U04-B02 |
| §4.2.1 steps 5-7, pp20-22 | receivePaymentWebhook + getPayment + JOB-PAYMENT-RECONCILE | Customer (public reads where allowed) | VNPAY IPN 00 after durable recording (02 for duplicate); if verified timely SUCCESS; unknown PENDING+reconcile. | SC-U04-B03 |
| §4.2.1 steps 8-9, pp20-22 | EVT-SEAT + JOB-TICKET-ISSUE + JOB-NOTIFICATION + getBooking | Customer (public reads where allowed) | SOLD, booking/payment SUCCESS; issuance PENDING->READY, notification independent. | SC-U04-B04 |
| §4.2.2.1 — Alternative Flows, p20 | receivePaymentWebhook + EVT-PAYMENT-FAILED | Customer (public reads where allowed) | IPN 00 after recording, getPayment200 FAILED; Booking FAILED, conditional release HELD->AVAILABLE, no ticket. | SC-U04-A01 |
| §4.2.2.2 — Payment Timeout or Temporary Seat Hold Expires (Payment Expired), p20 | JOB-HOLD-EXPIRY + getPayment | Customer (public reads where allowed) | getPayment200 EXPIRED, booking EXPIRED; Release allocations, no ticket; start new seats. | SC-U04-A02 |
| §4.2.2.3 — Duplicate Payment Callback or Duplicate Request, p21 | initiatePayment + receivePaymentWebhook | Customer (public reads where allowed) | 200 existing payment / IPN 02 for duplicate; No new charge/booking/ticket/event side effect. | SC-U04-A03 |
| §4.2.2.4 — External Payment Provider Unreachable or Callback Error, p21 | initiatePayment + receivePaymentWebhook + JOB-PAYMENT-RECONCILE | Customer (public reads where allowed) | 503 before persist;202 pending if persisted uncertain;IPN 97 for invalid signature; PENDING unknown until verified/expiry; do not release due solely invalid callback. | SC-U04-A04 |
| §4.2.2.5 — Late Successful Payment After Booking Expiration, p21 | receivePaymentWebhook + JOB-PAYMENT-RECONCILE | Customer (public reads where allowed) | VNPAY IPN 00 after durable recording; getPayment200 EXPIRED/providerOutcome SUCCESS; No SUCCESS booking/SOLD/ticket; money exception REQUIRED and notify. | SC-U04-A05 |

### UC05 — View and Retrieve E-Ticket (PROPOSED)

UCS §§5.1-5.6, PDF pp23-25. Actor: Customer (public reads where allowed).

| Source flow / steps | Operation / event / client / job | Role | Outcome / error | Scenario |
| --- | --- | --- | --- | --- |
| §5.2.1 steps 1-3, pp23-25 | listBookingTickets + getTicket | Customer (public reads where allowed) | 200 issued TicketPage/Ticket; strict owner+payment guard. | SC-U05-B01 |
| §5.2.1 steps 4-6, pp23-25 | getTicketQrImage + downloadTicket + CLIENT-DISPLAY | Customer (public reads where allowed) | 200 image/png or application/pdf; UNUSED/USED current; no usage mutation. | SC-U05-B02 |
| §5.2.1 steps 7, pp23-25 | CLIENT-NAVIGATE | Customer (public reads where allowed) | No HTTP required; ticket state unchanged. | SC-U05-B03 |
| §5.2.2.1 — Booking Is Not Successfully Paid, p23 | listBookingTickets | Customer (public reads where allowed) | 409 BOOKING_UNPAID; No valid QR, UI displays current booking/payment status. | SC-U05-A01 |
| §5.2.2.2 — E-Ticket Is Not Yet Available, p23 | listBookingTickets | Customer (public reads where allowed) | 202 TicketPending + Retry-After3; No QR; stays SUCCESS/SOLD; retry issuing/polling unique tickets. | SC-U05-A02 |
| §5.2.2.3 — Unauthorized Access or Expired Session, p24 | getTicket + listBookingTickets | Customer (public reads where allowed) | 401 AUTH_REQUIRED or404 RESOURCE_NOT_FOUND; No disclosure; login then owner recheck. | SC-U05-A03 |
| §5.2.2.4 — E-Ticket Retrieval Service Unavailable, p24 | getTicket + downloadTicket | Customer (public reads where allowed) | 503 SERVICE_UNAVAILABLE; No booking/payment/usage mutation; retry. | SC-U05-A04 |
| §5.2.2.5 — E-Ticket Has Already Been Used, p24 | getTicket + downloadTicket | Customer (public reads where allowed) | 200 Ticket USED / binary PDF historical; No additional admission, retain usedAt. | SC-U05-A05 |

### UC06 — Register, Log In, and Manage Profile (PROPOSED)

UCS §§6.1-6.6, PDF pp26-28. Actor: Customer (public reads where allowed).

| Source flow / steps | Operation / event / client / job | Role | Outcome / error | Scenario |
| --- | --- | --- | --- | --- |
| §6.2.1 steps 1a-1d, pp26-28 | CLIENT-REGISTER + registerCustomer | Customer (public reads where allowed) | 201 User CUSTOMER; no implicit login. | SC-U06-B01 |
| §6.2.1 steps 2a-2c, pp26-28 | login + getSession + CLIENT-ROLE-ROUTE | Customer (public reads where allowed) | 200 Session opaque token/expiry; role route display only, server enforces. | SC-U06-B02 |
| §6.2.1 steps 3a-3b, pp26-28 | getProfile | Customer (public reads where allowed) | 200 own User. | SC-U06-B03 |
| §6.2.1 steps 3c-3d, pp26-28 | updateProfile + updateCredentials | Customer (public reads where allowed) | 200 profile or204 credentials; credential change revokes sessions. | SC-U06-B04 |
| §6.2.1 steps 4a-4b, pp26-28 | logout + CLIENT-LOGOUT | Customer (public reads where allowed) | 204 invalidate server session; later protected request401. | SC-U06-B05 |
| §6.2.2.1 — Invalid Input Format or Missing Required Fields, p26 | registerCustomer + login + updateProfile | Customer (public reads where allowed) | 422 VALIDATION_ERROR (malformed JSON400); No account/profile change, show field details. | SC-U06-A01 |
| §6.2.2.2 — Account Already Exists During Registration, p27 | registerCustomer | Customer (public reads where allowed) | 409 ACCOUNT_EXISTS; No duplicate account, switch login. | SC-U06-A02 |
| §6.2.2.3 — Invalid Login Credentials or Deactivated Account, p27 | login | Customer (public reads where allowed) | 401 INVALID_CREDENTIALS; No new session; same outward failure avoids credential leak. | SC-U06-A03 |
| §6.2.2.4 — Unauthorized Role Access Attempt, p27 | getReport + confirmAdmission | Customer (public reads where allowed) | 403 ROLE_FORBIDDEN; unauthenticated401; No administrative/admission change; private data hidden. | SC-U06-A04 |

### UC07 — Manage Movie Catalogue (PROPOSED)

UCS §§7.1-7.6, PDF pp29-31. Actor: Admin.

| Source flow / steps | Operation / event / client / job | Role | Outcome / error | Scenario |
| --- | --- | --- | --- | --- |
| §7.2.1 steps 1-2, pp29-31 | listAdminMovies | Admin | 200 includes active/inactive metadata, not public restriction. | SC-U07-B01 |
| §7.2.1 steps 3a-3d, pp29-31 | CLIENT-FORM + createMovie | Admin | 201 new Movie; audit persisted. | SC-U07-B02 |
| §7.2.1 steps 4a-4d, pp29-31 | getAdminMovie + updateMovie | Admin | 200 version2; validate duration schedule guards. | SC-U07-B03 |
| §7.2.1 steps 5a-5b, pp29-31 | updateMovie | Admin | 200 deactivate for new discovery/scheduling, preserve history; no DELETE. | SC-U07-B04 |
| §7.2.2.1 — Invalid or Missing Movie Information, p29 | createMovie + updateMovie | Admin | 422 VALIDATION_ERROR; Atomic reject; prior movie unchanged. | SC-U07-A01 |
| §7.2.2.2 — Duplicate Movie Record Detection, p29 | createMovie | Admin | 409 MOVIE_DUPLICATE; No duplicate; edit existing or correct metadata. | SC-U07-A02 |
| §7.2.2.3 — Movie Has Active Showtimes or Confirmed Bookings Upon Deactivation/Removal, p30 | updateMovie | Admin | 200 safe deactivate new scheduling only; No hard deletion/history damage; existing show/ticket references retained. | SC-U07-A03 |
| §7.2.2.4 — Duration Modification Conflicts with Scheduled Showtimes, p30 | updateMovie | Admin | 409 DURATION_SCHEDULE_CONFLICT; Duration unchanged; adjust schedule before retry. | SC-U07-A04 |
| §7.2.2.5 — Unauthorized Access Attempt, p30 | listAdminMovies + createMovie | Admin | 403 ROLE_FORBIDDEN (401 if no session); No movie mutation, authorization failure audit. | SC-U07-A05 |

### UC08 — Manage Cinema Rooms and Seats (PROPOSED)

UCS §§8.1-8.6, PDF pp32-34. Actor: Admin.

| Source flow / steps | Operation / event / client / job | Role | Outcome / error | Scenario |
| --- | --- | --- | --- | --- |
| §8.2.1 steps 1-2, pp32-34 | listAdminRooms | Admin | 200 configured rooms/capacity/status. | SC-U08-B01 |
| §8.2.1 steps 3a-3d, pp32-34 | CLIENT-FORM + createRoom | Admin | 201 rom_demo_01 with generated stable seat_a01/seat_a02 (fixture IDs). | SC-U08-B02 |
| §8.2.1 steps 4a-4d, pp32-34 | getAdminRoom + replaceRoomLayout | Admin | 200 layout version increment; configuration not inventory. | SC-U08-B03 |
| §8.2.1 steps 5a-5b, pp32-34 | updateRoom | Admin | 200 if safe; future/historical capacity guards, audit. | SC-U08-B04 |
| §8.2.2.1 — Invalid Room Details or Invalid Seat Layout Configuration, p32 | createRoom + replaceRoomLayout | Admin | 422 VALIDATION_ERROR/INVALID_LAYOUT/DUPLICATE_SEAT_LABEL; No partial grid/layout update. | SC-U08-A01 |
| §8.2.2.2 — Duplicate Screening Room Identifier, p33 | createRoom + updateRoom | Admin | 409 ROOM_NAME_DUPLICATE; No conflicting name saved. | SC-U08-A02 |
| §8.2.2.3 — Seat or Room Modification Conflicts with Active Showtimes or Booked Seats, p33 | replaceRoomLayout + updateRoom | Admin | 409 LAYOUT_IN_USE; Existing room/seat/booking layout intact; wait completion/cancel safe shows. | SC-U08-A03 |
| §8.2.2.4 — Unauthorized Access Attempt, p33 | listAdminRooms + replaceRoomLayout | Admin | 403 ROLE_FORBIDDEN; No room/seat change. | SC-U08-A04 |

### UC09 — Manage Showtime Schedule (PROPOSED)

UCS §§9.1-9.6, PDF pp35-37. Actor: Admin.

| Source flow / steps | Operation / event / client / job | Role | Outcome / error | Scenario |
| --- | --- | --- | --- | --- |
| §9.2.1 steps 1-2, pp35-37 | listAdminShowtimes | Admin | 200 schedule with statuses and occupiedUntil. | SC-U09-B01 |
| §9.2.1 steps 3a-3e, pp35-37 | listAdminMovies + listAdminRooms + createShowtime | Admin | 201 nonoverlapping showtime, ACTIVE inventory initialized; computed end14:00Z+15m fixture. | SC-U09-B02 |
| §9.2.1 steps 4a-4c, pp35-37 | getAdminShowtime + updateShowtime | Admin | 200 validated room window; ACTIVE seat snapshot initialized once. | SC-U09-B03 |
| §9.2.1 steps 5a-5b, pp35-37 | getCancellationImpact + CLIENT-CONFIRM + cancelShowtime + JOB-SHOWTIME-CANCEL | Admin | 202 CANCELLED/PROCESSING, slot released, admissions/new selection fenced, background resolution. | SC-U09-B04 |
| §9.2.2.1 — Room-Time Overlap or Insufficient Cleaning Interval Detected, p35 | createShowtime + updateShowtime | Admin | 409 SCHEDULE_OVERLAP; No overlapping showtime;14:15 boundary allowed. | SC-U09-A01 |
| §9.2.2.2 — Invalid Schedule Parameters or Inactive Movie/Room Selected, p36 | createShowtime + updateShowtime | Admin | 422 INVALID_REFERENCE/VALIDATION_ERROR/CLEANING_INTERVAL_UNCONFIGURED; No schedule saved. | SC-U09-A02 |
| §9.2.2.3 — Rescheduling or Cancelling a Showtime That Has Held or Sold Seats, p36 | updateShowtime + getCancellationImpact + cancelShowtime + JOB-SHOWTIME-CANCEL | Admin | 409 SHOWTIME_HAS_RESERVATIONS on room/time change;202 confirmed cancellation; Reschedule blocked; cancellation fences new sale/admission, notifies and queues refund/status handling Q-03. | SC-U09-A03 |
| §9.2.2.4 — Unauthorized Access Attempt, p36 | createShowtime + cancelShowtime | Admin | 403 ROLE_FORBIDDEN; No change, audit denial. | SC-U09-A04 |

### UC10 — Manage Ticket Pricing (PROPOSED)

UCS §§10.1-10.6, PDF pp38-40. Actor: Admin.

| Source flow / steps | Operation / event / client / job | Role | Outcome / error | Scenario |
| --- | --- | --- | --- | --- |
| §10.2.1 steps 1-2, pp38-40 | listAdminPriceRules | Admin | 200 seat-type/category rules. | SC-U10-B01 |
| §10.2.1 steps 3a-3d, pp38-40 | CLIENT-FORM + createPriceRule | Admin | 201 unique positive rule. | SC-U10-B02 |
| §10.2.1 steps 4a-4d, pp38-40 | getAdminPriceRule + updatePriceRule | Admin | 200 version2; future quotes new amount, old committed bookings unchanged. | SC-U10-B03 |
| §10.2.2.1 — Invalid or Missing Price Input, p38 | createPriceRule + updatePriceRule | Admin | 422 VALIDATION_ERROR; No price update. | SC-U10-A01 |
| §10.2.2.2 — Duplicate Pricing Rule Combination, p38 | createPriceRule | Admin | 409 PRICE_RULE_DUPLICATE; One current rule combination, no duplicate. | SC-U10-A02 |
| §10.2.2.3 — Price Update Occurs While Bookings or Seat Holds Are Active, p39 | updatePriceRule + createQuote + createBooking | Admin | 200 new rule; held old quote createBooking409 QUOTE_STALE; Existing PENDING/SUCCESS snapshot untouched; new quotes use new price, explicit re-confirm. | SC-U10-A03 |
| §10.2.2.4 — Unauthorized Access Attempt, p39 | listAdminPriceRules + updatePriceRule | Admin | 403 ROLE_FORBIDDEN; No pricing read/mutation. | SC-U10-A04 |

### UC11 — View Booking History (PROPOSED)

UCS §§11.1-11.6, PDF pp41-43. Actor: Customer (public reads where allowed).

| Source flow / steps | Operation / event / client / job | Role | Outcome / error | Scenario |
| --- | --- | --- | --- | --- |
| §11.2.1 steps 1-3, pp41-43 | listBookings | Customer (public reads where allowed) | 200 own chronological current/history list. | SC-U11-B01 |
| §11.2.1 steps 4-5, pp41-43 | getBooking | Customer (public reads where allowed) | 200 snapshot items/payment/current status/deadline; ticket state via listBookingTickets. | SC-U11-B02 |
| §11.2.1 steps 6, pp41-43 | listBookingTickets + getTicket | Customer (public reads where allowed) | 200 QR ticket; 202 if paid issuance pending, no usage mutation. | SC-U11-B03 |
| §11.2.2.1 — No Previous or Current Bookings Found, p41 | listBookings | Customer (public reads where allowed) | 200 items=[],nextCursor=null; Client offers browse; no state change. | SC-U11-A01 |
| §11.2.2.2 — Viewing a Failed or Expired Booking, p41 | getBooking | Customer (public reads where allowed) | 200 with failureReason/status/snapshot; No valid ticket and seats no longer reserved; show history. | SC-U11-A02 |
| §11.2.2.3 — Viewing a Pending or Recently Expired Booking, p41 | getBooking + getHold | Customer (public reads where allowed) | 200 latest status,remainingSeconds,expiresAt; Read-only; if pending+valid allow payment, expired no seat claim. | SC-U11-A03 |
| §11.2.2.4 — Unauthenticated Access Attempt or Expired Session, p42 | listBookings + login | Customer (public reads where allowed) | 401 AUTH_REQUIRED; login then retry; No foreign history exposure. | SC-U11-A04 |
| §11.2.2.5 — Booking History Cannot Be Retrieved (Backend Error), p42 | listBookings + getBooking | Customer (public reads where allowed) | 503 SERVICE_UNAVAILABLE or client transport error; Safe retry, no records modified. | SC-U11-A05 |

### UC12 — Validate E-Ticket and Record Admission (PROPOSED)

UCS §§12.1-12.6, PDF pp44-46. Actor: Staff/Admin.

| Source flow / steps | Operation / event / client / job | Role | Outcome / error | Scenario |
| --- | --- | --- | --- | --- |
| §12.2.1 steps 1-3, pp44-46 | listAdmissionShowtimes + CLIENT-CAMERA | Staff/Admin | 200 showtimes; camera/browser permission is client-only. | SC-U12-B01 |
| §12.2.1 steps 4-6, pp44-46 | lookupTicket + previewAdmission | Staff/Admin | 200 preview VALID/NONE with seat/movie/showtime; not USED. | SC-U12-B02 |
| §12.2.1 steps 7-8, pp44-46 | CLIENT-CONFIRM + confirmAdmission | Staff/Admin | 201 admission adm_demo_01, atomic ticket USED and audit. | SC-U12-B03 |
| §12.2.2.1 — QR Camera Scan Fails or Manual Lookup Is Required, p44 | CLIENT-CAMERA + lookupTicket + previewAdmission | Staff/Admin | lookup200 then preview200; cancel no API; No admission/USED until confirm, retry scan or leave. | SC-U12-A01 |
| §12.2.2.2 — Ticket Has Already Been Used (Duplicate Admission / Reuse Attempt), p44 | previewAdmission + confirmAdmission | Staff/Admin | 200 USED/ALREADY_USED preview;409 TICKET_ALREADY_USED new confirm; Return prior usedAt to authorized staff; no second admission. | SC-U12-A02 |
| §12.2.2.3 — Invalid or Non-Existent QR Ticket Identifier, p44 | previewAdmission + confirmAdmission | Staff/Admin | 200 INVALID/NOT_FOUND; confirm404 TICKET_NOT_FOUND; No usage state change, staff denies/retries. | SC-U12-A03 |
| §12.2.2.4 — Associated Booking Is Unpaid, Failed, or Expired, p45 | previewAdmission + confirmAdmission | Staff/Admin | 200 INVALID/UNPAID;409 UNPAID_TICKET; No admission or valid ticket creation. | SC-U12-A04 |
| §12.2.2.5 — Ticket Belongs to a Different or Cancelled Showtime, p45 | previewAdmission + confirmAdmission | Staff/Admin | 200 INVALID with WRONG_SHOWTIME/SHOWTIME_CANCELLED/OUTSIDE_WINDOW; confirm409 corresponding code; Ticket not USED; future ticket preserved; cancelled fenced. | SC-U12-A05 |
| §12.2.2.6 — Unauthorized Role Access Attempt, p45 | previewAdmission + confirmAdmission | Staff/Admin | 403 ROLE_FORBIDDEN or401 AUTH_REQUIRED; No validation/private ticket data/admission mutation. | SC-U12-A06 |

### UC13 — View Dashboard and Reports (PROPOSED)

UCS §§13.1-13.6, PDF pp47-48. Actor: Admin.

| Source flow / steps | Operation / event / client / job | Role | Outcome / error | Scenario |
| --- | --- | --- | --- | --- |
| §13.2.1 steps 1-3, pp47-48 | getDashboard | Admin | 200 gross revenue200000, collectedAmount200000, refundedAmount0, pendingAmount0, pendingRefundAmount0, sold2,admissions1,capacity2,occupancy100,admission50. | SC-U13-B01 |
| §13.2.1 steps 4-5, pp47-48 | CLIENT-FILTER + getReport | Admin | 200 authoritative consistent asOf rows; no financial mutation. | SC-U13-B02 |
| §13.2.1 steps 6, pp47-48 | CLIENT-DISPLAY | Admin | No additional API for view/export. | SC-U13-B03 |
| §13.2.2.1 — No Operational or Sales Data Available for Selected Period, p47 | getDashboard + getReport | Admin | 200 zeros, rows=[]; No divide-by-zero; no mutation. | SC-U13-A01 |
| §13.2.2.2 — Invalid Filter Criteria, p47 | getReport | Admin | 400 INVALID_QUERY; Retain client previous view, no report/record mutation. | SC-U13-A02 |
| §13.2.2.3 — Excluding Unpaid, Failed, or Expired Bookings from Revenue Metrics, p47 | getReport | Admin | 200 revenue200000,ticketsSold2; Exclude all unconfirmed revenue and held seats; no join double count. | SC-U13-A03 |
| §13.2.2.4 — Unauthorized Role Access Attempt, p48 | getDashboard + getReport | Admin | 403 ROLE_FORBIDDEN; no token401; No revenue/private report disclosure. | SC-U13-A04 |

### UC14 — Submit Movie Reviews and Ratings (PROPOSED)

UCS §§14.1-14.6, PDF pp49-50. Actor: Customer (public reads where allowed).

| Source flow / steps | Operation / event / client / job | Role | Outcome / error | Scenario |
| --- | --- | --- | --- | --- |
| §14.2.1 steps 1-3, pp49-50 | getReviewEligibility + CLIENT-FORM | Customer (public reads where allowed) | 200 eligible=true; render submission form. | SC-U14-B01 |
| §14.2.1 steps 4-7, pp49-50 | submitMovieReview + listMovieReviews + getMovie | Customer (public reads where allowed) | 201 Review, public list updates; average/count updated, no PII/booking IDs. | SC-U14-B02 |
| §14.2.2.1 — Customer Is Not Eligible to Submit a Review, p49 | getReviewEligibility + submitMovieReview | Customer (public reads where allowed) | 200 eligible=false; submit403 REVIEW_INELIGIBLE; No review/rating change. | SC-U14-A01 |
| §14.2.2.2 — Invalid Rating or Review Input, p49 | submitMovieReview | Customer (public reads where allowed) | 422 VALIDATION_ERROR; No review saved. | SC-U14-A02 |
| §14.2.2.3 — Duplicate Review Submission for the Same Movie, p49 | submitMovieReview | Customer (public reads where allowed) | 409 REVIEW_ALREADY_EXISTS; No duplicate, notify recorded; no edit endpoint. | SC-U14-A03 |
| §14.2.2.4 — Unauthenticated User Attempts to Submit a Review, p50 | submitMovieReview + login | Customer (public reads where allowed) | 401 AUTH_REQUIRED then login/eligibility check; No review until auth+eligibility verified. | SC-U14-A04 |

### UC15 — Manage Promotions and Discount Codes (PROPOSED)

UCS §§15.1-15.6, PDF pp51-53. Actor: Admin.

| Source flow / steps | Operation / event / client / job | Role | Outcome / error | Scenario |
| --- | --- | --- | --- | --- |
| §15.2.1 steps 1-2, pp51-53 | listAdminPromotions | Admin | 200 code/conditions/period/status. | SC-U15-B01 |
| §15.2.1 steps 3a-3d, pp51-53 | CLIENT-FORM + createPromotion | Admin | 201 unique promotion; no retroactive discount. | SC-U15-B02 |
| §15.2.1 steps 4a-4d, pp51-53 | getAdminPromotion + updatePromotion | Admin | 200 new version used future quotes only. | SC-U15-B03 |
| §15.2.1 steps 5a-5b, pp51-53 | updatePromotion | Admin | 200 inactive for new quotes, historical discounts retained. | SC-U15-B04 |
| §15.2.2.1 — Invalid Promotion Parameters or Missing Required Fields, p51 | createPromotion + updatePromotion | Admin | 422 VALIDATION_ERROR; No promotion change. | SC-U15-A01 |
| §15.2.2.2 — Duplicate Discount Code Identifier, p52 | createPromotion + updatePromotion | Admin | 409 PROMOTION_CODE_DUPLICATE; No duplicate identifier. | SC-U15-A02 |
| §15.2.2.3 — Deactivating or Modifying a Promotion While Bookings Are Active, p52 | updatePromotion + createQuote + createBooking | Admin | 200 update, future quote422 PROMOTION_INVALID; stale confirm409 QUOTE_STALE; Preserve committed discounts; hold-only quote requires review/reconfirm. | SC-U15-A03 |
| §15.2.2.4 — Unauthorized Role Access Attempt, p52 | listAdminPromotions + updatePromotion | Admin | 403 ROLE_FORBIDDEN; No restricted configuration exposure/mutation. | SC-U15-A04 |

### UC16 — View Notifications and Reminders (PROPOSED)

UCS §§16.1-16.6, PDF pp54-55. Actor: Customer (public reads where allowed).

| Source flow / steps | Operation / event / client / job | Role | Outcome / error | Scenario |
| --- | --- | --- | --- | --- |
| §16.2.1 steps 1-3, pp54-55 | JOB-NOTIFICATION + JOB-REMINDER + listNotifications | Customer (public reads where allowed) | 200 chronological readAt null/non-null; GET no mutation. | SC-U16-B01 |
| §16.2.1 steps 4-5, pp54-55 | getNotification + markNotificationRead + CLIENT-DISPLAY | Customer (public reads where allowed) | 200 current detail then200 readAt; suppress stale cancelled/USED reminders. | SC-U16-B02 |
| §16.2.1 steps 6-8, pp54-55 | getBooking + listBookingTickets + getMovie + CLIENT-NAVIGATE | Customer (public reads where allowed) | 200 allowed related resources; no implicit read on push dismissal. | SC-U16-B03 |
| §16.2.2.1 — No Notifications or Reminders Available, p54 | listNotifications | Customer (public reads where allowed) | 200 items=[]; No state change; browse link client-only. | SC-U16-A01 |
| §16.2.2.2 — Notification Retrieval Service Unavailable, p54 | listNotifications + getNotification | Customer (public reads where allowed) | 503 SERVICE_UNAVAILABLE; Do not display unverified current state; GET failure no implicit mark-read. | SC-U16-A02 |
| §16.2.2.3 — Notification Information Has Changed, p54 | getNotification + getBooking + getTicket | Customer (public reads where allowed) | 200 currentShowtimeStatus CANCELLED or currentTicketStatus USED; Display latest state, no stale valid admission/booking claim. | SC-U16-A03 |
| §16.2.2.4 — Unauthenticated User Attempts to View Account Notifications, p55 | listNotifications + getNotification + login | Customer (public reads where allowed) | 401 AUTH_REQUIRED; No private records; reauthenticate then recheck owner. | SC-U16-A04 |

### UC17 — Use AI Movie and Showtime Assistant (OPTIONAL)

UCS §§17.1-17.6, PDF pp56-58. Actor: Customer (public reads where allowed).

| Source flow / steps | Operation / event / client / job | Role | Outcome / error | Scenario |
| --- | --- | --- | --- | --- |
| §17.2.1 steps 1-2, pp56-58 | getCapabilities + CLIENT-ASSISTANT | Customer (public reads where allowed) | 200 flags; UI prompt only. | SC-U17-B01 |
| §17.2.1 steps 3-6, pp56-58 | askAssistant | Customer (public reads where allowed) | 200 grounded real movie/showtime cards, no PII or mutation. | SC-U17-B02 |
| §17.2.1 steps 7, pp56-58 | getMovie + getSeatMap + CLIENT-NAVIGATE | Customer (public reads where allowed) | 200 authoritative details/map; still must authenticate to hold. | SC-U17-B03 |
| §17.2.2.1 — No Matching Movies or Showtimes Found in System Data, p56 | askAssistant | Customer (public reads where allowed) | 200 recommendations=[] plus search fallback; No fabricated movies/showtimes; core unchanged. | SC-U17-A01 |
| §17.2.2.2 — Out-of-Scope, Unsupported, or Invalid Query, p56 | askAssistant | Customer (public reads where allowed) | 422 VALIDATION_ERROR or ASSISTANT_QUERY_UNSUPPORTED; No operational action, no forwarding secrets. | SC-U17-A02 |
| §17.2.2.3 — External AI / LLM Service Unavailable or Timed Out (Graceful Fallback), p57 | getCapabilities + askAssistant | Customer (public reads where allowed) | flags aiEnabled=false or503 FEATURE_DISABLED/AI_UNAVAILABLE; Static standard /movies browsing fallback; booking unaffected. | SC-U17-A03 |

### UC18 — Apply Promotions and Discount Codes (PROPOSED)

UCS §§18.1-18.6, PDF pp59-61. Actor: Customer (public reads where allowed).

| Source flow / steps | Operation / event / client / job | Role | Outcome / error | Scenario |
| --- | --- | --- | --- | --- |
| §18.2.1 steps 1-3, pp59-61 | CLIENT-PROMO + getHold | Customer (public reads where allowed) | No domain mutation; review quote/current time. | SC-U18-B01 |
| §18.2.1 steps 4-6, pp59-61 | createQuote | Customer (public reads where allowed) | 201 valid quote total190000 with itemized allocation; no booking/payment. | SC-U18-B02 |
| §18.2.1 steps 7, pp59-61 | CLIENT-CONFIRM + createBooking | Customer (public reads where allowed) | 201 PENDING snapshot, UC03 owns creation. | SC-U18-B03 |
| §18.2.2.1 — Invalid or Expired Discount Code, p59 | createQuote | Customer (public reads where allowed) | 422 PROMOTION_INVALID; No new discounted quote; original base price retained, retry another/null. | SC-U18-A01 |
| §18.2.2.2 — Promotional Conditions Not Satisfied, p59 | createQuote | Customer (public reads where allowed) | 422 PROMOTION_INELIGIBLE; No discount; no sensitive admin rule leak. | SC-U18-A02 |
| §18.2.2.3 — Customer Changes or Removes the Discount Code, p59 | createQuote + CLIENT-PROMO | Customer (public reads where allowed) | 201 new quote with restored base or new valid discount; No stacking; no old quote auto-confirm, no booking mutation. | SC-U18-A03 |
| §18.2.2.4 — Temporary Seat Hold Expires, p60 | createQuote + JOB-HOLD-EXPIRY | Customer (public reads where allowed) | 409 HOLD_EXPIRED; No quote used for booking; conditional release, reselect. | SC-U18-A04 |
| §18.2.2.5 — Promotion Validation Service Unavailable, p60 | createQuote | Customer (public reads where allowed) | 503 PROMOTION_SERVICE_UNAVAILABLE; No unverified discount; retry while live or new null quote; base unchanged. | SC-U18-A05 |

### UC19 — Manual Identifier Lookup (PROPOSED)

UCS §§19.1-19.6, PDF pp62-64. Actor: Staff/Admin.

| Source flow / steps | Operation / event / client / job | Role | Outcome / error | Scenario |
| --- | --- | --- | --- | --- |
| §19.2.1 steps 1-3, pp62-64 | CLIENT-MANUAL-LOOKUP | Staff/Admin | No incomplete server call; manually enter opaque ID. | SC-U19-B01 |
| §19.2.1 steps 4-6, pp62-64 | lookupTicket | Staff/Admin | 200 minimal ticket/showtime/seat, no QR/usage change. | SC-U19-B02 |
| §19.2.1 steps 7, pp62-64 | CLIENT-NAVIGATE + previewAdmission | Staff/Admin | 200 validation result via UC12; still no admission until confirm. | SC-U19-B03 |
| §19.2.2.1 — Invalid Ticket Identifier Format, p62 | lookupTicket | Staff/Admin | 422 VALIDATION_ERROR; No lookup result/admission; correct input. | SC-U19-A01 |
| §19.2.2.2 — Ticket Identifier Not Found, p62 | lookupTicket | Staff/Admin | 404 TICKET_NOT_FOUND; No record selected, no admission. | SC-U19-A02 |
| §19.2.2.3 — Customer Cannot Provide a Ticket Identifier, p62 | CLIENT-MANUAL-LOOKUP | Staff/Admin | No HTTP request for incomplete field; Ask customer to retrieve ticket via history; otherwise exit. | SC-U19-A03 |
| §19.2.2.4 — Manual Lookup Service Unavailable, p63 | lookupTicket | Staff/Admin | 503 SERVICE_UNAVAILABLE; No unverified success; retry/exit. | SC-U19-A04 |
| §19.2.2.5 — Cinema Staff Cancels Manual Lookup, p63 | CLIENT-CANCEL | Staff/Admin | No HTTP admission endpoint invoked; Pending read response may be ignored; no ticket state modified. | SC-U19-A05 |

### UC20 — Receive PWA Push Notifications (OPTIONAL)

UCS §§20.1-20.6, PDF pp65-67. Actor: Customer (public reads where allowed).

| Source flow / steps | Operation / event / client / job | Role | Outcome / error | Scenario |
| --- | --- | --- | --- | --- |
| §20.2.1 steps 1-3, pp65-67 | createPushSubscription + JOB-NOTIFICATION + JOB-PUSH-DISPATCH | Customer (public reads where allowed) | 201 subscription; job submits minimal title/summary/notificationId to push service, no core dependency. | SC-U20-B01 |
| §20.2.1 steps 4-5, pp65-67 | CLIENT-SERVICE-WORKER | Customer (public reads where allowed) | Browser may display/open/dismiss; acceptance not guaranteed delivery; no read mutation. | SC-U20-B02 |
| §20.2.1 steps 6-7, pp65-67 | getNotification + getBooking + getTicket + CLIENT-NAVIGATE | Customer (public reads where allowed) | 200 latest detail/linked resource; optional mark read only explicit Notifications detail flow. | SC-U20-B03 |
| §20.2.2.1 — Push Subscription Unavailable or Permission Revoked, p65 | JOB-PUSH-DISPATCH + deletePushSubscription + CLIENT-PERMISSION | Customer (public reads where allowed) | No push submit; DELETE204 when online owner cleanup; In-app record available; no operational change. | SC-U20-A01 |
| §20.2.2.2 — Push Notification Delivery Failure, p65 | JOB-PUSH-DISPATCH | Customer (public reads where allowed) | Record retry/failure, never assert delivered; Core transaction remains; in-app record available; stale410 deactivates. | SC-U20-A02 |
| §20.2.2.3 — Network Connection Unavailable, p65 | CLIENT-OFFLINE | Customer (public reads where allowed) | No guarantee delivery/current details; cached summary labelled offline; No offline payment/admission; resume online GET on reconnect. | SC-U20-A03 |
| §20.2.2.4 — Unauthenticated Customer Opens Notification, p66 | getNotification + login | Customer (public reads where allowed) | 401 AUTH_REQUIRED; login then owner check; No private notification disclosure. | SC-U20-A04 |
| §20.2.2.5 — Notification Information Has Changed, p66 | getNotification + getBooking + getTicket | Customer (public reads where allowed) | 200 latest status, not cached assumption; No mutation; render cancelled/USED/current state. | SC-U20-A05 |
| §20.2.2.6 — Customer Dismisses the Push Notification, p66 | CLIENT-PUSH-DISMISS | Customer (public reads where allowed) | No REST mark-as-read; readAt unchanged; notification remains in list. | SC-U20-A06 |

## Reverse mapping HTTP -> UC / supporting rationale

| OperationId | UC IDs | Evidence/rationale | Scenario coverage |
| --- | --- | --- | --- |
| `getCapabilities` | supporting, no UC21 | PROPOSED supporting: UC17 §17.2.2.3 PDF p57, UC20 §20.4 PDF pp66-67; Public feature flags and hold settings with no secrets. | SC-U17-B01, SC-U17-A03 |
| `listMovies` | UC01 | pa/pa3/Use_Case_Specification_v1.1.pdf §1.2-1.5; PDF pp11-12 | SC-U01-B01, SC-U01-A01 |
| `getMovie` | UC01 | pa/pa3/Use_Case_Specification_v1.1.pdf §1.2-1.5; PDF pp11-12 | SC-U01-B02, SC-U14-B02, SC-U16-B03, SC-U17-B03, SC-U01-A02, SC-U01-A03 |
| `listShowtimes` | UC01 | pa/pa3/Use_Case_Specification_v1.1.pdf §1.2-1.5; PDF pp11-12 | SC-U01-B02, SC-U01-A02, SC-U01-A03 |
| `getShowtime` | UC01, UC02 | pa/pa3/Use_Case_Specification_v1.1.pdf §1.2-1.5; PDF pp11-12; pa/pa3/Use_Case_Specification_v1.1.pdf §2.2-2.5; PDF pp13-15 | SC-U02-B01 |
| `getSeatMap` | UC02 | pa/pa3/Use_Case_Specification_v1.1.pdf §2.2-2.5; PDF pp13-15 | SC-U01-B03, SC-U02-B01, SC-U17-B03, SC-U02-A02, SC-U02-A03 |
| `registerCustomer` | UC06 | pa/pa3/Use_Case_Specification_v1.1.pdf §6.2-6.5; PDF pp26-28 | SC-U06-B01, SC-U06-A01, SC-U06-A02 |
| `login` | UC06 | pa/pa3/Use_Case_Specification_v1.1.pdf §6.2-6.5; PDF pp26-28 | SC-U06-B02, SC-U02-A01, SC-U06-A01, SC-U06-A03, SC-U11-A04, SC-U14-A04, SC-U16-A04, SC-U20-A04 |
| `getSession` | UC06 | pa/pa3/Use_Case_Specification_v1.1.pdf §6.2-6.5; PDF pp26-28 | SC-U06-B02 |
| `logout` | UC06 | pa/pa3/Use_Case_Specification_v1.1.pdf §6.2-6.5; PDF pp26-28 | SC-U06-B05 |
| `getProfile` | UC06 | pa/pa3/Use_Case_Specification_v1.1.pdf §6.2-6.5; PDF pp26-28 | SC-U06-B03 |
| `updateProfile` | UC06 | pa/pa3/Use_Case_Specification_v1.1.pdf §6.2-6.5; PDF pp26-28 | SC-U06-B04, SC-U06-A01 |
| `updateCredentials` | UC06 | pa/pa3/Use_Case_Specification_v1.1.pdf §6.2-6.5; PDF pp26-28 | SC-U06-B04 |
| `createHold` | UC02 | pa/pa3/Use_Case_Specification_v1.1.pdf §2.2-2.5; PDF pp13-15 | SC-U02-B03, SC-U02-A01, SC-U02-A02 |
| `getHold` | UC02, UC03 | pa/pa3/Use_Case_Specification_v1.1.pdf §2.2-2.5; PDF pp13-15; pa/pa3/Use_Case_Specification_v1.1.pdf §3.2-3.5; PDF pp16-19 | SC-U02-B03, SC-U03-B01, SC-U18-B01, SC-U02-A05, SC-U11-A03 |
| `releaseHold` | UC02, UC03 | pa/pa3/Use_Case_Specification_v1.1.pdf §2.2-2.5; PDF pp13-15; pa/pa3/Use_Case_Specification_v1.1.pdf §3.2-3.5; PDF pp16-19 | SC-U03-A02 |
| `createQuote` | UC03, UC18 | pa/pa3/Use_Case_Specification_v1.1.pdf §3.2-3.5; PDF pp16-19; pa/pa3/Use_Case_Specification_v1.1.pdf §18.2-18.5; PDF pp59-61 | SC-U03-B01, SC-U03-B02, SC-U18-B02, SC-U03-A03, SC-U10-A03, SC-U15-A03, SC-U18-A01, SC-U18-A02, SC-U18-A03, SC-U18-A04, SC-U18-A05 |
| `createBooking` | UC03 | pa/pa3/Use_Case_Specification_v1.1.pdf §3.2-3.5; PDF pp16-19 | SC-U03-B03, SC-U18-B03, SC-U03-A01, SC-U03-A03, SC-U03-A04, SC-U03-A05, SC-U10-A03, SC-U15-A03 |
| `listBookings` | UC11 | pa/pa3/Use_Case_Specification_v1.1.pdf §11.2-11.5; PDF pp41-43 | SC-U11-B01, SC-U11-A01, SC-U11-A04, SC-U11-A05 |
| `getBooking` | UC03, UC04, UC11 | pa/pa3/Use_Case_Specification_v1.1.pdf §3.2-3.5; PDF pp16-19; pa/pa3/Use_Case_Specification_v1.1.pdf §4.2-4.5; PDF pp20-22; pa/pa3/Use_Case_Specification_v1.1.pdf §11.2-11.5; PDF pp41-43 | SC-U03-B04, SC-U04-B04, SC-U11-B02, SC-U16-B03, SC-U20-B03, SC-U03-A05, SC-U11-A02, SC-U11-A03, SC-U11-A05, SC-U16-A03, SC-U20-A05 |
| `initiatePayment` | UC04 | pa/pa3/Use_Case_Specification_v1.1.pdf §4.2-4.5; PDF pp20-22 | SC-U04-B01, SC-U04-A03, SC-U04-A04 |
| `getPayment` | UC04 | pa/pa3/Use_Case_Specification_v1.1.pdf §4.2-4.5; PDF pp20-22 | SC-U04-B03, SC-U04-A02 |
| `receivePaymentWebhook` | UC04 | pa/pa3/Use_Case_Specification_v1.1.pdf §4.2-4.5; PDF pp20-22 | SC-U04-B03, SC-U04-A01, SC-U04-A03, SC-U04-A04, SC-U04-A05, SC-X-PROVIDER-ORDER |
| `listBookingTickets` | UC05 | pa/pa3/Use_Case_Specification_v1.1.pdf §5.2-5.5; PDF pp23-25 | SC-U05-B01, SC-U11-B03, SC-U16-B03, SC-U05-A01, SC-U05-A02, SC-U05-A03 |
| `getTicket` | UC05 | pa/pa3/Use_Case_Specification_v1.1.pdf §5.2-5.5; PDF pp23-25 | SC-U05-B01, SC-U11-B03, SC-U20-B03, SC-U05-A03, SC-U05-A04, SC-U05-A05, SC-U16-A03, SC-U20-A05 |
| `downloadTicket` | UC05 | pa/pa3/Use_Case_Specification_v1.1.pdf §5.2-5.5; PDF pp23-25 | SC-U05-B02, SC-U05-A04, SC-U05-A05 |
| `getTicketQrImage` | UC05 | pa/pa3/Use_Case_Specification_v1.1.pdf §5.2-5.5; PDF pp23-25 | SC-U05-B02 |
| `listAdmissionShowtimes` | UC12 | pa/pa3/Use_Case_Specification_v1.1.pdf §12.2-12.5; PDF pp44-46 | SC-U12-B01 |
| `lookupTicket` | UC19, UC12 | pa/pa3/Use_Case_Specification_v1.1.pdf §19.2-19.5; PDF pp62-64; pa/pa3/Use_Case_Specification_v1.1.pdf §12.2-12.5; PDF pp44-46 | SC-U12-B02, SC-U19-B02, SC-U12-A01, SC-U19-A01, SC-U19-A02, SC-U19-A04 |
| `previewAdmission` | UC12 | pa/pa3/Use_Case_Specification_v1.1.pdf §12.2-12.5; PDF pp44-46 | SC-U12-B02, SC-U19-B03, SC-U12-A01, SC-U12-A02, SC-U12-A03, SC-U12-A04, SC-U12-A05, SC-U12-A06 |
| `confirmAdmission` | UC12 | pa/pa3/Use_Case_Specification_v1.1.pdf §12.2-12.5; PDF pp44-46 | SC-U12-B03, SC-U06-A04, SC-U12-A02, SC-U12-A03, SC-U12-A04, SC-U12-A05, SC-U12-A06 |
| `listAdminMovies` | UC07 | pa/pa3/Use_Case_Specification_v1.1.pdf §7.2-7.5; PDF pp29-31 | SC-U07-B01, SC-U09-B02, SC-U07-A05 |
| `createMovie` | UC07 | pa/pa3/Use_Case_Specification_v1.1.pdf §7.2-7.5; PDF pp29-31 | SC-U07-B02, SC-U07-A01, SC-U07-A02, SC-U07-A05 |
| `getAdminMovie` | UC07 | pa/pa3/Use_Case_Specification_v1.1.pdf §7.2-7.5; PDF pp29-31 | SC-U07-B03 |
| `updateMovie` | UC07 | pa/pa3/Use_Case_Specification_v1.1.pdf §7.2-7.5; PDF pp29-31 | SC-U07-B03, SC-U07-B04, SC-U07-A01, SC-U07-A03, SC-U07-A04 |
| `listAdminRooms` | UC08 | pa/pa3/Use_Case_Specification_v1.1.pdf §8.2-8.5; PDF pp32-34 | SC-U08-B01, SC-U09-B02, SC-U08-A04 |
| `createRoom` | UC08 | pa/pa3/Use_Case_Specification_v1.1.pdf §8.2-8.5; PDF pp32-34 | SC-U08-B02, SC-U08-A01, SC-U08-A02 |
| `getAdminRoom` | UC08 | pa/pa3/Use_Case_Specification_v1.1.pdf §8.2-8.5; PDF pp32-34 | SC-U08-B03 |
| `updateRoom` | UC08 | pa/pa3/Use_Case_Specification_v1.1.pdf §8.2-8.5; PDF pp32-34 | SC-U08-B04, SC-U08-A02, SC-U08-A03 |
| `listAdminShowtimes` | UC09 | pa/pa3/Use_Case_Specification_v1.1.pdf §9.2-9.5; PDF pp35-37 | SC-U09-B01 |
| `createShowtime` | UC09 | pa/pa3/Use_Case_Specification_v1.1.pdf §9.2-9.5; PDF pp35-37 | SC-U09-B02, SC-U09-A01, SC-U09-A02, SC-U09-A04 |
| `getAdminShowtime` | UC09 | pa/pa3/Use_Case_Specification_v1.1.pdf §9.2-9.5; PDF pp35-37 | SC-U09-B03 |
| `updateShowtime` | UC09 | pa/pa3/Use_Case_Specification_v1.1.pdf §9.2-9.5; PDF pp35-37 | SC-U09-B03, SC-U09-A01, SC-U09-A02, SC-U09-A03 |
| `listAdminPriceRules` | UC10 | pa/pa3/Use_Case_Specification_v1.1.pdf §10.2-10.5; PDF pp38-40 | SC-U10-B01, SC-U10-A04 |
| `createPriceRule` | UC10 | pa/pa3/Use_Case_Specification_v1.1.pdf §10.2-10.5; PDF pp38-40 | SC-U10-B02, SC-U10-A01, SC-U10-A02 |
| `getAdminPriceRule` | UC10 | pa/pa3/Use_Case_Specification_v1.1.pdf §10.2-10.5; PDF pp38-40 | SC-U10-B03 |
| `updatePriceRule` | UC10 | pa/pa3/Use_Case_Specification_v1.1.pdf §10.2-10.5; PDF pp38-40 | SC-U10-B03, SC-U10-A01, SC-U10-A03, SC-U10-A04 |
| `listAdminPromotions` | UC15 | pa/pa3/Use_Case_Specification_v1.1.pdf §15.2-15.5; PDF pp51-53 | SC-U15-B01, SC-U15-A04 |
| `createPromotion` | UC15 | pa/pa3/Use_Case_Specification_v1.1.pdf §15.2-15.5; PDF pp51-53 | SC-U15-B02, SC-U15-A01, SC-U15-A02 |
| `getAdminPromotion` | UC15 | pa/pa3/Use_Case_Specification_v1.1.pdf §15.2-15.5; PDF pp51-53 | SC-U15-B03 |
| `updatePromotion` | UC15 | pa/pa3/Use_Case_Specification_v1.1.pdf §15.2-15.5; PDF pp51-53 | SC-U15-B03, SC-U15-B04, SC-U15-A01, SC-U15-A02, SC-U15-A03, SC-U15-A04 |
| `replaceRoomLayout` | UC08 | pa/pa3/Use_Case_Specification_v1.1.pdf §8.2-8.5; PDF pp32-34 | SC-U08-B03, SC-U08-A01, SC-U08-A03, SC-U08-A04 |
| `getCancellationImpact` | UC09 | pa/pa3/Use_Case_Specification_v1.1.pdf §9.2-9.5; PDF pp35-37 | SC-U09-B04, SC-U09-A03 |
| `cancelShowtime` | UC09 | pa/pa3/Use_Case_Specification_v1.1.pdf §9.2-9.5; PDF pp35-37 | SC-U09-B04, SC-U09-A03, SC-U09-A04 |
| `getDashboard` | UC13 | pa/pa3/Use_Case_Specification_v1.1.pdf §13.2-13.5; PDF pp47-48 | SC-U13-B01, SC-U13-A01, SC-U13-A04 |
| `getReport` | UC13 | pa/pa3/Use_Case_Specification_v1.1.pdf §13.2-13.5; PDF pp47-48 | SC-U13-B02, SC-U06-A04, SC-U13-A01, SC-U13-A02, SC-U13-A03, SC-U13-A04 |
| `listMovieReviews` | UC01, UC14 | pa/pa3/Use_Case_Specification_v1.1.pdf §1.2-1.5; PDF pp11-12; pa/pa3/Use_Case_Specification_v1.1.pdf §14.2-14.5; PDF pp49-50 | SC-U01-B02, SC-U14-B02 |
| `submitMovieReview` | UC14 | pa/pa3/Use_Case_Specification_v1.1.pdf §14.2-14.5; PDF pp49-50 | SC-U14-B02, SC-U14-A01, SC-U14-A02, SC-U14-A03, SC-U14-A04 |
| `getReviewEligibility` | UC14 | pa/pa3/Use_Case_Specification_v1.1.pdf §14.2-14.5; PDF pp49-50 | SC-U14-B01, SC-U14-A01 |
| `listNotifications` | UC16 | pa/pa3/Use_Case_Specification_v1.1.pdf §16.2-16.5; PDF pp54-55 | SC-U16-B01, SC-U16-A01, SC-U16-A02, SC-U16-A04 |
| `getNotification` | UC16, UC20 | pa/pa3/Use_Case_Specification_v1.1.pdf §16.2-16.5; PDF pp54-55; pa/pa3/Use_Case_Specification_v1.1.pdf §20.2-20.5; PDF pp65-67 | SC-U16-B02, SC-U20-B03, SC-U16-A02, SC-U16-A03, SC-U16-A04, SC-U20-A04, SC-U20-A05 |
| `markNotificationRead` | UC16 | pa/pa3/Use_Case_Specification_v1.1.pdf §16.2-16.5; PDF pp54-55 | SC-U16-B02 |
| `askAssistant` | UC17 | pa/pa3/Use_Case_Specification_v1.1.pdf §17.2-17.5; PDF pp56-58 | SC-U17-B02, SC-U17-A01, SC-U17-A02, SC-U17-A03 |
| `createPushSubscription` | UC20 | pa/pa3/Use_Case_Specification_v1.1.pdf §20.2-20.5; PDF pp65-67 | SC-U20-B01 |
| `deletePushSubscription` | UC20 | pa/pa3/Use_Case_Specification_v1.1.pdf §20.2-20.5; PDF pp65-67 | SC-U20-A01 |
| `getAdminPayment` | supporting, no UC21 | pa/pa3/Software_Architecture_Document_v1.1.pdf §4.8 PDF p29; supporting PROPOSED admin payment status only. | SC-X-ADMIN-PAYMENT |


## Client actions, background work, and shared acceptance checks

CLIENT-SELECT/FILTER/FORM/NAVIGATE/CAMERA/MANUAL-LOOKUP/CONFIRM/PERMISSION/SERVICE-WORKER/PUSH-DISMISS/OFFLINE/LOGOUT/PAYMENT-RETURN are UI or operating-system actions. The server remains authoritative. STATE_AND_EVENTS.md specifies guards and retries for JOB-HOLD-EXPIRY, JOB-TICKET-ISSUE, JOB-PAYMENT-RECONCILE, JOB-SHOWTIME-CANCEL, JOB-NOTIFICATION, JOB-REMINDER, JOB-PUSH-DISPATCH, EVT-SEAT, EVT-PAYMENT-CONFIRMED, EVT-PAYMENT-FAILED, EVT-TICKETS-ISSUED, and EVT-NOTIFICATION-CREATED. HTTP subscription creation and deletion enforce ownership. Permission prompts, installation, and service-worker events are local.

Additional SC-X scenarios cover concurrency, retry keys, domain uniqueness, immutable snapshots, callback authentication, pending ticket issuance, concurrent admission, cross-owner access, cancellation, optional feature failures, WSS gaps, and crash recovery. DECISIONS.md records the approved rules and the remaining operational evidence.

Vision §6 p9 and UCS §§1.3.4 p12, 2.3.1 p14, 5.3.2 p24, 12.3.1 p45, and 19.3.2 p63 define acceptance targets. Plan for at least 50 contenders, the stated catalogue, showtime, and admission timing targets, access-control tests, and fault injection. Static validation checks all 66 operation mappings, 20 basic sections, and 90 alternatives. Backend acceptance checks are NOT RUN.

## Planned non-functional acceptance checks

Every check below is **NOT RUN**. The cinema API and UI are pending. Use the proposed environments for test setup and confirm the workload before execution. Follow the [planned NFR execution](CONTRACT_SCENARIOS.md#planned-nfr-acceptance-execution) and retain raw evidence with the build, browser version, timezone, dataset, and hardware before marking PASS.

| Acceptance ID / category | Exact source locator (repository-relative key) | Operations / client behavior | Measurable or inspectable pass condition | Proposed environment / evidence | Status |
| --- | --- | --- | --- | --- | --- |
| NFR-01 Performance discovery | Vision `pa/pa2/Vision_Document_v1.2.pdf` §6 p9; UCS `pa/pa3/Use_Case_Specification_v1.1.pdf` §1.3.4 p12; SAD `pa/pa3/Software_Architecture_Document_v1.1.pdf` §2.1 p6 | listMovies/getMovie/listShowtimes/getShowtime | At least95% catalogue/showtime retrieval requests complete within2seconds under expected workload; collect distribution, errors and agreed workload, not just mean | Deployed HTTPS API, representative movie/showtime data, known CPU/DB/cache/network, load generator latency histograms; agree expected workload before run | NOT RUN |
| NFR-02 Correctness/concurrency | UCS §2.3.1 p14; Vision §6 p9 | createHold/createBooking, EVT-SEAT, SC-X-SEAT-RACE/PARTIAL | At least50 concurrent booking attempts; no seat held by multiple Customers or more than one confirmed sale/showtime-seat; whole-selection rejection | Synchronized contenders across independent sessions + authoritative DB/hold evidence and post-expiry check; 15-20room dataset | NOT RUN |
| NFR-03 Ticket retrieval performance | UCS §5.3.2 p24 | listBookingTickets/getTicket/downloadTicket | E-ticket retrieval should complete within2seconds under expected operating conditions; temporary failures preserve confirmed records and no fake QR | Paid-issued/paid-pending/failed fixtures, online HTTPS with recorded request timings; binary retrieval included with format/size evidence | NOT RUN |
| NFR-04 Lobby efficiency | UCS §12.3.1 p45; §19.3.2 p63; Vision §6 p9 | lookupTicket/previewAdmission/confirmAdmission; local QR scan | QR lookup/admission validation within2seconds per ticket; manual server lookup target2seconds **excluding manual identifier typing time** | Current desktop browsers + camera/manual fixture; separate decode/typing time from server timing, used/wrong/invalid cases | NOT RUN |
| NFR-05 Customer task cycle | Vision §3.3 p5 | Client discovery->hold->quote->booking->sandbox payment->ticket | Customer booking task target completed within5minutes; no silent stale-price confirmation, clear pending/failed/ticket status | Representative phone/desktop scripted walkthrough, sandbox latency recorded separately, usability observer/task timestamps; TTL remains independent configured policy | NOT RUN |
| NFR-06 Admin task cycle | Vision §3.3 p5; UCS §9.3.2 p36 | Admin createShowtime and schedule form | Administrator can create a showtime within target3minutes with understandable validation and no room overlap | Desktop admin walkthrough with known active movie/room/pricing/cleaning; record start/submit/confirmation times and error correction | NOT RUN |
| NFR-07 Security/privacy/RBAC | Vision §6 p9; UCS §§6.3.1-.2 p27,12.3.3 p45,13.3.2 p48; §17.3.2 p57 | Every protected operation via API_GUIDE matrix; owner resources; receivePaymentWebhook; askAssistant | Wrong roles denied server-side; foreign Customer resource concealed; no credentials/payment/session secrets in logs/browser URLs/external AI, no public holder identities; HTTPS deployment | CustomerA/B, Staff,Admin and anonymous negative requests; malformed input/signature cases; sanitized network/log inspection, external AI payload capture with synthetic PII | NOT RUN |
| NFR-08 Reliability/fault tolerance | Vision §6 p9; UCS §4.3 pp21-22,§12.3.2 p45; §16.3.2 p55,§20.3.3 p66 | Payment/expiry/issuer/admission jobs, SC-X recovery/race/push scenarios | Failed/timeout payments never valid ticket; no permanent expired holds; duplicates never extra charge/sale/ticket/admission; notification/AI/push outage cannot undo core workflow | Sandbox verified callbacks + timeout/loss/duplicate/order/crash/cache faults; check durable receipts/allocations/tickets/admissions and retry ledger | NOT RUN |
| NFR-09 Usability/accessibility/compatibility/scale | Vision §§3.3 pp4-5,6 p9; UCS §§1.3.1-.2 pp11-12,2.3.2 p14,8.3.2-.4 p33,12.3.4 p45 | Customer phone/tablet/desktop catalogue/seat/checkout/ticket; Admin/Staff desktop | Current Chrome/Edge/Firefox supported; readable text/contrast/labels; non-color-only seat and VALID/USED/INVALID cues, clear input/status feedback; configure/maintain approximately15-20rooms | Record actual browser versions, representative phone/tablet/desktop viewport/device matrix, screenshots/manual task results, public geometry fixture+large cinema dataset. Qualitative source criteria inspected; no invented approved numeric contrast threshold | NOT RUN |
| NFR-10 Maintainability/observability/documentation | Vision §6 p9; SAD §4 pp11,15,21-24,29-36; SDP `pa/pa2/Software_Development_Plan_v2.0.pdf` §§4.3.2-.4 pp21-24 | API/business/persistence/payment/AI/PWA module separation, request/state audit; setup/deploy/test/role-user/demo instructions | Review module boundaries and provider adapter isolation; meaningful state/error/audit records with requestId and no secrets; independent team member can follow setup/deploy/test/role flows/demo instructions for agreed build; distinguish executed evidence from design scenario | Code/module review, sanitized state-transition logs, clean-environment setup/deployment rehearsal and documented run results; prospective acceptance, no claim absent backend docs already pass | NOT RUN |

## Cross-cutting scenarios

| Operations / source branch | Added scenarios | Reason |
| --- | --- | --- |
| getSeatMap/EVT-SEAT, UCS §2.2.1 step2 p13 and §8.2.1 p32 | SC-X-GEOMETRY | Full public geometry, aisle/arbitrary label/OOS and versioned resync |
| updateShowtime/cancelShowtime, UCS §9.2.1 step4b p35/§9.2.2.3 p36 | SC-X-SHOWTIME-GUARDS, SC-X-SHOWTIME-TRANSITIONS, SC-X-SHOWTIME-UPDATE-RACE | Field/lifecycle and concurrent mutation integrity |
| updateProfile/getProfile, UCS §6.2.1 subflow3 p26 | SC-X-PROFILE-CONCURRENCY | Explicit non-versioned last-commit/retry policy |
| initiatePayment/listBookingTickets/getReport, UCS §§4.2.2.4 p21,5.3.1 p24,13.3.1 p48 | SC-X-EXAMPLE-SEMANTICS | Semantic fixture invariants beyond schema validity |


Policy regression mappings: UC04 → receivePaymentWebhook, initiatePayment, getAdminPayment (SC-X-VNPAY-VERIFY, SC-X-AUTHORIZED-REFUND). UC09 → getCancellationImpact, cancelShowtime (SC-X-CANCEL-PERMISSION). UC13 → getReport, getDashboard (SC-X-FINANCE-LEDGER). UC03/18 → createQuote, createBooking (SC-X-ROUNDING). UC07 → createMovie, updateMovie (SC-X-MOVIE-TITLE). UC12 → previewAdmission, confirmAdmission (SC-X-WINDOW).
