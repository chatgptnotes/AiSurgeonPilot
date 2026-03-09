'use client'

import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import Link from 'next/link'
import { AppointmentCalendarWidget } from './appointment-calendar-widget'
import { NotificationBell } from './notification-bell'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const today = format(new Date(), 'EEEE, MMMM d, yyyy')

  return (
    <header className="bg-white border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <AppointmentCalendarWidget />
        </div>
      </div>
    </header>
  )
}
