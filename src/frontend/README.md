# MEDI-CINE — Customer Web App (frontend)

React + TypeScript + Vite + Tailwind CSS v4 + React Router.
SAD component 1 (Customer Web App). The Admin & Staff Dashboard will live in
the same app later.

## Run

Requires Node.js 22+ (team machine: Node 26 LTS).

```bash
cd src/frontend
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check (tsc -b) + production build to dist/
npm run lint      # oxlint
```

## Folders

| Path | Content |
|---|---|
| `src/index.css` | Design tokens (`@theme`) from `docs/analysis and design/UI_Design_Brief.md` §3 |
| `src/app/` | Router and root layout |
| `src/pages/` | One file per screen (Home, catalogue, details, login, seats, checkout, PENDING booking); `pages/home/` and `pages/movie-detail/` hold their data hooks |
| `src/components/` | `BookingSteps`, `seat-map/` (seat map, seat drawing, legend, labels), `movie/` (poster with fallback tile, poster tile, poster rail with < > buttons, age badge) |
| `src/hooks/` | `useCountdown` (hold timer) |
| `src/types/api.ts` | Types copied from `docs/api/openapi.yaml` (PROPOSED contract) |
| `src/mocks/` | Mock API + sample data (`data/*.json`), used until the backend is ready |
| `src/lib/` | Formatters (VND, Vietnam time, countdown), age rating meanings, movie ordering, page titles, mock session (login) |

Screens: Home (`/`: movies showing today, now showing and coming soon
rails), catalogue (`/movies`: tabs, search, genre filter, all kept in the URL:
`?status=coming-soon&q=…&genre=…`), movie details + showtimes
(`/movies/:movieId`, `?date=YYYY-MM-DD` picks the day), seat selection
(`/showtimes/:showtimeId/seats`) and login / register (`/login`, `?mode=register`;
from a seat page it shows the movie, showtime and picked seats, then returns there). The header has
"Đang chiếu", "Sắp chiếu" and a search field that opens the catalogue.
Booking review (`/checkout?holdId=…&showtimeId=…`: server quote, discount code,
confirm dialog before releasing the hold) and the PENDING booking
(`/bookings/:bookingId`: reference, "Chờ thanh toán", time left to pay; payment
button shown but inactive, UC04 comes later) complete the UC01 → UC03 flow.

## Mock data

The backend does not exist yet, so pages call `src/mocks/mockApi.ts`, which
returns objects shaped like the OpenAPI schemas. To switch to the real API
later, replace the mock functions with `fetch` calls to `/api/v1` that keep
the same signatures.

Test scenarios in the data:

| Scenario | Where |
|---|---|
| Now showing / coming soon / inactive (hidden) movies | `movies.json`: 8 now showing (`mv-001`…`mv-008`), 3 coming soon (`mv-009`…`mv-011`), 1 inactive (`mv-012`) |
| Movie with no showtimes (UC01 alt 1.2.2.2) | `mv-008` |
| Sold-out showtime (UC02 alt 2.2.2.3) | `st-006` |
| Seat taken by another customer on hold (UC02 alt 2.2.2.2) | `st-001`, seat `G5` |
| Cancelled showtime (hidden) | `st-014` |
| Valid / ineligible / expired discount codes | `promotions.json` (`CHAOTHANG11`, `GIAM20K`, `VIPDEMNAY`, `HETHAN`) |
| Mock login account | `users.json` (mock only, not a real account; the login page shows it under "Tài khoản dùng thử") |
| Hold expiry (UC02 alt 2.2.2.5) | add `?mockHoldSeconds=20` to a seat URL |
| Dates follow today | the JSON holds one week (showtimes 20–23/11/2026). The mock moves every showtime, release date and promotion window by whole days so that 20/11/2026 is "today": the site always has showtimes today and the next three days. Times of day stay the same; showtimes that already started today are hidden and cannot be held (`SHOWTIME_CLOSED`) |
| Pin the clock (screenshots, repeatable demos) | add `?mockNow=2026-11-20T12:00:00%2B07:00` to any URL: the data is then exactly as in the JSON (shift 0); kept for the tab; `?mockNow=off` returns to the real clock |
| Register a new account (UC06) | `/login?mode=register`; the account lives in memory until reload. Registering an existing email shows "Email này đã có tài khoản" |
| Discount codes (UC18) | on the review page: `CHAOTHANG11` 10 % (max 30.000 ₫); `GIAM20K` needs 150.000 ₫; `VIPDEMNAY` needs a VIP seat; `HETHAN` expired; any other text = unknown code |
| Price changed while reviewing (UC03 alt 3.2.2.3) | open a seat page with `?mockPriceChange=1` (kept for the tab, `=0` turns it off), hold, continue, press "Tiếp tục thanh toán": the first try of each hold reports +10.000 ₫ per seat and asks to accept the new price |
| Booking failed (UC03 alt 3.2.2.5) | seat page with `?mockBookingFail=1` (kept for the tab, `=0` turns it off): the first try of each hold fails, "Thử lại" works |
| Hold expires on the review page (UC03 alt 3.2.2.1) | hold with `?mockHoldSeconds=30` on the seat page, then wait on the review page |
| Guest tries to hold (UC02 alt 2.2.2.1) | open a seat page in a new tab (session is per tab), pick seats, press the button |

