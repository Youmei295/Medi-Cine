import { createBrowserRouter } from 'react-router'
import RootLayout from './RootLayout'
import HomePage from '../pages/HomePage'
import {
  BookingPendingPage,
  CheckoutPage,
  LoginPage,
  MovieDetailPage,
  MovieListPage,
  NotFoundPage,
  SeatSelectionPage,
} from './lazyPages'

// One URL per screen (CLAUDE.md "UI prototype scope"). Error/empty states are
// opened with mock switches on these URLs (src/frontend/README.md, "States").
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> }, // 0 Home (UC01)
      { path: 'movies', element: <MovieListPage /> }, // 1 Catalogue (UC01)
      { path: 'movies/:movieId', element: <MovieDetailPage /> }, // 2 Details + showtimes (UC01)
      { path: 'login', element: <LoginPage /> }, // 3 Login (UC06, UC02 alt 2.2.2.1)
      { path: 'showtimes/:showtimeId/seats', element: <SeatSelectionPage /> }, // 4 Seats (UC02)
      { path: 'checkout', element: <CheckoutPage /> }, // 5 Booking review (UC03)
      { path: 'bookings/:bookingId', element: <BookingPendingPage /> }, // 5b PENDING booking (UC03)
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
