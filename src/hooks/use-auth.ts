'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export function useAuth() {
  const router = useRouter()
  const { user, doctor, isLoading, setUser, setDoctor, setLoading, reset } = useAuthStore()

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true

    // Helper to fetch doctor data with timeout safety
    const fetchDoctor = async (userId: string) => {
      try {
        // Add timeout to prevent hanging forever (10 second timeout)
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Doctor fetch timeout after 10s')), 10000)
        )

        const fetchPromise = supabase
          .from('doc_doctors')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()

        const { data: doctor, error } = await Promise.race([fetchPromise, timeoutPromise])

        if (error) {
          console.error('Doctor fetch error:', error)
        }

        if (isMounted) {
          setDoctor(doctor || null)
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
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return

        console.log('Auth state changed:', event, session?.user?.email)

        const currentUser = session?.user ?? null
        setUser(currentUser)

        // Set loading to false immediately - we now know the auth state
        // Don't wait for doctor profile fetch to complete
        setLoading(false)

        if (currentUser) {
          // Fetch doctor profile in background (don't await/block on this)
          fetchDoctor(currentUser.id)
        } else {
          setDoctor(null)
        }

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
