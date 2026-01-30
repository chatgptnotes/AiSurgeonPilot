'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminClinicalSidebar } from '@/components/admin-clinical/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

export default function AdminClinicalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { doctor, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && doctor && doctor.role !== 'admin_clinical') {
      if (doctor.role === 'superadmin') {
        router.push('/superadmin')
      } else {
        router.push('/dashboard')
      }
    }
  }, [doctor, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (doctor?.role !== 'admin_clinical') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Access denied. Redirecting...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminClinicalSidebar />
      <main className="lg:pl-64 flex-1">
        {children}
      </main>
      <footer className="lg:pl-64 py-2 text-center">
        <p className="text-xs text-gray-400">v1.3 - 2026-01-29</p>
      </footer>
      <Toaster />
    </div>
  )
}
