# MEDI-CINE — UI Design Brief (Customer Web App)

| | |
|---|---|
| Version | 0.9 (§8 Home movie switch added, Phase 7; v0.8 §3.1 gradient rule: backdrop top fade, seat-map scroll fade; v0.7 §6 Phase 4 note: how each state opens; v0.6 §5 seat types revised: VIP mark, double-width SWEETBOX, OQ-05; v0.5 Phase 3 implementation notes on screens 1, 3, 5, D26; v0.4 details backdrop not blurred; v0.3 Home revised, D25; v0.2 palette revised after benchmark, §13) |
| Date | 20/11/2026 |
| Author | Vân Hoàng Nhật (24120209), Group 04 |
| Scope | PA4-b UI prototype: UC01 Browse Movies and View Movie Details, UC02 Select Seats, UC03 Book Movie Tickets (+ login prompt from UC06) |
| Sources | Use-Case Specification v1.1, SAD v1.1 §4.1, Vision v1.2, `docs/api/openapi.yaml`, `PRODUCT.md`, `CLAUDE.md` (D10–D23) |

This brief is the single source of visual and interaction rules for every
screen, including the Home page built with Taste Skill (D20). Code reads the
tokens from `src/frontend/src/index.css` (`@theme`), which must match §3.

## 1. Job, audience, outcome

- **Who:** customers of MEDI-CINE, one mid-size cinema in Vietnam. They come
  to see what is on, usually planning an evening or weekend show.
- **Job:** pick a movie → a showtime → seats → review the price → create a
  booking (PENDING, waiting for payment).
- **Success:** the whole flow in under 5 minutes (Vision §6), the customer
  always knows which seats they hold, for how long, and what they will pay.
- **Primary device:** desktop first (user, 20/11/2026), designed at 1440 px,
  then adapted to 768 px and 375 px.

## 2. Direction: A — "Phòng chiếu" (the screening room)

The interface is the auditorium a moment before the film starts: the house
lights are down, the screen glows, and the only warm light is the projector
beam. Posters and stills supply the colour; the interface stays in the dark
around them.

The dark is **teal**, not navy or black: it borrows the "teal and orange"
colour grade used across modern film, where cool teal shadows meet warm
amber light. That pairing is cinema-specific, and it separates MEDI-CINE
from the local chains (§13).

**Where the boldness goes (one place):** the seat map. The screen is drawn as
a silver arc at the top, and a soft amber projector beam falls from it across
the rows. Selected seats are lit by the same amber, as if the beam found
them. Everything else stays quiet.

**Supporting idea, "house lights":** on the movie details and seat pages, the
movie's backdrop still is shown dimmed behind the content, so each movie's
page takes on that movie's colour without new tokens. On the details page the
still is **not blurred** (v0.4, Phase 3): the user found the blurred Home
backdrop soft (D25), so it uses the 1600 px still under `house` scrims
instead. The seat page keeps its small blurred band behind the map.

## 3. Tokens

### 3.1 Colour

| Token | Name | Hex | Use |
|---|---|---|---|
| `--color-house` | Khán phòng (auditorium) | `#0B1A1C` | Page background. Deep teal, not navy, not black |
| `--color-wall` | Tường (wall) | `#13282B` | Raised surfaces: panels, inputs, menus |
| `--color-aisle` | Lối đi (aisle) | `#24403F` | Decorative dividers, SOLD seat fill. **Never** the only boundary of a control |
| `--color-seat-line` | Tay vịn (armrest) | `#5E807F` | Outline of AVAILABLE seats, input and button borders (UI boundaries) |
| `--color-screen` | Màn bạc (silver screen) | `#E4EEEC` | Primary text, the screen arc |
| `--color-dust` | Bụi sáng (dust in the beam) | `#9DB5B2` | Secondary text, captions |
| `--color-lamp` | Đèn chiếu (projector lamp) | `#F4B23E` | Primary action, selected seats, focus ring, countdown |
| `--color-velvet` | Ghế nhung (velvet seat) | `#E07280` | Errors, conflicts, expiring hold (< 60 s) |

Contrast, computed with the WCAG 2.1 formula (20/11/2026):

