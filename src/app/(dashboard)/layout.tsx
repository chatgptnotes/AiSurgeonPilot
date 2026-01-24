'use client'

import { Sidebar } from '@/components/dashboard/sidebar'
import { Toaster } from '@/components/ui/sonner'

const VERSION = '1.2'
const VERSION_DATE = '2026-01-23'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
