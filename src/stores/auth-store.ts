import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { Doctor } from '@/types/database'

interface AuthState {
  user: User | null
  doctor: Doctor | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setDoctor: (doctor: Doctor | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  doctor: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setDoctor: (doctor) => set({ doctor }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, doctor: null, isLoading: false }),
}))
