# MEDI-CINE — User Interface Prototype (Customer Web App)

| | |
|---|---|
| Project | MEDI-CINE — online cinema management and ticket-booking web platform |
| Course | Introduction to Software Engineering (CSC13002), HCMUS |
| Group | Group 04 |
| Deliverable | PA4-b — UI prototype |
| Authors | Vân Hoàng Nhật (24120209), Huỳnh Vĩnh An (24120162) |
| Version | 1.0 |
| Date | 21/11/2026 |
| Use cases covered | UC01 Browse Movies and View Movie Details, UC02 Select Seats, UC03 Book Movie Tickets (+ the login prompt of UC06 and the discount code of UC18) |

## Revision History

| Version | Date | Description | Author |
|---|---|---|---|
| 1.0 | 21/11/2026 | First version: main screen, six main-scenario screens, 33 alternative-flow, error, empty and loading states, with screenshots of the running prototype | Vân Hoàng Nhật, Huỳnh Vĩnh An |

## Table of contents

1. [Introduction](#1-introduction)
2. [How the prototype was built](#2-how-the-prototype-was-built)
3. [Screen map and main scenario](#3-screen-map-and-main-scenario)
4. [Shared elements](#4-shared-elements)
5. [Screens](#5-screens)
   - [5.0 Home (main screen)](#50-home-main-screen)
   - [5.1 Movie catalogue](#51-movie-catalogue)
   - [5.2 Movie details and showtimes](#52-movie-details-and-showtimes)
   - [5.3 Login / register](#53-login--register)
   - [5.4 Seat selection](#54-seat-selection)
   - [5.5 Booking review](#55-booking-review)
   - [5.6 Booking created (PENDING)](#56-booking-created-pending)
6. [Alternative flows, errors and empty states](#6-alternative-flows-errors-and-empty-states)
7. [Traceability to the Use-Case Specification](#7-traceability-to-the-use-case-specification)
8. [Notes on this prototype](#8-notes-on-this-prototype)

---

## 1. Introduction

### 1.1 Purpose

This document presents the user interface of the MEDI-CINE **Customer Web
App** for the main scenarios of UC01, UC02 and UC03 in the Use-Case
Specification v1.1 (UCS). For every screen it describes:

- **Purpose:** what the screen is for and where it sits in the use case;
- **Information displayed:** what the customer sees;
- **How the user uses it:** the actions available and where they lead.

Every screenshot is taken from the running prototype, not drawn in a mock-up
tool, so the screens show real layout, real data and real states.

### 1.2 Scope

| In scope | Out of scope (later use cases) |
|---|---|
| Browsing now-showing and coming-soon movies, search and genre filter (UC01) | Payment through VNPAY (UC04): the button is shown but disabled |
| Movie details and showtimes by day and format (UC01) | E-ticket and QR code (UC05) |
| Seat map with seat types, seat states, hold and countdown (UC02) | Booking history, reviews, notifications (UC11, UC14, UC16) |
| Booking review with itemised prices, discount code and booking creation (UC03, UC18) | Admin and staff dashboard (UC07–UC10, UC12, UC13, UC15, UC19) |
| Login / register when a guest tries to hold seats (UC06, UC02 alt 2.2.2.1) | Profile management (rest of UC06) |

At the end of UC03 the booking is **PENDING** (waiting for payment). The
interface never shows a seat as sold, a payment as successful or a ticket as
issued at this point, because only the backend may confirm a booking after a
verified payment (Vision v1.2, SAD v1.1 §4).

### 1.3 Users

Customers of one mid-size cinema in Vietnam (about 15–20 screening rooms) who
want to see what is on, choose a showtime and seats, and book, usually for an
evening or weekend show. Browsing needs no account; holding seats needs a
login. Target from Vision v1.2 §6: from "what's on" to a booking in under
five minutes.

### 1.4 Language

All interface text is in **Vietnamese** (team decision D10). In this document
interface labels are quoted in Vietnamese with an English gloss, for example
"Giữ ghế" (*Hold seats*).

## 2. How the prototype was built

| Item | Choice |
|---|---|
| Form | A runnable web application; screenshots of it are placed in this document |
| Code | `src/frontend/` — Vite, React 19, TypeScript, Tailwind CSS v4, React Router. This is the first version of the real Customer Web App, not throw-away code |
| Data | Sample data in `src/frontend/src/mocks/data/*.json` (12 movies released in Vietnam in Nov–Dec 2026, 3 rooms, 20 showtimes, seat states, 9 price rules, 4 discount codes, 1 demo customer). A mock API in `src/frontend/src/mocks/mockApi.ts` returns objects shaped like the team's OpenAPI contract (`docs/api/openapi.yaml`), so the screens can later call the real backend |
| Design rules | `docs/analysis and design/UI_Design_Brief.md` (v0.9) and `DESIGN.md`: colours, type, layout, seat states, states to cover, motion |
| Screen sizes | Desktop first (1440 px), also checked at 1024, 768, 375 and 320 px |
| Screenshots | `docs/analysis and design/ui-prototype-screenshots/`. Main screens at 1440 px (full page) and 375 px (phone, first screen). States at 1440 px. Taken with the mock clock set to Friday 20/11/2026, 12:00 (Vietnam time) |

**Visual direction "Phòng chiếu" (the screening room).** The interface is the
auditorium a moment before the film starts: dark teal walls, a silver screen,
and warm amber light from the projector. Amber is used only for actions,
selected items, focus and time. Each movie's own poster and still supply the
colour, so pages differ by movie. Text contrast meets WCAG 2.1 AA.

**How to run.**

```bash
cd src/frontend
npm install
npm run dev        # http://localhost:5173
```

The demo login account is in `src/frontend/src/mocks/data/users.json` (the
login page also shows it under "Tài khoản dùng thử"). Every state in section 6
can be opened with a URL; the list is in `src/frontend/README.md`, section
"States".

## 3. Screen map and main scenario

```
                      ┌───────────────┐
                      │ 5.0 Home      │  (main screen)
                      └──┬─────────┬──┘
          "Đang chiếu" / │         │ pick a showtime chip
          "Sắp chiếu"    ▼         │
                ┌──────────────┐   │
                │ 5.1 Catalogue│   │
                └──────┬───────┘   │
                 poster│           │
                       ▼           │
                ┌──────────────┐   │
                │ 5.2 Details +│   │
                │   showtimes  │   │
                └──────┬───────┘   │
               showtime│           │
                       ▼           ▼
                ┌──────────────────────┐  guest presses   ┌──────────────┐
                │ 5.4 Seat selection   │ ───────────────► │ 5.3 Login /  │
                │  pick seats → hold   │ ◄─────────────── │   register   │
                └──────────┬───────────┘  back, seats kept└──────────────┘
                  "Tiếp tục"│
                           ▼
                ┌──────────────────────┐
                │ 5.5 Booking review   │  "Quay lại chọn ghế" → releases the hold → 5.4
                │  prices, code        │
                └──────────┬───────────┘
      "Tiếp tục thanh toán"│
                           ▼
                ┌──────────────────────┐
                │ 5.6 Booking PENDING  │  → payment (UC04, later)
                └──────────────────────┘
```

**Main scenario walked through in the screenshots.** On Friday 20/11/2026 a
customer opens Home, opens *Bò Sữa Bay*, picks the 14:30 showtime in Room 1,
chooses VIP seat D8 and couple seat H4, logs in, holds both seats for 10
minutes, enters the code CHAOTHANG11 (10 % off, at most 30.000 ₫), and
creates the booking. Amount to pay: 275.000 ₫ − 27.500 ₫ = **247.500 ₫**.

## 4. Shared elements

**Header (every page).** Logo "MEDI-CINE" (back to Home), "Đang chiếu" (*Now
showing*) and "Sắp chiếu" (*Coming soon*) links, a movie search field "Tìm
phim…" (from 1024 px wide), and "Đăng nhập" (*Log in*) or the customer's name
and "Đăng xuất" (*Log out*). Below 640 px the two links become one link
"Phim" (*Movies*). The current page is underlined in amber.

**Booking steps (screens 5.4–5.6).** "Chọn suất → Chọn ghế → Xác nhận →
Thanh toán" (*Showtime → Seats → Review → Payment*). Finished steps show a
check mark, the current step is bold. On phones only the current step shows
its name so the bar stays on one line.

**Time and money.** Times are Vietnam time (24-hour), dates are dd/mm/yyyy,
amounts are integer VND written "275.000 ₫". All prices come from the server
quote; the page never calculates a price.

**Feedback.** Every action that waits on the server shows a busy label (for
example "Đang giữ ghế…", *Holding seats…*). Errors say what happened and what
to do, and keep the customer's data. Motion is short (150–250 ms) and only
where it explains a change: pressing a seat, a seat taken by someone else, a
total changing, the hold timer, switching day or movie. With the system
setting "reduce motion" these become simple fades.

**Accessibility.** Each page has its own tab title, keyboard focus is always
visible, the seat map works with arrow keys, seat states are told apart by
shape, pattern and icon (not colour alone), and page changes are announced to
screen readers.

---

## 5. Screens

### 5.0 Home (main screen)

**First screen (what the customer sees on opening the site):**

![Home, desktop, first screen](ui-prototype-screenshots/01-home-1440-top.png)

**Scrolling down (poster rows):**

![Home, desktop, poster rows](ui-prototype-screenshots/01-home-1440-rows.png)


<img src="ui-prototype-screenshots/01-home-375.png" alt="Home, phone" width="300">

**Purpose.** The cinema's front page and the entry to UC01. It answers the
first question a moviegoer has, "what can I watch today?", and gives one-click
access to today's showtimes, the full catalogue and search.

**Information displayed.**
- Hero: the movie chosen from today's list, over its own dimmed still: title,
  age rating badge (for example T13), running time, genres, release date, a
  two-line synopsis.
- "Suất chiếu hôm nay" (*Today's showtimes*): one chip per showtime with the
  time and format (2D, 3D, IMAX).
- "Phim chiếu hôm nay (3)" (*Showing today*): every movie with a showtime
  today, each with a small poster, its title, the number of shows and the
  earliest time; the selected movie has a framed box and a check badge on its
  poster.
- "Phim đang chiếu" (*Now showing*): a row of posters (title, age rating,
  running time, genres), five per view, with "Xem tất cả 8 phim" (*See all 8
  movies*) and < > buttons.
- "Phim sắp chiếu" (*Coming soon*): the same row with release dates instead of
  running time.

**How the user uses it.**
- Pick a movie in "Phim chiếu hôm nay": the hero switches to that movie (the
  still crossfades, the text fades in). Nothing rotates by itself.
- Press a showtime chip to go straight to seat selection (5.4).
- Press "Xem chi tiết phim và lịch chiếu các ngày" (*Movie details and other
  days*) or any poster to open the movie details (5.2).
- Use < > (desktop) or swipe (phone) to browse the poster rows; "Xem tất cả"
  opens the catalogue (5.1).
- Type in "Tìm phim…" in the header and press Enter to search the catalogue.
- If no showtime is left today, the hero says so and shows the next day with
  showtimes ("Chưa còn suất hôm nay. Suất gần nhất: …").

### 5.1 Movie catalogue

![Movie catalogue, desktop](ui-prototype-screenshots/02-catalogue-1440.png)

<img src="ui-prototype-screenshots/02-catalogue-375.png" alt="Movie catalogue, phone" width="300">

**Purpose.** UC01 basic flow: list the movies the cinema shows and let the
customer narrow them down. No login is needed.

**Information displayed.**
- Two tabs: "Đang chiếu" (*Now showing*) and "Sắp chiếu" (*Coming soon*).
- "Tên phim" (*Title*) search field and "Thể loại" (*Genre*) list.
- The result count, for example "8 phim đang chiếu" (*8 movies now showing*).
- A grid of posters (6 per row on desktop, 2 on phones). Each tile shows the
  title, age rating, running time (or release date for coming-soon movies) and
  genres.

**How the user uses it.**
- Switch tabs, type part of a title, or choose a genre; the grid updates as the
  customer types. Search ignores Vietnamese accents ("bo sua" finds "Bò Sữa
  Bay").
- The tab, search text and genre are kept in the address
  (`/movies?status=coming-soon&q=…&genre=…`), so the result can be shared or
  reloaded.
- Press a poster to open its details (5.2).
- No match: see state 6.1 ("Xoá bộ lọc", *Clear filters*).

### 5.2 Movie details and showtimes

![Movie details, desktop](ui-prototype-screenshots/03-movie-details-1440.png)

<img src="ui-prototype-screenshots/03-movie-details-375.png" alt="Movie details, phone" width="300">

**Purpose.** UC01: show everything the customer needs to decide on a movie
and choose a showtime. Selecting a showtime starts UC02.

**Information displayed.**
- Poster, title, age rating with its meaning written out ("T18: Phim dành cho
  khán giả từ đủ 18 tuổi trở lên", *for viewers aged 18 and over*), running
  time, genres, release date, synopsis, formats.
- "Lịch chiếu" (*Showtimes*): one button per day that has showtimes ("Hôm
  nay" for today, then the weekday), each with the date and the number of
  showtimes.
- For the selected day, one row per format (2D, 3D, IMAX) with a one-line
  explanation of the format, then the showtime chips: start time and room.
- A sold-out showtime is shown crossed out with the words "Hết vé" (*Sold
  out*) and cannot be pressed.
- A note that prices depend on seat type and day and are shown at seat
  selection.

**How the user uses it.**
- Choose a day; the list of showtimes swaps in for that day (the choice is
  kept in the address, `?date=`).
- Press a showtime chip to open seat selection (5.4) for that showtime.
- A coming-soon movie shows its release date instead of showtimes (state 6.1).

### 5.3 Login / register

![Login, desktop](ui-prototype-screenshots/04-login-1440.png)

<img src="ui-prototype-screenshots/04-login-375.png" alt="Login, phone" width="300">

**Purpose.** UC02 alternative flow 2.2.2.1: a guest tries to hold seats, so
the system asks them to log in or register (UC06) and then brings them back
to the same seat map with the same seats still selected.

**Information displayed.**
- Heading "Đăng nhập để giữ ghế" (*Log in to hold your seats*).
- What the customer was booking: movie, showtime, room, and the seats already
  chosen ("Ghế bạn đã chọn: D8, H4"), with a reminder that seats are only held
  after logging in and pressing "Giữ ghế".
- Two tabs: "Đăng nhập" (*Log in*: email, password) and "Đăng ký" (*Register*:
  full name, email, password of at least 12 characters).
- The movie's still behind the form, so the customer stays "in" the booking.
- "Tài khoản dùng thử" (*Demo account*), folded, for the prototype only.

**How the user uses it.**
- Enter email and password and press "Đăng nhập", or switch to "Đăng ký" and
  create an account (the email is kept when switching tabs).
- Wrong input: an error appears under each field and a summary at the top of
  the form; pressing a summary line moves to the field. An email that already
  has an account offers "Đăng nhập bằng email này" (*Log in with this email*).
- After success the customer returns to 5.4 with the seats still selected and
  presses "Giữ ghế".

### 5.4 Seat selection

**Before holding (guest, two seats selected):**

![Seat selection, desktop](ui-prototype-screenshots/05-seat-selection-1440.png)

**After holding (logged in, countdown running):**

![Seats held, desktop](ui-prototype-screenshots/uc02-seats-held-1440.png)

<img src="ui-prototype-screenshots/05-seat-selection-375.png" alt="Seat selection, phone" width="300"> <img src="ui-prototype-screenshots/uc02-seats-held-375.png" alt="Seats held, phone" width="300">

**Purpose.** UC02 Select Seats: the customer chooses seats on a map of the
room and holds them for 10 minutes while deciding. This is the core screen of
the product.

**Information displayed.**
- Booking steps (step 2), movie title, room, time and date, format, and
  "Đổi suất" (*Change showtime*).
- The seat map: the screen as a silver arc at the top ("Màn hình"), an amber
  projector beam over the rows, row letters on both sides, seat numbers on
  free seats.
- **Seat types by shape:** regular seat; VIP seat with a taller backrest and a
  diamond mark; couple seat ("Ghế đôi", SWEETBOX) drawn as one sofa two seats
  wide.
- **Seat states by fill, pattern and icon (not colour alone):** "Trống"
  (*Free*, outline with number), "Bạn đang chọn" (*Your choice*, amber with a
  check), "Người khác đang giữ" (*Held by someone else*, hatched with a clock),
  "Đã bán" (*Sold*, filled with a cross), "Tạm ngưng" (*Out of service*,
  dashed).
- Legend: the five states, and the three seat types with their price for this
  showtime (75.000 ₫, 95.000 ₫, 180.000 ₫ for two people).
- Summary panel "Ghế đã chọn" (*Selected seats*): each seat with its type and
  price, the subtotal "Tạm tính", and the limit of 20 seats per booking.
- After holding: "Đang giữ ghế cho bạn 10:00" (*Holding your seats*) counting
  down; it turns red in the last minute.
- On phones the summary becomes a bar fixed at the bottom (seats, total, timer,
  main button), the map scrolls sideways with faded edges and the hint "Vuốt
  ngang để xem thêm ghế" (*Swipe to see more seats*), and "+ / −" change the
  seat size.

**How the user uses it.**
- Press a free seat to select it, press it again to deselect (UC02 alt
  2.2.2.4); the subtotal updates at once. Keyboard users move with the arrow
  keys and select with Space or Enter.
- Press "Giữ ghế" (*Hold seats*). A guest sees "Đăng nhập để giữ ghế" instead
  and goes to 5.3 (alt 2.2.2.1).
- The hold is all or nothing: if any chosen seat was taken meanwhile, nothing
  is held, the map refreshes and the taken seats are named (alt 2.2.2.2,
  section 6.2).
- With seats held, press "Tiếp tục" (*Continue*) to go to the booking review
  (5.5), or "Bỏ giữ ghế" (*Release seats*) to give them back.
- If the 10 minutes run out, the seats are released and the customer is asked
  to choose again (alt 2.2.2.5).

### 5.5 Booking review

![Booking review, desktop](ui-prototype-screenshots/06-booking-review-1440.png)

<img src="ui-prototype-screenshots/06-booking-review-375.png" alt="Booking review, phone" width="300">

**Purpose.** UC03 Book Movie Tickets: show exactly what will be booked and the
amount to pay, let the customer apply a discount code (UC18), and create the
booking.

**Information displayed.**
- Booking steps (step 3), movie title, room, time, date, format.
- "Ghế đã giữ (2 ghế)" (*Seats held*): a table with seat, type, unit price,
  discount and line total (a list on phones). The heading says "seats", not
  "tickets", because no ticket exists before payment.
- "Mã giảm giá" (*Discount code*) with "Áp dụng" (*Apply*).
- Summary panel: remaining hold time "Còn giữ ghế 09:56", "Tạm tính"
  (*Subtotal*), "Giảm giá" (*Discount*, with the code), "Phải trả" (*Amount to
  pay*).
- A note that pressing "Tiếp tục thanh toán" creates a booking waiting for
  payment, and that tickets only exist after a successful payment.

**How the user uses it.**
- Enter a code and press "Áp dụng". A valid code shows the discount per seat
  and in the total ("Đang dùng mã CHAOTHANG11, giảm 27.500 ₫" with "Bỏ mã",
  *remove code*). An invalid, expired or ineligible code shows the reason and
  keeps the original price (section 6.3).
- Press "Tiếp tục thanh toán" (*Continue to payment*) to create the booking
  (5.6). Pressing it twice creates only one booking (alt 3.2.2.4).
- Press "Quay lại chọn ghế" (*Back to seat selection*): a dialog asks first,
  because going back releases the held seats (alt 3.2.2.2).

### 5.6 Booking created (PENDING)

![Booking created, desktop](ui-prototype-screenshots/07-booking-pending-1440.png)

<img src="ui-prototype-screenshots/07-booking-pending-375.png" alt="Booking created, phone" width="300">

**Purpose.** End of UC03: confirm that the booking exists, give its
reference, and show what is still needed (payment) and by when.

**Information displayed.**
- Booking steps (step 4), the booking reference set large (for example
  "BK-J5F25"; letters and digits that look alike, such as O/0 and I/1, are not
  used) and "Đơn đặt vé đã được tạo." (*Your booking has been created.*).
- "Trạng thái: Chờ thanh toán" (*Status: waiting for payment*) in words with a
  clock icon, "Số tiền phải trả" (*Amount to pay*) and "Thời hạn thanh toán:
  còn 09:48" (*Time left to pay*). The payment deadline is the end of the seat
  hold (decision D26).
- "Chi tiết đơn" (*Booking details*): movie, showtime, room, seats with types,
  subtotal, discount, amount to pay.
- "Thanh toán qua VNPAY" (*Pay with VNPAY*), shown disabled, with a note that
  payment is not open in this prototype and that the seats stay held until the
  deadline.

**How the user uses it.** The customer notes the reference. Payment is UC04
and will be enabled when the payment module exists. If the deadline passes,
the page says so and offers "Chọn ghế lại" (*Choose seats again*, section
6.3).

---

## 6. Alternative flows, errors and empty states

Every state below is a screenshot of the running prototype. The mock API can
simulate a server failure, an empty cinema or a slow network; how to open each
state is listed in `src/frontend/README.md`, section "States".

### 6.1 UC01 — Browse movies and view details

| State (UCS reference) | What the customer sees | Screenshot |
|---|---|---|
| No movie matches the search or filter (1.2.2.1) | "Không tìm thấy phim đang chiếu nào có tên chứa "zzz"", a hint to shorten the text or change the genre, and "Xoá bộ lọc" (*Clear filters*) | ![](ui-prototype-screenshots/uc01-no-results-1440.png) |
| The cinema has no movies (1.2.2.1), catalogue | "0 phim đang chiếu", "Hiện chưa có phim đang chiếu." and a link back to Home | ![](ui-prototype-screenshots/uc01-no-movies-catalogue-1440.png) |
| The cinema has no showtimes (1.2.2.1), Home | "Chưa có suất chiếu mới" (*No new showtimes yet*), when they will appear, and "Xem tất cả phim" | ![](ui-prototype-screenshots/uc01-no-movies-home-1440.png) |
| Movie has no showtimes (1.2.2.2) | Details are shown; under "Lịch chiếu": "Phim chưa có suất chiếu" (*No showtimes yet*) and a link to other movies | ![](ui-prototype-screenshots/uc01-no-showtimes-1440.png) |
| Coming-soon movie (1.2.2.2) | "Phim khởi chiếu ngày 27/11/2026" (*Opens on…*) instead of showtimes | ![](ui-prototype-screenshots/uc01-coming-soon-details-1440.png) |
| Details cannot be retrieved (1.2.2.3) | "Không tải được thông tin phim", what to check, "Thử lại" (*Retry*) and "Về danh sách phim" (*Back to movies*) | ![](ui-prototype-screenshots/uc01-details-load-error-1440.png) |
| Movie does not exist (1.2.2.3) | "Không tìm thấy phim này" (*Movie not found*) and a way back | ![](ui-prototype-screenshots/uc01-movie-not-found-1440.png) |
| Home cannot load the schedule | "Không tải được lịch chiếu", reason, "Thử lại" | ![](ui-prototype-screenshots/uc01-home-load-error-1440.png) |
| Catalogue cannot load | "Máy chủ của rạp chưa phản hồi.", the filters are kept, "Thử lại" | ![](ui-prototype-screenshots/uc01-catalogue-load-error-1440.png) |
| Loading (Home, catalogue, details) | Grey placeholders in the shape of the real layout, so nothing jumps when data arrives | ![](ui-prototype-screenshots/loading-home-1440.png) ![](ui-prototype-screenshots/loading-catalogue-1440.png) ![](ui-prototype-screenshots/loading-movie-details-1440.png) |

### 6.2 UC02 — Select seats

| State (UCS reference) | What the customer sees | Screenshot |
|---|---|---|
| Guest tries to hold seats (2.2.2.1) | The login page with the booking context (screen 5.3); afterwards the same seats are still selected | ![](ui-prototype-screenshots/04-login-1440.png) |
| A seat was taken by another customer (2.2.2.2) | Nothing is held; the map refreshes; the taken seat (G5) is now "held by someone else"; a notice names the seat and asks to choose again | ![](ui-prototype-screenshots/uc02-seat-taken-1440.png) |
| Showtime sold out (2.2.2.3), seat map | Every seat is sold; the panel says "Suất chiếu đã hết vé" (*This showtime is sold out*) with "Xem suất khác" (*See other showtimes*) | ![](ui-prototype-screenshots/uc02-sold-out-1440.png) |
| Showtime sold out (2.2.2.3), details | The 21:45 IMAX chip is crossed out and reads "Hết vé"; it cannot be pressed | ![](ui-prototype-screenshots/uc02-sold-out-chip-1440.png) |
| Deselect a seat (2.2.2.4) | Pressing a selected seat again removes it from "Ghế đã chọn" and the subtotal drops at once (see 5.4) | ![](ui-prototype-screenshots/05-seat-selection-1440.png) |
| Hold expired (2.2.2.5) | "Hết thời gian giữ ghế…" (*Hold time is over*): the seats are released and the customer chooses again | ![](ui-prototype-screenshots/uc02-hold-expired-1440.png) |
| Hold request fails (server error) | "Không giữ được ghế. Kiểm tra kết nối rồi bấm "Giữ ghế" lần nữa."; the selection is kept | ![](ui-prototype-screenshots/uc02-hold-failed-1440.png) |
| Seat map cannot be loaded | "Không tải được sơ đồ ghế" with "Thử lại" | ![](ui-prototype-screenshots/uc02-seatmap-load-error-1440.png) |
| Showtime does not exist | "Không tìm thấy suất chiếu" and "Về danh sách phim" | ![](ui-prototype-screenshots/uc02-showtime-not-found-1440.png) |
| Loading | Placeholders in the shape of the seat map and the panel | ![](ui-prototype-screenshots/loading-seat-selection-1440.png) |

### 6.3 UC03 — Book movie tickets (and UC18 discount code)

| State (UCS reference) | What the customer sees | Screenshot |
|---|---|---|
| Hold expired before confirmation (3.2.2.1) | "Hết thời gian giữ ghế" with the released seats named and "Chọn lại ghế" (*Choose seats again*) | ![](ui-prototype-screenshots/uc03-review-hold-expired-1440.png) |
| Back to seat selection (3.2.2.2) | Dialog "Bỏ giữ ghế và quay lại?" (*Release the seats and go back?*): "Ở lại trang này" (*Stay*) or "Bỏ giữ ghế" (*Release seats*) | ![](ui-prototype-screenshots/uc03-leave-dialog-1440.png) |
| Price changed (3.2.2.3) | "Giá vé vừa thay đổi" (*Prices have just changed*) with the old total struck through and the new total; the main button becomes "Đồng ý giá mới và tiếp tục" (*Accept the new price and continue*); no booking is created without that second press | ![](ui-prototype-screenshots/uc03-price-changed-1440.png) |
| Duplicate press on confirm (3.2.2.4) | The button turns into "Đang tạo đơn…" and is disabled; a second request returns the same booking, so only one booking exists | (no separate screen) |
| Booking failed (3.2.2.5) | "Chưa tạo được đơn đặt vé" (*The booking was not created*), the seats are still held, the button becomes "Thử lại" | ![](ui-prototype-screenshots/uc03-booking-failed-1440.png) |
| Invalid discount code (UC18) | The reason under the field ("Không có mã ABC. Kiểm tra lại chính tả."); the price stays the same. Expired, not yet valid, minimum subtotal and seat-type rules have their own messages | ![](ui-prototype-screenshots/uc18-invalid-code-1440.png) |
| Discount code applied (UC18) | The discount per seat and in the total; "Đang dùng mã CHAOTHANG11, giảm 27.500 ₫" with "Bỏ mã" | ![](ui-prototype-screenshots/uc18-code-applied-1440.png) |
| Review cannot be priced (server error) | "Không tải được thông tin đặt vé" (the seats are still held), "Thử lại" and "Về chọn ghế" | ![](ui-prototype-screenshots/uc03-review-load-error-1440.png) |
| Payment time is over | "Đơn BK-… đã hết hạn thanh toán" (*The booking's payment time is over*), the seats are released, "Chọn ghế lại"; the details stay visible | ![](ui-prototype-screenshots/uc03-payment-time-over-1440.png) |
| Booking cannot be loaded | "Không tải được đơn đặt vé" with "Thử lại" | ![](ui-prototype-screenshots/uc03-booking-load-error-1440.png) |
| Booking does not exist | "Không tìm thấy đơn đặt vé" and "Về danh sách phim" | ![](ui-prototype-screenshots/uc03-booking-not-found-1440.png) |

### 6.4 Any page

| State | What the customer sees | Screenshot |
|---|---|---|
| Unknown address | "Không tìm thấy trang" (*Page not found*), the address that was typed, "Xem phim đang chiếu" and "Về trang chủ" | ![](ui-prototype-screenshots/not-found-page-1440.png) |

## 7. Traceability to the Use-Case Specification

| UCS v1.1 | Requirement | Where in the prototype |
|---|---|---|
| UC01 basic flow | Movies marked now showing / coming soon with title, poster, genre, duration, age rating; search and filters | 5.0 rows, 5.1 tabs, search, genre filter |
| UC01 basic flow | Movie details, poster, available showtimes; selecting a showtime leads to Select Seats | 5.2 |
| UC01 special requirement | Browsing needs no login | 5.0–5.2 open without an account |
| UC01 1.2.2.1–1.2.2.3 | No results / no movies; no showtimes; details cannot be retrieved | 6.1 |
| UC02 basic flow | Room information, real-time seat map, seat types, prices, states AVAILABLE / HELD / SOLD + selected, summary with seat identifiers, types and total, confirm, remaining hold time | 5.4 |
| UC02 special requirement | Seat states not shown by colour alone | 5.4 legend: fill + pattern + icon + shape |
| UC02 2.2.2.1–2.2.2.5 | Login prompt; seat taken; sold out; deselect; hold expired | 5.3, 6.2 |
| UC03 basic flow | Movie, room, showtime, seats and types, itemised prices, discount, total, remaining hold time, discount code field, proceed / cancel; then booking reference, PENDING status, amount, remaining payment time | 5.5, 5.6 |
| UC03 3.2.2.1–3.2.2.5 | Hold expired; back releases seats; price changed with re-confirmation; duplicate press; booking failed | 6.3 |
| UC18 | Apply a discount code; invalid or ineligible code keeps the base price | 5.5, 6.3 |
| UC06 (part) | Log in / register when needed to hold seats | 5.3 |

**Matching the SAD (v1.1 §4.1, Customer Web App).** `MovieListPage` → 5.1,
`MovieDetailPage` → 5.2, `SeatSelectionPage` and `SeatMapStore` → 5.4,
`CheckoutPage` → 5.5 and 5.6, `SessionStore` → 5.3. Home (5.0) is an extra page
the SAD does not list yet.

## 8. Notes on this prototype

- **Sample data, not a database.** Holds, bookings and new accounts live in
  the browser's memory and are lost on reload. "Held by someone else" seats and
  the price change are scripted so the alternative flows can be shown.
- **Payment is not included.** The VNPAY button is disabled; no ticket is
  issued (UC04 and UC05 come later).
- **Images.** Posters and stills are linked from moveek.com for this course
  project only; they are copyrighted by their owners and are not for public
  release.