| Pair | Ratio | Needed | Result |
|---|---|---|---|
| `screen` on `house` / `wall` | 15.05 / 12.99 | 4.5 (text) | Pass |
| `dust` on `house` / `wall` | 8.22 / 7.09 | 4.5 (text) | Pass |
| `lamp` on `house` / `wall`; `house` text on `lamp` | 9.57 / 8.26; 9.57 | 4.5 (text) | Pass |
| `velvet` on `house` / `wall` | 5.84 / 5.04 | 4.5 (text) | Pass |
| `seat-line` on `house` / `wall` | 4.13 / 3.56 | 3.0 (UI boundary, 1.4.11) | Pass |
| `aisle` on `house` / `wall` | 1.60 / 1.38 | 3.0 | Fails → decoration only |

Revisions:
- v0.1 used `velvet #D0606F` (4.22 on `wall`, failed) and `aisle` for seat
  outlines (1.54, failed).
- v0.1 background `#0E1626` (ink blue) was almost identical to Cinestar's
  `#0F172A` + yellow buttons. v0.2 moves every neutral to teal (user,
  20/11/2026).

Rules:
- Text on `house`/`wall` uses `screen` or `dust`. Text on `lamp` uses
  `house` (dark on amber).
- `lamp` is never used for decoration; if something is amber, it is either
  the main action, a selected seat, focus, or time.
- No gradients as decoration. The only gradients are the projector beam
  (amber, low opacity) on the seat map, the dark fades over backdrops
  (including a top fade that sinks title art printed on some stills), and
  the edge fade that shows a seat map scrolls sideways on phones (v0.8).
- Text placed over posters/backdrops always sits on a dark scrim strong
  enough to keep the ratios above; re-check in Phase 5 on real screenshots.

### 3.2 Type

| Role | Typeface | Notes |
|---|---|---|
| Display: movie titles, page titles, hero | **Anybody** (variable: weight + width) | Set titles **wide** (width ≈ 120–130) like a widescreen frame; used large and sparingly |
| Text and UI: body, labels, buttons, prices, times | **Commissioner** (variable) | Tabular numerals for prices, times, countdown (`font-variant-numeric: tabular-nums`) |

Both are on Google Fonts and include the Vietnamese subset (checked
20/11/2026). Test string: "Đặt vé · Ghế đôi · Suất 19:30 · Thứ Bảy 21/11".

Scale (desktop, 1.25 ratio, base 16 px): 13 · 16 · 20 · 25 · 31 · 39 · 49 ·
61. Body 16/1.55; line length ≤ 72 characters. Mobile drops the top two
steps.

Type rules:
- Sentence case everywhere. No all-caps labels, no tracked-out eyebrows.
- No single-word colour/italic accent in headlines.
- Movie titles are never truncated on the details page; in grids they wrap
  to 2 lines then ellipsis, with the full title in `title`/`aria-label`.

### 3.3 Shape, space, elevation

- Spacing scale 4 px base: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96.
- Radius by role, not one value everywhere: seats 6 px (top corners larger:
  backrest), inputs and buttons 8 px, panels 12 px, posters 4 px.
- Elevation by light, not grey shadows: raised surfaces use `wall` plus a
  1 px `aisle` border. The only glow is amber around focused/selected items.
- Layout: max content width 1200 px, 12-column grid, 24 px gutters on
  desktop; 16 px side padding on mobile.

## 4. Screens (desktop wireframes)

Navigation bar on all screens: logo "MEDI-CINE" (left), Phim đang chiếu,
Phim sắp chiếu, search field, Đăng nhập / account (right).

Booking steps shown on screens 4–5 (a real sequence, so numbering is
allowed): **Chọn suất → Chọn ghế → Xác nhận → Thanh toán**.

### 0. Home (UC01 entry) — Taste Skill, bound to this brief

```
┌──────────────────────────────────────────────────────────────────────┐
│ MEDI-CINE   Đang chiếu  Sắp chiếu        [Tìm phim...      ]  Đăng nhập│
├──────────────────────────────────────────────────────────────────────┤
│ ░░░░░░░░░░░ backdrop of the featured movie, dimmed ░░░░░░░░░░░░░░░░░░ │
│                                                                      │
│  Đấu Trường Sinh Tử:                      (Anybody, wide, large)       │
│  Bình Minh Ngày Chiêu Quân                                            │
│  [T16]  158 phút  [IMAX]                                              │
│  Suất hôm nay:  [11:00 IMAX]  [19:30 IMAX]       [Xem chi tiết phim]   │
├──────────────────────────────────────────────────────────────────────┤
│ Đang chiếu                                           Xem tất cả phim   │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                              │
│ │post│ │post│ │post│ │post│ │post│ │post│   title (2 lines max)        │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘   [T16] 135 phút             │
│ Sắp chiếu                                                             │
│ ┌────┐ ┌────┐ ┌────┐   release date under each: "Khởi chiếu 27/11"     │
└──────────────────────────────────────────────────────────────────────┘
```
- Purpose: show what is on now and get the customer to a showtime fast.
- Hero opens with the most cinema-specific thing: **today's showtimes of one
  featured movie, clickable** (straight to seat selection), not a slogan.
