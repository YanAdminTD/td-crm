'use client'

import {
  createContext, useContext, useEffect,
  useState, useCallback, useRef
} from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, UserRole } from '@/types'

interface AuthContextType {
  profile:  Profile | null
  role:     UserRole | null
  loading:  boolean
  signIn:   (email: string, password: string) => Promise<{ error: string | null }>
  signOut:  () => Promise<void>
  can:      (roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType>({
  profile: null, role: null, loading: true,
  signIn:  async () => ({ error: null }),
  signOut: async () => {},
  can:     () => false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading]  = useState(true)
  const router  = useRouter()
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    const supabase = createClient()

    // Load profile for a given user id
    const loadProfile = async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (mounted.current) {
        setProfile(data ?? null)
        setLoading(false)
      }
    }

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        if (mounted.current) {
          setProfile(null)
          setLoading(false)
        }
      }
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          loadProfile(session.user.id)
        } else {
          if (mounted.current) {
            setProfile(null)
            setLoading(false)
          }
        }
      }
    )

    return () => {
      mounted.current = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: string | null }> => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setProfile(null)
    router.replace('/login')
  }

  const can = useCallback(
    (roles: UserRole[]) => !!profile && roles.includes(profile.role),
    [profile]
  )

  return (
    <AuthContext.Provider
      value={{ profile, role: profile?.role ?? null, loading, signIn, signOut, can }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
