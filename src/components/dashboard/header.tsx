'use client'

import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Bell, Calendar, Settings } from 'lucide-react'
import Link from 'next/link'

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
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </Button>
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/calendar">
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              View Calendar
            </Button>
          </Link>
          <Button className="bg-green-600 hover:bg-green-700 gap-2">
            <Calendar className="h-4 w-4" />
            Take Appointment Now
          </Button>
        </div>
      </div>
    </header>
  )
}