Holds and "taken" seats live in memory: reloading the page resets them.

## States (Phase 4): how to open each one

Every alternative flow of UC01–UC03 in the UCS (brief §6) can be opened in a
browser for screenshots. Start each tab with
`/?mockNow=2026-11-20T12:00:00%2B07:00` so every showtime used below (st-001
at 14:30, st-002 at 19:30, …) is still on sale. Mock switches are kept for the tab; `?name=0` on any URL turns one off.

| Switch | Effect |
|---|---|
| `?mockFail=<operation>[,<operation>]` or `?mockFail=all` | those calls fail like an unreachable server (503). Operations: `listMovies`, `getMovie`, `listShowtimes`, `getShowtime`, `getSeatMap`, `createHold`, `createQuote`, `getBooking` |
| `?mockEmpty=1` | the cinema has no movies and no showtimes |
| `?mockLatency=8000` | every call takes 8 s (max 20 s), to capture loading skeletons |
| `?mockHoldSeconds=N`, `?mockPriceChange=1`, `?mockBookingFail=1` | see "Test scenarios" above |

Switches that act after a hold (`createQuote`, `getBooking`, price change,
booking failure) are set on the **seat page before holding**: adding them to
`/checkout` or `/bookings/…` reloads the page and loses the in-memory hold.
While `mockFail` names an operation, "Thử lại" keeps failing; turn it off with
`?mockFail=0` on a page that holds nothing (for example Home).

| UC / flow | State | How to open |
|---|---|---|
| UC01 1.2.2.1 | No search result | `/movies?q=zzz` (add `&genre=Hài` for both filters) |
| UC01 1.2.2.1 | Cinema has no movies | `/?mockEmpty=1` (Home), then `/movies` and `/movies?status=coming-soon` |
| UC01 1.2.2.2 | Movie has no showtimes | `/movies/mv-008`; coming soon: `/movies/mv-009` |
| UC01 1.2.2.3 | Details cannot be loaded | `/movies/mv-001?mockFail=getMovie`; unknown movie: `/movies/mv-999` |
| UC01 | Home / catalogue cannot be loaded | `/?mockFail=listMovies`, `/movies?mockFail=listMovies` |
| — | Loading skeletons | add `?mockLatency=8000` to `/`, `/movies`, `/movies/mv-001`, `/showtimes/st-001/seats` |
| UC02 2.2.2.1 | Guest tries to hold | new tab, `/showtimes/st-001/seats`, pick seats, "Đăng nhập để giữ ghế" |
| UC02 2.2.2.2 | Seat taken by another customer | `/showtimes/st-001/seats`, pick `G5` (+ others), "Giữ ghế" |
| UC02 2.2.2.3 | Showtime sold out | `/showtimes/st-006/seats`; on details the time chip reads "Hết vé" (`/movies/mv-002`) |
| UC02 2.2.2.4 | Deselect a seat | pick two seats, click one again: total drops at once |
| UC02 2.2.2.5 | Hold expired | `/showtimes/st-003/seats?mockHoldSeconds=20`, hold, wait 20 s |
| UC02 | Seat map cannot be loaded / unknown showtime | `/showtimes/st-001/seats?mockFail=getSeatMap`; `/showtimes/st-999/seats` |
| UC02 | Hold request fails | `/showtimes/st-001/seats?mockFail=createHold`, pick, "Giữ ghế" |
| UC03 3.2.2.1 | Hold expired on the review page | hold with `?mockHoldSeconds=30`, "Tiếp tục", wait |
| UC03 3.2.2.2 | Back to seat selection | review page, "Quay lại chọn ghế": dialog, then "Bỏ giữ ghế" |
| UC03 3.2.2.3 | Price changed | seat page with `?mockPriceChange=1`, hold, "Tiếp tục", "Tiếp tục thanh toán" |
| UC03 3.2.2.4 | Double click on confirm | double-click "Tiếp tục thanh toán", or Back from the booking: same booking |
| UC03 3.2.2.5 | Booking failed | seat page with `?mockBookingFail=1`, hold, "Tiếp tục", "Tiếp tục thanh toán" |
| UC18 | Invalid / ineligible / expired code | review page: `abc`, `GIAM20K` with one regular seat, `VIPDEMNAY` without VIP, `HETHAN` |
| UC03 | Review cannot be priced | seat page with `?mockFail=createQuote`, hold, "Tiếp tục" |
| UC03 | Booking created (PENDING) / payment time over | normal flow; for expiry hold with `?mockHoldSeconds=30` and wait on the booking page |
| UC03 | Booking cannot be loaded / unknown booking | seat page with `?mockFail=getBooking`, then book; `/bookings/BK-NOPE` |
| — | Unknown address | `/khong-co-trang-nay` |

