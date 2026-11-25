---
name: MEDI-CINE Customer Web App
description: Online booking for one mid-size cinema — direction A "Phòng chiếu" (the screening room)
colors:
  house: "#0b1a1c"
  wall: "#13282b"
  aisle: "#24403f"
  seat-line: "#5e807f"
  screen: "#e4eeec"
  dust: "#9db5b2"
  lamp: "#f4b23e"
  velvet: "#e07280"
typography:
  display:
    fontFamily: "Anybody, Commissioner, system-ui, sans-serif"
    fontSize: "3.8125rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0em"
  heading:
    fontFamily: "Anybody, Commissioner, system-ui, sans-serif"
    fontSize: "1.9375rem"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "Commissioner, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Commissioner, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  poster: "4px"
  seat: "6px"
  control: "8px"
  panel: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "48px"
  2xl: "96px"
components:
  button-primary:
    backgroundColor: "{colors.lamp}"
    textColor: "{colors.house}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.screen}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  button-disabled:
    backgroundColor: "{colors.aisle}"
    textColor: "{colors.dust}"
    rounded: "{rounded.control}"
  showtime-chip:
    backgroundColor: "{colors.house}"
    textColor: "{colors.screen}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  panel:
    backgroundColor: "{colors.wall}"
    textColor: "{colors.screen}"
    rounded: "{rounded.panel}"
    padding: "24px"
  age-badge:
    textColor: "{colors.screen}"
    typography: "{typography.label}"
    rounded: "4px"
    padding: "0 6px"
---

# Design System: MEDI-CINE Customer Web App

> Status: v0.1, 20/11/2026, end of Phase 2. Written from the shipped code in
> `src/frontend/` (tokens: `src/index.css` `@theme`), not from intentions.
> Rules and their sources: `docs/analysis and design/UI_Design_Brief.md` v0.2.
> Product context: `PRODUCT.md`. Home = the Taste Skill variant with the
> user's changes (D25).

## Overview

**North star: "Phòng chiếu" — the auditorium a moment before the film
starts.** House lights are down, the screen glows silver, and the only warm
light is the projector beam. Posters and stills bring the colour; the
interface stays in the dark around them.

The dark is teal, from the teal-and-orange grade of modern film. It was
chosen after comparing five real cinema sites: the first ink-blue palette was
almost Cinestar's (brief §13). Boldness lives in one place, the seat map.
Every other screen is quiet and practical: the customer is there to pick a
showtime and seats in under five minutes (Vision §6).

Anti-references: CGV, Lotte, Galaxy, BHD, Moveek, Cinestar looks (brief §9,
§13); promo carousels and pop-ups; any "AI-made" default (cream + terracotta,
near-black + one neon accent, card kits with grey shadows, ALL-CAPS eyebrows,
middle-dot meta strings, "→" in buttons).

## Colors

All pairs below were computed with the WCAG 2.1 formula (brief §3.1).

### Primary

- **Đèn chiếu / projector lamp `#f4b23e` (`lamp`)** — the only warm colour.
  Used for exactly four things: the main action, a selected seat, the focus
  ring, and time (countdown, showtimes). 9.57:1 on `house`; text on it is
  `house` (9.57:1).

### Tertiary

- **Ghế nhung / velvet `#e07280` (`velvet`)** — errors, seat conflicts, a hold
  with less than 60 s left. 5.84:1 on `house`, 5.04:1 on `wall`.

### Neutral

- **Khán phòng / auditorium `#0b1a1c` (`house`)** — page background.
- **Tường / wall `#13282b` (`wall`)** — raised surfaces: panels, inputs,
  skeletons, the sticky bottom bar.
- **Lối đi / aisle `#24403f` (`aisle`)** — decorative dividers, SOLD seat fill,
  disabled button fill. 1.60:1, so **never** the only edge of a control.
- **Tay vịn / armrest `#5e807f` (`seat-line`)** — every UI boundary: AVAILABLE
  seat outline, input and secondary-button borders, age badge box (4.13:1 on
  `house`, 3.56:1 on `wall`, WCAG 1.4.11).
