import { useState } from 'react'

interface Props {
  title: string
  src: string | null | undefined
  className?: string
  /** Above-the-fold images load eagerly. */
  eager?: boolean
}

/**
 * 2:3 poster. Posters are hot-linked from Moveek's CDN (course use only); when
 * one fails, a dark tile with the title stands in (brief §11.2).
 * The image is decorative next to a visible title, so alt is empty.
 */
export default function MoviePoster({ title, src, className = '', eager = false }: Props) {
  const [failed, setFailed] = useState(false)

  return (
    <div className={`relative aspect-[2/3] overflow-hidden rounded-poster bg-wall ${className}`}>
      {src && !failed ? (
        <img
          src={src}
          alt=""
          width={352}
          height={528}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className="size-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex size-full items-end border border-aisle p-3">
          <span className="display-wide text-step-1 font-bold text-dust">{title}</span>
        </div>
      )}
    </div>
  )
}
