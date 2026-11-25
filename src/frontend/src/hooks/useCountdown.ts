import { useEffect, useRef, useState } from 'react'

/**
 * Seconds left until `expiresAt`, ticking once per second; `onExpire` is
 * called once when it reaches 0. `serverTime` is the server's clock when the
 * deadline was issued (Hold.serverTime), so the very first render is already
 * correct. The clock is read only inside the timer, never during render.
 * The server's expiresAt is the source of truth (D4); the browser only displays it.
 */
export function useCountdown(expiresAt: string | null, serverTime: string | null, onExpire?: () => void): number {
  const [now, setNow] = useState(0)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    if (!expiresAt) return
    const deadline = Date.parse(expiresAt)
    const timer = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= deadline) {
        window.clearInterval(timer)
        onExpireRef.current?.()
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt])

  if (!expiresAt) return 0
  const reference = Math.max(now, serverTime ? Date.parse(serverTime) : 0)
  return Math.max(0, Math.round((Date.parse(expiresAt) - reference) / 1000))
}