- **Màn bạc / silver screen `#e4eeec` (`screen`)** — primary text, the screen
  arc (15.05:1).
- **Bụi sáng / dust in the beam `#9db5b2` (`dust`)** — secondary text,
  captions (8.22:1 on `house`).

### Named Rules

- **The Lamp Rule.** If something is amber it is an action, a selection,
  focus or time. Never decoration, never a heading colour.
- **The Scrim Rule.** Text over a poster or still sits on a `house` scrim. With
  a worst-case white image, `dust` needs ≥ 85 % `house` behind it and `screen`
  ≥ 75 % (computed 20/11/2026). Re-check on real screenshots in Phase 5.
- **One gradient family.** The amber projector beam on the seat map and the
  dark fade over stills. No other gradients.

## Typography

- **Display: Anybody** (variable width + weight), always set **wide**:
  `font-stretch: 125%` / `'wdth' 125`, line-height 1.1, `text-wrap: balance`
  (utility `.display-wide`). Echoes a widescreen frame; sentence case, which
  separates MEDI-CINE from the uppercase condensed titles of Cinestar and
  Alamo.
- **Text and UI: Commissioner** (variable). Body 16/1.55, lines ≤ 72
  characters. Prices, times, countdown and seat labels use tabular numerals
  (`.tabular`).
- Both fonts load the Vietnamese subset from Google Fonts. Test string:
  "Đặt vé · Ghế đôi · Suất 19:30 · Thứ Bảy 21/11".

### Hierarchy

Scale 1.25 from 16 px: `text-caption` 13 · `step-0` 16 · `step-1` 20 ·
`step-2` 25 · `step-3` 31 · `step-4` 39 · `step-5` 49 · `step-6` 61. Phones
drop the top two steps.

| Role | Token | Where |
|---|---|---|
| Hero movie title | display, `step-6` (`step-4` on phones) | Home hero |
| Page / movie title | display, `step-4`–`step-5` | Details, seat page header |
| Section heading | display, `step-2`–`step-4` | Home rows, panels |
| Item title | Commissioner 600, `step-0`–`step-1` | Poster tiles, summary lines |
| Meta, captions | Commissioner 400, `caption`, `dust` | Duration, genres, legend |

### Named Rules

- **Sentence case everywhere.** No all-caps labels, no tracked-out eyebrows,
  no one-word colour accent in a headline.
- **Titles are never cut on the details page;** in grids they wrap to 2
  lines then ellipsis, full title in `title`.

## Layout

- Content width 1200 px (`max-w-content`), 12-column grid, 24 px gutters;
  16 px side padding on phones. Spacing on a 4 px base:
  4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96.
- **Desktop first** (1440 → 768 → 375).
- Seat page: map ≈ 8 columns, summary panel ≈ 4 columns, sticky. Below
  1024 px the panel becomes a fixed bottom bar (count, total, countdown,
  main button) and the page gets bottom padding so nothing hides under it.
- Seat map below 768 px: scrolls sideways inside its frame, row letters
  pinned left and right on an opaque `house` ground, zoom − / + (28 / 36 /
  44 px seats; 32 px on desktop).
- Poster grids: 6 columns at 1440, 4 at 1024, 3 at 768, 2 at 375 (catalogue,
  brief §4 screen 1).

## Elevation & Depth

Flat, lit by colour, not by shadow. A raised surface is `wall` plus a 1 px
`aisle` border. The only glow is amber, around focused or selected items. No
grey drop shadows anywhere.

## Shapes

Radius by role, not one value everywhere: posters 4 px, seats 6 px (drawn
with a taller backrest), buttons / inputs / chips 8 px, panels 12 px. Focus
ring: 2 px `lamp`, 2 px offset, on every focusable element.

## Components

### Buttons

- **Primary:** `lamp` fill, `house` text, weight 600, 8 px radius, 12 × 16 px
  padding. One per view ("Giữ ghế", "Tiếp tục", "Xem chi tiết phim").
