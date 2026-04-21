'use client'

import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'

export interface UserProfile {
  prenom:                string | null
  nom:                   string | null
  statut_professionnel:  string | null
  avatar_url:            string | null
}

interface UserContextValue {
  user:    User
  profile: UserProfile | null
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({
  children,
  user,
  profile,
}: {
  children: React.ReactNode
  user:     User
  profile:  UserProfile | null
}) {
  return (
    <UserContext.Provider value={{ user, profile }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside UserProvider')
  return ctx
}
