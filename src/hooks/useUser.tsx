import { useState, useEffect, useCallback, useContext, createContext, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type UserName = 'Safal' | 'Prativa'

const ALLOWED_EMAILS: Record<string, UserName> = {
  'ranamagar.safal@gmail.com': 'Safal',
  'prati.ranamagar@gmail.com': 'Prativa',
}

interface UserContextValue {
  user: User | null
  userName: UserName | null
  authError: string | null
  signOut: () => Promise<void>
  loading: boolean
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setAuthError(null)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      if (u && !ALLOWED_EMAILS[u.email ?? '']) {
        supabase.auth.signOut()
        setAuthError('Access restricted to family members.')
        setUser(null)
      } else {
        setUser(u)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      if (u && !ALLOWED_EMAILS[u.email ?? '']) {
        supabase.auth.signOut()
        setAuthError('Access restricted to family members.')
        setUser(null)
      } else {
        setUser(u)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const userName: UserName | null = user?.email ? (ALLOWED_EMAILS[user.email] ?? null) : null

  return (
    <UserContext.Provider value={{ user, userName, authError, signOut, loading }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}
