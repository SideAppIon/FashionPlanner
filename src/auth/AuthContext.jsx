import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'

const AuthCtx = createContext({ user: undefined })

export function AuthProvider({ children }) {
  // undefined = ещё грузится, null = не авторизован, object = специалист
  const [user, setUser] = useState(undefined)

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  return <AuthCtx.Provider value={{ user }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
