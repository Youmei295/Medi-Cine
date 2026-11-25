// Customer session (SAD §4.1 SessionStore). Mock: kept in sessionStorage so a
// page reload keeps the user logged in during a demo.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '../types/api'

const STORAGE_KEY = 'medicine.session'

interface SessionValue {
  session: Session | null
  signIn: (session: Session) => void
  signOut: () => void
}

const SessionContext = createContext<SessionValue | null>(null)

function readStored(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readStored)

  const signIn = useCallback((next: Session) => {
    setSession(next)
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* storage blocked: session lives in memory only */
    }
  }, [])

  const signOut = useCallback(() => {
    setSession(null)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

// oxlint-disable-next-line react/only-export-components -- hook lives next to its provider
export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside <SessionProvider>')
  return value
}
