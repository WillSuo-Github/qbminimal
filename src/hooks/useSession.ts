import { createContext, useContext } from 'react'

// 'checking' while the app asks qBittorrent whether the browser already has a session.
export type SessionStatus = 'checking' | 'signedOut' | 'signedIn'

export interface Session {
  status: SessionStatus
  // Rejects with a readable message when qBittorrent turns the login down.
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const SessionContext = createContext<Session | null>(null)

export function useSession(): Session {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession needs a SessionProvider above it')
  return session
}
