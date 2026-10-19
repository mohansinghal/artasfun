import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react'

type User = { name: string; token: string } | null

interface AuthContextType {
  user: User
  login: (name: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>(null)

  useEffect(() => {
    const raw = localStorage.getItem('authUser')
    if (raw) setUser(JSON.parse(raw))
  }, [])

  const login = async (name: string, password: string) => {
    // Mock auth: accept any credentials after a short delay
    await new Promise((res) => setTimeout(res, 500))
    const token = btoa(`${name}:${Date.now()}`)
    const u = { name, token }
    setUser(u)
    localStorage.setItem('authUser', JSON.stringify(u))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('authUser')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
