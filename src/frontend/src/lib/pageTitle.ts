import { useEffect } from 'react'
import { useLocation } from 'react-router'

const SITE = 'MEDI-CINE'

/** Path of the page that last set the tab title (read by RootLayout's announcer). */
let titledPath = ''
export const lastTitledPath = () => titledPath

/**
 * Sets the browser tab title for the current page: "<page> | MEDI-CINE".
 * Every page names itself (WCAG 2.4.2 Page Titled); RootLayout announces this
 * title to screen readers once the new page has set it. Pass null while the
 * page's own data is loading, so the announcement waits for the real title
 * ("Bò Sữa Bay", not "Chi tiết phim").
 */
export function usePageTitle(page: string | null) {
  // The page's own path, not window.location: while the next page's code loads,
  // the previous page stays on screen and may still set its title.
  const { pathname } = useLocation()
  useEffect(() => {
    if (page === null) return
    document.title = `${page} | ${SITE}`
    titledPath = pathname
  }, [page, pathname])
}
