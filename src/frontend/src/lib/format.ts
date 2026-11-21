// Display formatters. All times are shown in Vietnam time (UTC+7).

const TIME_ZONE = 'Asia/Ho_Chi_Minh'

const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })

/** 75000 -> "75.000 ₫" */
export const formatVnd = (amount: number) => vnd.format(amount)

/** "2026-11-20T12:30:00Z" -> "19:30" */
export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE }).format(new Date(iso))

/** "2026-11-20T12:30:00Z" -> "Thứ Sáu, 20/11/2026" */
export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIME_ZONE,
  }).format(new Date(iso))

/** 118 -> "1 giờ 58 phút" */
export const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`
}

/** 600 -> "10:00" (hold countdown) */
export const formatCountdown = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const dayKey = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TIME_ZONE })

/** Vietnam calendar day of an instant: "2026-11-21T02:30:00Z" -> "2026-11-21" */
export const dateKey = (when: string | Date) => dayKey.format(typeof when === 'string' ? new Date(when) : when)

/** "2026-11-21T02:30:00Z" -> "Thứ Bảy, 21/11" (no year: showtimes are days away) */
export const formatWeekdayDay = (iso: string) =>
  new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: TIME_ZONE }).format(
    new Date(iso),
  )

/** Local release date "2026-11-27" -> "27/11/2026"; with `short` -> "27/11" */
export const formatReleaseDate = (ymd: string, short = false) => {
  const [y, m, d] = ymd.split('-')
  return short ? `${d}/${m}` : `${d}/${m}/${y}`
}
