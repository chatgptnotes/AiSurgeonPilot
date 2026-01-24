'use client'

import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Calendar, Settings } from 'lucide-react'
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
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
          <AppointmentCalendarWidget />
          <Link href="/calendar">
            <Button className="bg-green-600 hover:bg-green-700 gap-2">
              <Calendar className="h-4 w-4" />
              Take Appointment Now
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
