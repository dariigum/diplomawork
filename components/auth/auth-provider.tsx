"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { getAuthSession } from "@/app/actions/auth"
import type { SessionUser } from "@/lib/session-jwt"

type AuthContextValue = {
  user: SessionUser | null
  authReady: boolean
  refreshSession: () => Promise<void>
  clearUser: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode
  initialUser: SessionUser | null
}) {
  const [user, setUser] = useState<SessionUser | null>(initialUser)
  const [authReady, setAuthReady] = useState(true)

  useEffect(() => {
    setUser(initialUser)
    setAuthReady(true)
  }, [initialUser])

  const refreshSession = useCallback(async () => {
    const session = await getAuthSession()
    setUser(session?.user ?? null)
    setAuthReady(true)
  }, [])

  const clearUser = useCallback(() => {
    setUser(null)
    setAuthReady(true)
  }, [])

  const value = useMemo(
    () => ({ user, authReady, refreshSession, clearUser }),
    [user, authReady, refreshSession, clearUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