Showtime dates are written for 20–23/11/2026 in UTC, shown in Vietnam time,
and moved to the current week by the mock (see "Dates follow today" above).
Known limit: only four days of showtimes; more sample data is planned.

**Movies are real releases in Vietnam (Nov–Dec 2026)**; title, genres,
running time, age rating and release date come from moveek.com and
Vietnamese release news (checked
20/11/2026). Synopses are short paraphrases. Posters and backdrops are
hot-linked from Moveek's CDN, are copyrighted by their owners, and are used
only for this course project (not for public release). Backdrops use Moveek's 1600 px size (`large_2x`); `mv-005` has
none, so `public/backdrops/mv-005.jpg` is its 800 px still upscaled to
1600 × 840 with an AI tool by the user. Running time of
`mv-010` and `mv-011` is a placeholder (150 min) because it is not
announced yet.

## Design rules (read before changing the UI)

| Source | What it settles |
|---|---|
| `docs/analysis and design/UI_Design_Brief.md` (v0.9) | Direction "Phòng chiếu", colour and type tokens, screens, seat states, states to cover, responsive rules, motion limits (§8) |
| `DESIGN.md` (repo root) | The design system as built: components, named rules, motion table, do's and don'ts |
| `PRODUCT.md` (repo root) | Users, purpose and principles, read by the Impeccable tools |
| `src/index.css` | The tokens themselves (`@theme`): use `bg-wall`, `text-lamp`, `rounded-control`, `text-step-2`…, never raw hex or px |

Fixed conventions: UI text in Vietnamese, code comments in English. Amber
(`lamp`) only for actions, selection, focus and time. Seat states never by
colour alone. Money is integer VND from the server quote; the page never
computes a price. Motion 150–250 ms on `transform` / `opacity`, with a
reduced-motion branch in the unlayered block at the end of `index.css`.

## Add a screen

1. **Data.** Add the operation to `src/mocks/mockApi.ts` with the same name
   and shape as `docs/api/openapi.yaml` (types in `src/types/api.ts`). Start
   with the `failure('<operation>')` guard (add the name to
   `FailableOperation`) and return through `wait(...)`, so `?mockFail=` and
   `?mockLatency=` work for the new screen too. Sample data goes in
   `src/mocks/data/*.json`.
2. **Page.** `src/pages/<Name>Page.tsx`. Call `usePageTitle('<title>')`
   (`src/lib/pageTitle.ts`), passing `null` while the data loads. Cover the
   loading (skeleton in the real layout's shape), empty and error ("Thử lại")
   states from the start.
3. **Route.** Add a lazy import in `src/app/lazyPages.ts` and a route in
   `src/app/router.tsx` (English lowercase paths, e.g. `/bookings/:bookingId`).
4. **Document the states** in the table above and, for screenshots, in
   `docs/analysis and design/UI_Prototype_v1.0.md` (raise the version and add a
   Revision History row).

If new Tailwind classes have no effect in `npm run dev`, restart the dev
server (the build is not affected).

## Screenshots and the PA4-b document

- Screenshots live in `docs/analysis and design/ui-prototype-screenshots/`
  (47 PNG, 21/11/2026): main screens as `NN-<screen>-1440.png` (full page)
  and `-375.png` (phone, first screen); states as
  `uc01-*`, `uc02-*`, `uc03-*`, `uc18-*`, `loading-*`, `not-found-page`, all
  at 1440 px.
- They were taken with Playwright CLI and the mock clock
  `?mockNow=2026-11-20T12:00:00%2B07:00`. Open each state in a new tab and
  put only one value per switch on the URL (`?mockFail=0&mockFail=getMovie`
  keeps the first value, so the state does not show). `/bookings/…` needs a
  signed-in tab.
- `UI_Prototype_v1.0.md` is the source; `UI_Prototype_v1.0.pdf` (A4, images
  embedded) is the copy to submit. After editing the Markdown, rebuild the
  PDF (it was rendered with `markdown-it-py` and Playwright for Python) so the
  two stay the same.

## Before a commit

`npm run build` and `npm run lint` must pass, the browser console must stay
clean on the main flow (Home → details → seats → login → hold → review →
booking), and pages must not scroll sideways at 375 px. Phase-end UI checks
use `npx impeccable detect <url or file>` and Playwright CLI.
