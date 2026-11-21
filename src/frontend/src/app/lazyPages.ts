import { lazy } from 'react'

// Home is the landing page and ships in the main bundle; every other screen
// loads its own chunk on first visit (Phase 5). RootLayout wraps the outlet in
// <Suspense> for that short wait. Kept apart from router.tsx so that file
// exports no components (Fast Refresh).
export const MovieListPage = lazy(() => import('../pages/MovieListPage'))
export const MovieDetailPage = lazy(() => import('../pages/MovieDetailPage'))
export const LoginPage = lazy(() => import('../pages/LoginPage'))
export const SeatSelectionPage = lazy(() => import('../pages/SeatSelectionPage'))
export const CheckoutPage = lazy(() => import('../pages/CheckoutPage'))
export const BookingPendingPage = lazy(() => import('../pages/BookingPendingPage'))
export const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))