- Content: UC01 data only (no invented reviews, ratings or promos).

**Revised after Phase 2b (D25, user 20/11/2026):** built from the Taste
Skill variant, with these changes (benchmark: Moveek's home hero lets the
visitor switch between several movies):
- The hero covers **every movie showing today** (showtimes still to come),
  not one featured movie. A list beside the title (a column on desktop, a
  swipe row on phones) lets the customer pick which movie fills the hero;
  default = the newest release. Manual only, never auto-rotating (§8). When
  nothing is left today, the nearest day with showtimes is used and named.
- "Phim đang chiếu" and "Phim sắp chiếu" are the same poster rail: 5 posters
  per view at ≥ 1024 px (4 at 768, 3 at 640, a swipe row on phones), with
  < / > buttons that page one view and are disabled at either end. Coming
  soon tiles show the release date instead of the duration.
- Backdrops use Moveek's 1600 px size (`large_2x`); the 800 px size looked
  soft when stretched across the hero.

### 1. Movie catalogue (UC01)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Phim                                                                  │
│ [ Đang chiếu | Sắp chiếu ]   [Tìm theo tên phim...]  [Thể loại ▾]       │
│ 8 phim                                                                │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                              │
│ │    │ │    │ │    │ │    │ │    │ │    │   6 columns at 1440          │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘   4 at 1024, 3 at 768, 2 at 375│
│ Title / [T16] 108 phút / Hài, Hành động                               │
└──────────────────────────────────────────────────────────────────────┘
```
- Posters are the tiles; no card box, no shadow. Hover/focus: amber outline
  on the poster.
- Each tile shows title, age rating, duration, genres (UCS UC01).
- Coming soon tab shows the release date instead of duration.
- **As built (Phase 3):** tab, search text and genre live in the URL
  (`?status=coming-soon&q=…&genre=…`) so the header search lands here; grid
  6 / 4 / 3 / 2 columns. Header: "Đang chiếu", "Sắp chiếu" (one "Phim" link
  below 640 px); the header search field and the account name show from
  1024 px (they overflowed at 768 px when signed in).

### 2. Movie details + showtimes (UC01)

```
┌──────────────────────────────────────────────────────────────────────┐
│ ░░░ backdrop, dimmed, not blurred (house lights, v0.4) ░░░░░░░░░░░░░░░ │
│ ┌────────┐  Bò Sữa Bay                         (Anybody, wide)          │
│ │ poster │  [T18]  108 phút  Hài, Hành động, Chính kịch  [2D]            │
│ │        │  Synopsis (≤ 72 ch per line)                                │
│ └────────┘                                                            │
├──────────────────────────────────────────────────────────────────────┤
│ Lịch chiếu                                                            │
│ [Hôm nay 20/11] [T7 21/11] [CN 22/11] [T2 23/11]   ← date strip        │
│ 2D   [14:30 Phòng 1]  [17:00 Phòng 1]  [19:30 Phòng 1]                  │
│ IMAX [21:45 Phòng IMAX — Hết vé]                                       │
└──────────────────────────────────────────────────────────────────────┘
```
- Showtimes grouped by date, then format. Each time chip shows start time
  and room; selecting one → screen 4 (or screen 3 if not logged in).
- Sold-out showtime: chip disabled with the text "Hết vé" (not colour only).
- Age rating: badge plus its meaning written out on the page, not only in a
  tooltip (tooltips do not work on touch). Example: "T18: Phim dành cho khán
  giả từ đủ 18 tuổi trở lên" (pattern seen on Cinestar, §13).
- Format chips (2D / 3D / IMAX) carry a one-line explanation the first time
  they appear on the page (pattern seen on Alamo Drafthouse, §13).
- The first date in the strip is labelled "Hôm nay".

### 3. Login / register (UC06, UC02 alt 2.2.2.1)

```
┌──────────────────────────────────────────────────────────────────────┐
│ ░░░ backdrop of the movie being booked, dimmed ░░░░░░░░░░░░░░░░░░░░░░░ │
│              ┌────────────────────────────────┐                       │
│              │ Đăng nhập để giữ ghế            │                       │
│              │ Bò Sữa Bay, 19:30 Thứ Sáu 20/11  │  ← what they were doing│
│              │ [ Đăng nhập | Đăng ký ]          │                       │
│              │ Email     [....................] │                       │
│              │ Mật khẩu  [....................] │                       │
│              │ [ Đăng nhập ]                    │                       │
│              └────────────────────────────────┘                       │
└──────────────────────────────────────────────────────────────────────┘
```
- After login, return to the seat map of the same showtime.
- Errors inline under the field, plus a summary at the top of the form.
- **As built (Phase 3):** the two modes are underline tabs (`?mode=register`),
  since a boxed switch inside the panel read as a card in a card. Register
  follows `RegisterInput` (name, email, password 12–128) and then logs in.
  The seats picked as a guest are restored on the seat page and the saved
  copy is dropped at once.

### 4. Seat selection (UC02) — the signature screen

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1 Chọn suất ─ 2 Chọn ghế ─ 3 Xác nhận ─ 4 Thanh toán                   │
│ Bò Sữa Bay   Phòng 1   19:30 Thứ Sáu 20/11/2026   2D                   │
├───────────────────────────────────────────────┬──────────────────────┤
│        ╭──────────── Màn hình ────────────╮     │ Ghế đã chọn           │
│          ░░░ amber beam fades downward ░░░    │ D7  Ghế VIP  95.000 ₫  │
│   A  □ □ □   □ □ □ □ □ □ □ □   □ □ □        │ D8  Ghế VIP  95.000 ₫  │
│   B  □ □ □   □ □ □ □ □ □ □ □   □ □ □        │ ───────────────────── │
│   D  □ □ □   ▣ ▣ ◩ ◩ ■ ■ ▣ ▣   □ □ □        │ Tổng cộng  190.000 ₫   │
│   E  □ □ □   ▣ ▣ ▣ ✕ ✕ ✕ ▣ ▣   □ □ □        │ [ Giữ ghế ]            │
│   H    ▭▭  ▭▭  ▭▭  ▭▭  ▭▭                   │ (after hold)          │
│                                               │ Đang giữ ghế 09:42     │
│ Chú thích: □ Trống  ■ Đang chọn ✓  ◩ Đang được │ [ Tiếp tục ]           │
│ giữ (sọc + đồng hồ)  ✕ Đã bán  ▣ VIP  ▭▭ Ghế đôi│                       │
└───────────────────────────────────────────────┴──────────────────────┘
```
- Map ≈ 8 columns, summary panel ≈ 4 columns and sticky.
- After "Giữ ghế" succeeds, the panel shows the countdown (from the server's
  `remainingSeconds`) and "Tiếp tục" goes to screen 5.