- **Secondary:** transparent, 1 px `seat-line` border, `screen` text ("Huỷ
  giữ ghế", "Chọn lại ghế").
- **Disabled:** `aisle` fill, `dust` text, `not-allowed` cursor; the reason is
  written next to it, not only implied.
- Labels are a verb + object, and an action keeps its name through the flow.
  No "→" in labels.

### Chips

- **Showtime chip:** start time (tabular, bold) + format (Home) or room
  (details page), 8 px radius, `seat-line` border, `lamp` border on hover.
  Goes straight to the seat map. A sold-out showtime is not a link: dashed
  border, time struck through, and the words "Hết vé" (not colour only).
- **Date strip (details page):** one button per day with showtimes
  (`aria-pressed`); first line "Hôm nay" or the weekday, second line
  "dd/mm, n suất"; the pressed day is `lamp` filled with `house` text. The
  day lives in the URL (`?date=`). Swipes sideways on phones.
- **Age badge:** rating text in a 1 px `seat-line` box; screen-reader text
  spells out the meaning ("Phân loại T16. Phim dành cho khán giả từ đủ 16 tuổi
  trở lên"). The details page writes the meaning out on screen.

### Cards / Containers

No card chrome on posters: **the poster is the tile** (2:3, 4 px radius). On
hover the image zooms to 1.03 inside its frame and a 2 px `lamp` ring
appears; focus shows the standard ring. A failed image becomes a dark tile
with the title (brief §11.2). Panels (`wall`, 12 px, `aisle` border) hold
summaries, never other panels.

### Inputs / Fields

`wall` fill, 1 px `seat-line` border, 8 px radius, visible label above;
errors in `velvet` under the field (`aria-invalid` + `aria-describedby`)
plus a summary at the top of the form that takes focus and links to each
field. Built on the login / register screen (`pages/LoginPage.tsx`).

### Tabs and switches

- **Segmented tabs** (catalogue Đang chiếu | Sắp chiếu): links in a 1 px
  `seat-line` box, current one `lamp` filled, `aria-current="page"`; each tab
  has its own URL.
- **Underline tabs** (login Đăng nhập | Đăng ký): used **inside a panel**,
  where a boxed control would be a card in a card (Impeccable flagged it).
  `aisle` baseline, current tab 2 px `lamp` underline + `screen` text,
  `aria-pressed`.

### Dialog

Native `<dialog>` opened with `showModal()` (focus trap and Esc for free):
`wall` panel, 12 px radius, `aisle` border, `house/80` backdrop. The safe
choice ("Ở lại trang này") is secondary and gets focus first; the
destructive one ("Bỏ giữ ghế") is primary. Used before releasing a hold.

### Price summary and status (screens 4–5b)

- **Summary panel:** `wall` panel, sticky on desktop. Hold countdown on top
  (`lamp/10` box, `lamp` text; under 60 s `velvet/15` + `velvet`,
  `aria-live` polite); then Tạm tính, Giảm giá (with the code), a
  `seat-line` rule, Phải trả in `step-2` (label and amount on one baseline);
  primary + secondary buttons. The booking page's details end the same way:
  a rule, then Phải trả one step larger. The
  countdown shows in the panel at every width (on phones the panel is where
  the customer decides) and also under the title on phones. The seat table
  is headed "Ghế đã giữ", never "vé": no ticket exists before payment.
- **Itemized lines:** a table from 640 px (Ghế, Loại, Đơn giá, Giảm, Thành
  tiền; numbers right-aligned, tabular), a list on phones. All amounts come
  from the server quote; the page never computes a price.
- **Notices in the panel:** a `velvet`-bordered box with a bold title and
  one sentence saying what happened and what to do ("Giá vé vừa thay đổi",
  "Chưa tạo được đơn đặt vé"); the main button label changes to the needed
  action ("Đồng ý giá mới và tiếp tục", "Thử lại").
- **No labels over headings:** the step bar names the step, so the review page
  title is the movie; on the booking page "Đơn đặt vé đã được tạo." sits under
  the code, not over it. Home keeps "Chiếu hôm nay tại MEDI-CINE" because it
  carries information (it changes when today has no shows left).
- **Booking status:** words plus an icon ("Chờ thanh toán" with a clock),
  never colour alone; the reference set large in the text face
  (Commissioner, semibold, tracked): in the wide display face O and 0 look
  alike, and people read this code out at the counter. Never
  "Đã thanh toán", a QR ticket or SOLD seats before UC04.
- **Inactive future action:** the VNPAY button is shown disabled (`aisle`
  fill, `dust` text) with a note saying why (payment is not open in this
  build), in customer words, never a use-case number.

### Navigation

Header: logo "MEDI-CINE" (Anybody wide, 800), main links, login / account on
the right; the current page is underlined in `lamp`. Skip link first in the
tab order. "Đang chiếu" and "Sắp chiếu" open the two catalogue tabs (one
"Phim" link below 640 px); a search field (≥ 1024 px, hidden on the catalogue,
which has its own) sends the text to `/movies?q=…`; the account name also shows
from 1024 px so the bar never overflows at 768 px. Booking steps on screens 4–5: Chọn suất → Chọn ghế → Xác nhận →
Thanh toán. Done steps show a ✓ (plus "(đã xong)" for screen readers),
the current step is bold `screen` with `aria-current="step"`, steps to do show
their number. Below 640 px only the current step shows its name (others keep
it for screen readers), so the bar stays on one line. All steps stay full `dust` (no opacity): the bar sits over a
dimmed still on screen 4. The wordmark link has 12 px padding top and bottom
(42 px tap target).

Page titles: every page sets the tab title "<page> | MEDI-CINE"
(`usePageTitle`, e.g. "Chọn ghế: Bò Sữa Bay | MEDI-CINE"; error states name
the error). After a page change (path only), focus moves to `<main>` and a
polite live region reads the new title; focus never shows a ring on `<main>`.
Pages other than Home load their code on first visit (`React.lazy`); the
outlet holds 60 vh while that happens.

### Seat map (signature component)

`src/frontend/src/components/seat-map/`.

- **Screen arc:** silver SVG arc at the top, label "Màn hình"; row 1 is
  nearest the screen.
- **Projector beam:** one soft amber gradient, clipped to a trapezoid, falling
  from under the label across the rows (low opacity, decoration allowed only
  here).
- **Seats** are drawn front-on as armchairs in a 32 × 32 SVG (SWEETBOX
  70 × 32). **Type by shape:** REGULAR backrest + cushion; VIP taller
  backrest, outline only, with a small diamond mark in it (`dust`, or `house`
  on a selected seat); SWEETBOX one couple sofa (long backrest, long cushion,
  an armrest at each end) **two columns wide**: one seat, one price for two
  people (`seatSpan()`, UI convention until the API has a width, OQ-05).
  **State by fill + pattern +
  icon:** AVAILABLE `seat-line` outline + number; selected `lamp` fill + ✓;
  HELD hatch + clock; SOLD `aisle` fill + ✕; OUT_OF_SERVICE dashed outline,
  no number, skipped by the keyboard.
- Every seat has a spoken label: "Ghế D7, ghế VIP, 95.000 ₫, còn trống".
- Keyboard: one tab stop (roving tabindex), arrows move between seats and
  skip gaps (up / down picks the seat whose centre is nearest, so a couple
  seat lines up with the two seats above it), Space / Enter toggles.
- Legend: two h2 groups ("Trạng thái ghế", "Loại ghế và giá"); the couple seat
  is drawn wide there too and reads "Ghế đôi (2 người)".
- Phones: when seats are hidden past an edge of the scroll frame, that side
  gets a 40 px `house` fade (just inside the pinned row letters) and the zoom
  row reads "Vuốt ngang để xem thêm ghế". The fade is a scroll cue, not
  decoration, so it is the third allowed gradient (brief §3.1).
- The D24 weaknesses are fixed (Phase 3): the VIP headrest is no longer
  filled, so only SOLD seats are solid; SWEETBOX is double width.

### Poster rail

`src/frontend/src/components/movie/MovieRail.tsx` + `PosterTile.tsx`. One
row of posters under a wide display heading: 5 per view at ≥ 1024 px, 4 at
768, 3 at 640, a swipe row with a peek on phones. Two square 44 px buttons
(< / >, `seat-line` border, `lamp` border on hover) page one view and are
disabled at either end (`aisle` border); invisible (space kept) when the whole
row fits; hidden on phones, where the row is swiped. No auto-scroll, no visible scrollbar; touch, trackpad and keyboard
scrolling still work. Used for now showing and coming soon (release date in
place of duration).

### Home hero (screen 0)

Fills the first screen alone. The selected movie's still (1600 px) sits
behind a `house` scrim (left-to-right and bottom-up); the text column holds:
a context line, the title (display, `step-6`), age badge + duration +
genres + release date, a 2-line synopsis, the showtime chips of that day and
a link to the details page. On desktop a column at the right lists **every
movie showing today** (poster thumb, title, number of showtimes, earliest
time); a pressed button (`aria-pressed`, `wall` box, round `lamp` tick badge on the poster corner, `house` tick, `wall` ring; no side bar, no extra row width) marks the
one shown. Phones get the list as a swipe row under the chips. When nothing
is left today, the nearest day is named instead. The hero enters once per
page load (title rises from a mask 700 ms, the rest fades up 12 px, the still
settles from 1.05). Switching movies plays a short version instead (brief §8
v0.9): the new still is decoded first, then crossfades over the old one from
`scale(1.02)` in 250 ms; the movie's text fades up 6 px in 200 ms; no title
rise. A newer pick made while waiting wins.

### Motion (Phase 6)

Only the moments brief §8 allows, all `transform` / `opacity`, each plays once
(tokens `--animate-*` in `index.css`). Curve `--ease-enter` (strong ease-out)
for everything that enters or is pressed; `--ease-in-out` only for the 60 s beat,
which goes out and back:

| Moment | Where | Motion |
|---|---|---|
| Seat press | `SeatMap` (drawing only, focus ring keeps its size) | `scale(.95)` while pressed, 150 ms transition |
| Seat chosen | `SeatGlyph` tick | from `opacity 0` + `scale(.9)`, 150 ms |
| Seat taken by someone else (2.2.2.2) | `SeatMap` `taken` prop | from `opacity .5` + `scale(1.12)`, 240 ms; the notice follows 60 ms later (`translateY(-4px)`, 200 ms) |
| Total changed | seat page "Tạm tính", checkout "Phải trả" | inner amount keyed on its value: from `opacity .4` + `translateY(3px)`, 160 ms; the `aria-live` element stays mounted |
| Hold starts | seat page panel | timer + actions from `opacity 0` + `scale(.98)`, 200 ms |
| 60 s left | timer boxes (seat page panel, checkout panel) | one beat `scale(1.03)`, 240 ms `--ease-in-out`; text-only timers change colour only (200 ms), a 1.03 beat on small text is invisible |
| Movie switched | Home hero (picker) | still: from `opacity 0` + `scale(1.02)`, 250 ms, over the previous still; text: from `opacity 0` + `translateY(6px)`, 200 ms |
| Day switched | movie details showtime list | whole list from `opacity 0` + `translateY(4px)`, 200 ms, no per-chip stagger |
| Button press | every pressable button, link-button and time chip | `scale(.985)`, 150 ms `--ease-enter` |

Not animated on purpose: countdown digits, arrow-key moves on the seat map,
catalogue grid on filter, the PENDING page (no success
moment before payment), page changes. Reduced motion: the same timings as an
opacity fade, no movement; the 60 s beat is dropped.

## Do's and Don'ts

### Do:

- **Do** compute contrast for every new colour pair and write the ratio down.
- **Do** show seat state by shape, pattern and icon as well as colour.
- **Do** keep amber for action, selection, focus and time only.
- **Do** use real UC01–UC03 data only; a missing image becomes a titled dark
  tile.
- **Do** give every loading view a skeleton in the real layout's shape.
- **Do** keep motion to 150–250 ms on `transform` / `opacity`, and respect
  `prefers-reduced-motion`: entrances become a 200 ms fade with no movement,
  transform transitions snap, colour fades stay (`index.css`).
- **Do** theme the browser's own surfaces: text selection `lamp` on `house`,
  caret and native controls `lamp`, scrollbars `seat-line` on `house`.

### Don't:

- **Don't** copy the look of CGV, Lotte, Galaxy, BHD, Moveek or Cinestar.
- **Don't** invent ratings, reviews, promotions or audience numbers.
- **Don't** use cream backgrounds, terracotta, neon green, grey card shadows,
  ALL-CAPS eyebrows, "→" in buttons, monospace data labels or middle-dot meta
  strings.
- **Don't** use `aisle` as the only edge of a control.
- **Don't** show payment success, a QR ticket or SOLD seats as a result of
  UC03; the booking stays PENDING.
- **Don't** fade sections in on scroll or auto-play carousels or trailers.

## Appendix: Phase 2 tool comparison (20/11/2026)

Seven criteria from the HANDOVER plan, measured after "test it" (20/11/2026):
`npm run build` + `npm run lint` clean; Playwright CLI at 1440 × 900,
768 × 1024, 375 × 812; `npx impeccable detect <URL>`; no console errors or
warnings on either Home variant.

| # | Criterion | Seat map "Phòng chiếu" (frontend-design) | Home "Taste" | Home "frontend-design" |
|---|---|---|---|---|
| 1 | UCS information present | All UC02 items (room, map, types, prices, 4 states, summary, total, hold button, countdown); seat states are mock, not live WSS | Featured movie + showtimes; all 8 now-showing movies with title, poster, genres, duration, age rating; coming soon with release date; link to catalogue. No search field yet (header, Phase 3) | Same data; shows the 6 newest now-showing movies + "Xem tất cả 8 phim". No search field yet |
| 2 | Not colour alone + AA contrast | Shape + pattern + icon. Weakness: VIP vs SOLD (D24). Detect: booking steps over the backdrop at 3.9:1 ("Thanh toán") and 4.2:1 ("Xác nhận") | Worst case computed passes on the left half; chip ground raised to 90 % `house` (`dust` was 3.04:1 at 70 %). Detect: no contrast finding | No text over images. Detect: no contrast finding |
| 3 | Impeccable detect findings | **2** (low contrast on steps; h1 → h3 skipped heading in the legend) + 2 advisory | **0** + 2 advisory (unbalanced 2-line headings) | **0** + 1 advisory (unbalanced heading) |
| 4 | 3 widths (375 / 768 / 1440) | Pass (Phase 2a) | Pass. Hero fills the first screen at all three; 768 grid leaves 2 posters on the last row | Pass after 1 fix: at 375 the page was 823 px wide (sr-only text of the age badge escaped the swipe row; badge made `relative`) |
| 5 | Vietnamese diacritics render | Pass | Pass ("Vượt Kỷ Băng Hà", "Đ" at display size; no clipping under the title mask) | Pass |
| 6 | User's verdict | kept (D24) | **chosen** (prefers the hero), with changes (D25) | not chosen; its tighter rows were preferred → rails of 5 |
| 7 | Fix rounds / effort | 1 responsive round + small fixes; then a 2-variant `/prototype` comparison | 1 pre-test fix (chip contrast), 0 test rounds. Larger skill; its kit, gate and photo tools were not used (second CSS system, browser checks before "test it") | 1 pre-test fix (genres added to tiles), 1 test round (overflow at 375; the fix is in the shared badge) |

**Decision (D25, 20/11/2026):** Home = the Taste variant. Changes asked by the
user: sharper hero still (1600 px source, no blur), hero lists all movies
showing today, rows of 5 with < / > buttons for both rails. The two variant
files and the comparison switch were deleted.

**Re-test of the final Home (20/11/2026, after "test it"):** build + lint
clean; no console errors; Playwright at 1440 / 768 / 375 / 320 with no
horizontal overflow and no clipped hero text (one fix: the hero grid column
is `minmax(0, 1fr)` so the swipe row of today's movies cannot widen it);
rails show 5 / 4 / 2.6 posters per view; < / > page one view and disable at
the ends; picking a movie swaps the hero; Impeccable detect: 0 findings,
0 advisory.
