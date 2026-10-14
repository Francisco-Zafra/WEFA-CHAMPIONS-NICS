import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ADMIN_EMAIL, auth, usernameToEmail } from './firebase'

interface AuthState {
  user: User | null
  /** Solo el admin puede editar; el resto ve la app en modo lectura */
  isAdmin: boolean
  ready: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u)
        setReady(true)
      }),
    [],
  )

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAdmin: user?.email === ADMIN_EMAIL,
      ready,
      login: async (username, password) => {
        await signInWithEmailAndPassword(auth, usernameToEmail(username), password)
      },
      logout: () => signOut(auth),
    }),
    [user, ready],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fuera de AuthProvider')
  return ctx
}
