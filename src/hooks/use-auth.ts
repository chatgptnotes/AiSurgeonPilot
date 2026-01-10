'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'

export function useAuth() {
  const router = useRouter()
  const { user, doctor, isLoading, setUser, setDoctor, setLoading, reset } = useAuthStore()

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true

    // Helper to fetch doctor data
    const fetchDoctor = async (userId: string) => {
      try {
        const { data: doctor, error } = await supabase
          .from('doc_doctors')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()

        if (error) {
          console.error('Doctor fetch error:', error)
        }

        if (isMounted) {
          setDoctor(doctor)
        }
      } catch (error) {
        console.error('Doctor fetch exception:', error)
        if (isMounted) {
          setDoctor(null)
        }
      }
    }

    // Use onAuthStateChange as the SINGLE source of truth
    // It fires immediately with INITIAL_SESSION event on mount
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        console.log('Auth state changed:', event, session?.user?.email)

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          await fetchDoctor(currentUser.id)
        } else {
          setDoctor(null)
        }

        // Always set loading to false after processing auth state
        setLoading(false)

        if (event === 'SIGNED_OUT') {
          router.push('/login')
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router, setUser, setDoctor, setLoading])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    reset()
    router.push('/login')
  }

  return {
    user,
    doctor,
    isLoading,
    signOut,
  }
}
