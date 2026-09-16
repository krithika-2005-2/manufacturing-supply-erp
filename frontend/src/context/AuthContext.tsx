import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '../types'
import { getCurrentUser, loginRequest } from '../services/authService'
import { tokenStorage } from '../utils/storage'

type AuthContextValue = {
  user: User | null
  token: string | null
  initializing: boolean
  login: (identifier: string, password: string) => Promise<void>
  logout: () => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

type AuthProviderProps = {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(tokenStorage.get())
  const [initializing, setInitializing] = useState(true)

  const logout = useCallback(() => {
    tokenStorage.clear()
    setToken(null)
    setUser(null)
  }, [])

  const hydrate = useCallback(async () => {
    const stored = tokenStorage.get()
    if (!stored) {
      setInitializing(false)
      return
    }
    try {
      const current = await getCurrentUser()
      setUser(current)
      setToken(stored)
    } catch {
      logout()
    } finally {
      setInitializing(false)
    }
  }, [logout])

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    const onUnauthorized = () => {
      logout()
    }
    window.addEventListener('erp:unauthorized', onUnauthorized)
    return () => window.removeEventListener('erp:unauthorized', onUnauthorized)
  }, [logout])

  const login = useCallback(async (identifier: string, password: string) => {
    const result = await loginRequest(identifier, password)
    tokenStorage.set(result.token)
    setToken(result.token)
    setUser(result.user)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      initializing,
      login,
      logout,
      isAdmin: user?.role === 'ADMIN',
    }),
    [user, token, initializing, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
