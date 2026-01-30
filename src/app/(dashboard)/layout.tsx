'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

const VERSION = '1.3'
const VERSION_DATE = '2026-01-29'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { doctor, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && doctor && doctor.role !== 'doctor') {
      if (doctor.role === 'superadmin') {
        router.push('/superadmin')
      } else if (doctor.role === 'admin_clinical') {
        router.push('/admin-clinical')
      }
    }
  }, [doctor, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (doctor && doctor.role !== 'doctor') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Redirecting...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Sidebar />
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
