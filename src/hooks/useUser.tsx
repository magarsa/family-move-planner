import { useState, useCallback, useContext, createContext, type ReactNode } from 'react'

const STORAGE_KEY = 'fmp_user_name'

export type UserName = 'Safal' | 'Prativa'

interface UserContextValue {
  userName: UserName | null
  setUserName: (name: UserName) => void
  clearUser: () => void
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [userName, setUserNameState] = useState<UserName | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'Safal' || stored === 'Prativa') return stored
    return null
  })

  const setUserName = useCallback((name: UserName) => {
    localStorage.setItem(STORAGE_KEY, name)
    setUserNameState(name)
  }, [])

  const clearUser = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUserNameState(null)
  }, [])

  return (
    <UserContext.Provider value={{ userName, setUserName, clearUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}
