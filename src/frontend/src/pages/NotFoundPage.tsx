import { Link, useLocation } from 'react-router'
import { usePageTitle } from '../lib/pageTitle'

/*
 * Unknown URL (inside the root layout, so the header still works).
 * Says which address was not found and offers the two ways back into UC01.
 */
export default function NotFoundPage() {
  const { pathname } = useLocation()
  usePageTitle('Không tìm thấy trang')
  return (
    <section aria-labelledby="nf-h" className="mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-24">
      <h1 id="nf-h" className="display-wide text-step-4 font-extrabold sm:text-step-5">
        Không tìm thấy trang
      </h1>
      <p className="mt-4 max-w-prose text-pretty text-dust">
        Địa chỉ <span className="break-all text-screen">{pathname}</span> không có trên trang của rạp. Có thể đường dẫn bị
        gõ sai hoặc đã cũ.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-5">
        <Link to="/movies" className="rounded-control bg-lamp px-5 py-3 font-semibold text-house">
          Xem phim đang chiếu
        </Link>
        <Link to="/" className="text-screen underline decoration-seat-line underline-offset-4 hover:decoration-lamp">
          Về trang chủ
        </Link>
      </div>
    </section>
  )
}
