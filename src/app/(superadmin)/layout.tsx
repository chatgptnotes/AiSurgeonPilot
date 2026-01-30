'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SuperAdminSidebar } from '@/components/superadmin/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

const VERSION = '1.3'
const VERSION_DATE = '2026-01-29'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { doctor, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && doctor && doctor.role !== 'superadmin') {
      router.push('/dashboard')
    }
  }, [doctor, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (doctor?.role !== 'superadmin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">Access denied. Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SuperAdminSidebar />
      <main className="lg:pl-64 flex-1">
        {children}
      </main>
      <footer className="lg:pl-64 py-2 text-center">
        <p className="text-xs text-gray-400">
          v{VERSION} - {VERSION_DATE}
        </p>
      </footer>
      <Toaster />
    </div>
  )
}