- Aisles are real gaps (positions missing from `SeatMap.seats`); row 1 is
  nearest the screen.
- Header has a "Đổi suất" link back to the showtime list of the same movie
  (Alamo keeps showtimes and seats side by side; we keep separate screens
  because UCS splits UC01 and UC02, but switching must stay one click).
- Available seats are the most visible thing on the map; unavailable seats
  recede (dark, with an icon). Below 768 px a zoom control (+ / −) sits in
  the map corner (pattern seen on Alamo, §13).

### 5. Booking review → booking created (UC03, UC18)

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1 Chọn suất ─ 2 Chọn ghế ─ 3 Xác nhận ─ 4 Thanh toán                   │
├───────────────────────────────────────────────┬──────────────────────┤
│ Xác nhận đặt vé                                │ Còn giữ ghế 07:15     │
│ Bò Sữa Bay                                     │                      │
│ Phòng 1   19:30 Thứ Sáu 20/11/2026   2D          │ Tạm tính  190.000 ₫   │
│ ┌─────────────────────────────────────────┐   │ Giảm giá  −19.000 ₫   │
│ │ Ghế  Loại      Đơn giá   Giảm    Thành tiền│   │ ───────────────────── │
│ │ D7   VIP       95.000 ₫  9.500 ₫  85.500 ₫  │   │ Phải trả  171.000 ₫   │
│ │ D8   VIP       95.000 ₫  9.500 ₫  85.500 ₫  │   │ [ Tiếp tục thanh toán ]│
│ └─────────────────────────────────────────┘   │ [ Quay lại chọn ghế ]  │
│ Mã giảm giá [CHAOTHANG11   ] [Áp dụng]          │                      │
│ ✓ Đã áp dụng: Giảm 10% tháng 11                 │                      │
└───────────────────────────────────────────────┴──────────────────────┘
```
After "Tiếp tục thanh toán" → **booking created** page:
```
│ Đơn đặt vé BK-7F3K2 đã được tạo                                         │
│ Trạng thái: Chờ thanh toán      Số tiền: 171.000 ₫                       │
│ Thời hạn thanh toán còn 09:58                                            │
│ Bò Sữa Bay · Phòng 1 · 19:30 20/11 · Ghế D7, D8                          │
│ [ Thanh toán qua VNPAY ]  ← UC04, next sprint (shown, not active)        │
```
- Never show "Đã thanh toán", a QR ticket or seats as SOLD here (P1, P2).
- "Quay lại chọn ghế" releases the hold (UC03 alt 3.2.2.2) after a confirm
  dialog.
- **As built (Phase 3):** the payment deadline on the booking-created page
  is the hold's expiry (D26: nothing extends a hold). Price changed
  (3.2.2.3) shows old vs new total and the button becomes "Đồng ý giá mới
  và tiếp tục"; a failed booking (3.2.2.5) turns it into "Thử lại". Mock
  switches for these: `?mockPriceChange=1`, `?mockBookingFail=1` on the seat
  page (kept for the tab).

## 5. Seat states (UC02 special requirement: not colour alone)

| State | Fill / outline | Extra cue | Interactive | Screen-reader label (example) |
|---|---|---|---|---|
| AVAILABLE | `seat-line` outline, transparent fill | seat label visible | yes | "Ghế D7, ghế VIP, 95.000 ₫, còn trống" |
| Selected (mine) | `lamp` fill, `house` text | ✓ check mark | yes (deselect) | "… đang chọn" |
| HELD (others) | diagonal hatch in `aisle` | small clock icon | no | "… đang được người khác giữ" |
| SOLD | solid `aisle`, dimmed | ✕ mark | no | "… đã bán" |
| OUT_OF_SERVICE | dashed outline, no label | — | no, skipped by keyboard | "Ghế D9 tạm ngưng phục vụ" |

Seat types use **shape**, not colour:
- REGULAR "Ghế thường": square with a slightly rounded top (backrest).
- VIP "Ghế VIP": same footprint, taller backrest with a small diamond mark
  in it. Outline only when available: a solid band would read as SOLD.
- SWEETBOX "Ghế đôi": one double-width couple sofa (two grid columns wide,
  one seat in data, one price for two people). `SeatView` has no width, so
  the UI treats a SWEETBOX as covering columns `number` and `number + 1`
  until the API adds a width field (OQ-05).

Keyboard: the map is a grid; arrow keys move between seats (roving
tabindex), Space/Enter toggles, skipping gaps. Minimum target 32 px desktop,
28 px mobile (map scrolls horizontally inside its frame on small screens,
rows labels stay pinned).

**Implementation status (20/11/2026, D24):** the "Phòng chiếu" seat map is
built. The two gaps found in Phase 2 are fixed in Phase 3 (user chose to
keep this rule and change the drawing): (1) the VIP headrest is outlined
with a diamond mark instead of filled, so only SOLD seats are solid;
(2) SWEETBOX is drawn double-width; the sample data now stores each couple
seat once (`SS` in `rooms.json` = one seat) with one price for the pair
(180.000 ₫ on weekdays).

## 6. States to design (alternative flows, UCS v1.1)

Each state gets its own URL in Phase 4 so it can be screenshotted.

**As built (Phase 4, 21/11/2026):** every row below opens from a URL plus
mock switches (`?mockFail=`, `?mockEmpty=1`, `?mockLatency=`, and the hold /
price / booking switches); the list is in `src/frontend/README.md`, section
"States". Added beyond this table: Home and catalogue load errors, seat map
load error vs unknown showtime, hold request failure, review that cannot be
priced, booking that cannot be loaded, and the unknown-address page.

| UC | Flow | State | Message direction (Vietnamese UI) |
|---|---|---|---|
| UC01 | 1.2.2.1 | No movies / no search results | Say what was searched, offer to clear filters |
| UC01 | 1.2.2.2 | Movie has no showtimes | "Phim chưa có suất chiếu", link back to catalogue |
| UC01 | 1.2.2.3 | Details cannot be loaded | Error + "Thử lại" + "Về danh sách phim" |
| UC02 | 2.2.2.1 | Guest tries to hold seats | Screen 3 with context of the showtime |
| UC02 | 2.2.2.2 | Seat taken by another customer | Whole selection rejected, map refreshed, taken seats named |
| UC02 | 2.2.2.3 | Showtime sold out | Map shown read-only + "Suất chiếu đã hết vé", other times offered |
| UC02 | 2.2.2.4 | Deselect a seat | Total recalculated immediately |
| UC02 | 2.2.2.5 | Hold expired | Notice, selection cleared, map refreshed |
| UC03 | 3.2.2.1 | Hold expired before confirming | Notice, back to seat selection |
| UC03 | 3.2.2.2 | Cancel / back | Confirm dialog, then seats released |
| UC03 | 3.2.2.3 | Price or promotion changed | Old vs new amount, explicit "Đồng ý giá mới" |
| UC03 | 3.2.2.4 | Double click on confirm | Button busy state; same booking reused |
| UC03 | 3.2.2.5 | Booking failed | Error + "Thử lại" |
| UC18 | — | Invalid / ineligible / expired code | Reason under the field; base price kept |
| — | — | Loading | Skeleton in the layout's real shape, no spinner-only pages |

Copy rules: errors say what happened and what to do, no apologies, no vague
"Đã có lỗi xảy ra" alone. Buttons say the action ("Giữ ghế", "Áp dụng",
"Tiếp tục thanh toán"), and the same action keeps the same name across the
flow.

## 7. Responsive (desktop first)

| Width | Changes |
|---|---|
| ≥ 1280 | As wireframes. |
| 768–1279 | Catalogue 3–4 columns; seat summary panel moves under the map as a sticky bottom bar (selected count, total, main button). |
| < 768 | One column; navigation collapses to a menu; date strip scrolls horizontally; seat map scrolls inside its frame with pinned row letters; hold countdown stays visible in the sticky bar. |

## 8. Motion (details decided in Phase 6)

- Allowed: seat press feedback, seat state change on conflict, total
  updating, countdown, opening the showtime list, and (v0.9, user-approved
  in Phase 7) switching the movie in the Home hero: the still crossfades,
  the text fades up, never the longer page-load entrance. 150–250 ms,
  `transform` and `opacity` only.
- Not allowed: fade-up on every section, auto-playing carousels, auto-play
  trailers with sound.
- `prefers-reduced-motion`: no movement, state changes still visible.
- Phase 6 values (durations, curves, what stays still): `DESIGN.md`,
  section "Motion (Phase 6)".

## 9. Do not

- Copy the look of CGV, Lotte, Galaxy, BHD or Moveek.
- Invent ratings, reviews, promotions or audience numbers.
- Use cream backgrounds, terracotta accents, neon green, card grids with
  identical grey shadows, ALL-CAPS eyebrows, "→" in button text, monospace
  data labels, or meta strings joined with middle dots.
- Show payment success, tickets or SOLD seats as a result of UC03.

## 10. Plan review (frontend-design pass 2)

Checked the first plan against the generic defaults it might fall into:

| First plan | Risk | Revision |
|---|---|---|
| Dark background + one amber accent everywhere | "Near-black + one bright accent" default | Background is dark teal (teal-and-orange film grade), not black or navy; amber is restricted to action/selection/time; **per-movie backdrops ("house lights") supply varied colour**, so pages differ by movie |
| Poster grid in rounded cards with shadows | SaaS card kit | Posters are the tiles; no card chrome; outline only on focus/hover |
| Hero with slogan + big CTA | Templated hero | Hero is a working object: today's showtimes of one movie, clickable |
| Meta line "T16 · 158 phút · IMAX" | Middle-dot meta string tell | Age rating badge + separate items with spacing |
| Display font chosen for "cinema" feel (condensed marquee) | Common pick for cinema sites | Anybody set **wide**, echoing widescreen frames; condensed only if Phase 2 shows wide fails on long Vietnamese titles |

## 11. Settled points (user, 20/11/2026)

1. ~~Featured movie on Home = the NOW_SHOWING movie with the most recent
   release that has at least one showtime today or later.~~ Replaced by D25:
   the Home hero lists every movie showing today (newest release selected
   first); an admin choice may replace the order later.
2. Posters/backdrops are hot-linked from Moveek's CDN (course use only). The
   UI shows a dark tile with the title when an image fails to load; broken
   links are checked and fixed together with the user at the end.
3. Mobbin references dropped (free plan too limited).

## 12. Where these rules come from

| Rule area | Source | Checked against real data? |
|---|---|---|
| Information on each screen, alternative flows, seat states not by colour alone | UCS v1.1 (UC01–UC03), CLAUDE.md "UI prototype scope" | Yes — the specification itself |
| Field names, enums, money/time formats | `docs/api/openapi.yaml`, D6, D8 | Yes |
| Contrast and keyboard rules | WCAG 2.1 AA (1.4.3, 1.4.11, 2.1.1, 2.4.7) | Contrast computed (§3.1) |
| Two-pass plan, list of generic "AI-looking" defaults to avoid, type scale method | `frontend-design` skill (Anthropic) | Self-review only (§10) |
| PRODUCT.md structure | Impeccable `init` | — |
| Palette, typefaces, "projector beam" idea | Designer's choice for direction A | Fonts: Vietnamese subset verified on Google Fonts. Palette and layout: compared with 5 real cinema sites (§13); background changed to avoid looking like Cinestar |

## 13. Benchmark against real cinema websites (20/11/2026)

Viewed at 1440 px in a browser: Galaxy Cinema, Cinestar, BHD Star, CGV
(Vietnam) and Alamo Drafthouse (USA). Studied for structure only; no colour,
logo, layout or copy is reused. Vietnamese chains show seat maps only after
login, so the seat map was studied on Alamo Drafthouse (no seat was bought
or held).

**Visual identity of the chains (what MEDI-CINE must not look like):**

| Site | Look |
|---|---|
| CGV | Cream background, brick-red pattern, red accents |
| Galaxy | White background, orange and blue |
| BHD Star | White background, green and red |
| Cinestar | Dark navy `#0F172A` → purple gradient, lemon-yellow buttons, uppercase condensed titles |
| Alamo Drafthouse | Near-black, yellow buttons, uppercase condensed titles |

→ v0.1 palette (ink blue + amber) was too close to Cinestar. Changed to
teal (§3.1). Amber for actions and selected seats is kept: every dark site
uses a yellow/amber action colour, so it matches what users expect.
Sentence-case wide titles (Anybody) also separate MEDI-CINE from the
uppercase condensed titles of Cinestar and Alamo.

**Patterns confirmed (kept in the brief):**

| Pattern | Seen on | In brief |
|---|---|---|
| Showtimes: date strip → format rows → time chips | Galaxy, Alamo | Screen 2 |
| Detail page: wide still/trailer band on dark, poster overlapping, title + age badge + duration + genres | Galaxy | Screen 2 ("house lights") |
| Empty state "no showtimes yet" | Cinestar ("Hiện chưa có lịch chiếu") | §6, UC01 1.2.2.2 |
| Login asked before seats for guests | Galaxy (modal on showtime click) | Screen 3 (UCS asks at hold time) |
| Screen drawn at the top of the map with its label | Alamo | Screen 4 |
| Selected seat = amber fill; unavailable seats dark with an icon | Alamo | §5 |
| Each seat has a spoken label ("Row 1 Seat 17, sold out") | Alamo | §5 (ours adds type and price) |

**Patterns added (changed the brief):** age-rating meaning written out;
format explanation; "Hôm nay" in the date strip; available seats most
visible; zoom control on small screens; "Đổi suất" link on the seat screen.

**Patterns rejected:**
- Promo carousels and pop-ups on Home (Galaxy, Cinestar, CGV, BHD): no
  promotions exist in our data and pop-ups block the main task.
- Cinema/location picker (Galaxy, BHD): MEDI-CINE is one venue (D23).
- Seat map on the same page as showtimes (Alamo): UCS keeps UC01 and UC02
  as separate steps.

**Not observed:** hold countdown and checkout screens (behind login or
"Next"); those follow UCS v1.1 only.
