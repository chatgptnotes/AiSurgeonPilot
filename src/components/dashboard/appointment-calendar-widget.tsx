'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addDays } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Users, Clock } from 'lucide-react'
import Link from 'next/link'
import type { Appointment } from '@/types/database'

interface AppointmentStats {
  today: number
  thisWeek: number
  pending: number
}

interface DayAppointmentCount {
  date: Date
  count: number
  appointments: Appointment[]
}

export function AppointmentCalendarWidget() {
  const { doctor } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!doctor) {
        setLoading(false)
        return
      }

      const supabase = createClient()
      const monthStart = startOfMonth(calendarMonth)
      const monthEnd = endOfMonth(calendarMonth)

      const { data, error } = await supabase
        .from('doc_appointments')
        .select('*')
        .eq('doctor_id', doctor.id)
        .gte('appointment_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('appointment_date', format(monthEnd, 'yyyy-MM-dd'))
        .neq('status', 'cancelled')
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (!error && data) {
        setAppointments(data)
      }
      setLoading(false)
    }

    fetchAppointments()
  }, [doctor, calendarMonth])

  // Calculate stats
  const getStats = (): AppointmentStats => {
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 })

    const todayAppointments = appointments.filter(
      apt => apt.appointment_date === todayStr && apt.status !== 'cancelled'
    ).length

    const weekAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date)
      return aptDate >= weekStart && aptDate <= weekEnd && apt.status !== 'cancelled'
    }).length

    const pendingAppointments = appointments.filter(
      apt => apt.status === 'pending'
    ).length

    return {
      today: todayAppointments,
      thisWeek: weekAppointments,
      pending: pendingAppointments,
    }
  }

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date): Appointment[] => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return appointments.filter(
      apt => apt.appointment_date === dateStr && apt.status !== 'cancelled'
    )
  }

  // Get appointment count for a date
  const getCountForDate = (date: Date): number => {
    return getAppointmentsForDate(date).length
  }

  const stats = getStats()

  // Navigate months
  const goToPrevMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCalendarMonth(new Date())
    setSelectedDate(new Date())
  }

  // Get all days in current month
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(calendarMonth),
    end: endOfMonth(calendarMonth),
  })

  // Get days from previous month to fill first week
  const firstDayOfMonth = startOfMonth(calendarMonth)
  const startDay = firstDayOfMonth.getDay() // 0 = Sunday
  const prevMonthDays: Date[] = []
  for (let i = startDay - 1; i >= 0; i--) {
    prevMonthDays.push(addDays(firstDayOfMonth, -(i + 1)))
  }

  // Get days from next month to fill last week
  const lastDayOfMonth = endOfMonth(calendarMonth)
  const endDay = lastDayOfMonth.getDay()
  const nextMonthDays: Date[] = []
  for (let i = 1; i <= 6 - endDay; i++) {
    nextMonthDays.push(addDays(lastDayOfMonth, i))
  }

  const allDays = [...prevMonthDays, ...daysInMonth, ...nextMonthDays]

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 relative">
          <CalendarDays className="h-4 w-4" />
          <span className="hidden sm:inline">View Calendar</span>
          {stats.today > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 min-w-[20px] flex items-center justify-center bg-green-600 hover:bg-green-600 text-white text-xs px-1.5">
              {stats.today}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
        <div className="p-4 space-y-4">
          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <div className="text-xl font-bold text-green-700">{stats.today}</div>
              <div className="text-xs text-green-600">Today</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-xl font-bold text-blue-700">{stats.thisWeek}</div>
              <div className="text-xs text-blue-600">This Week</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-2 text-center">
              <div className="text-xl font-bold text-amber-700">{stats.pending}</div>
              <div className="text-xs text-amber-600">Pending</div>
            </div>
          </div>

          {/* Calendar Header */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {format(calendarMonth, 'MMMM yyyy')}
              </span>
              <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs h-6">
                Today
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="border rounded-lg overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-gray-50 border-b">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7">
              {allDays.map((day, index) => {
                const count = getCountForDate(day)
                const isCurrentMonth = day.getMonth() === calendarMonth.getMonth()
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                const isTodayDate = isToday(day)

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      relative p-2 text-sm border-b border-r transition-colors min-h-[48px]
                      ${!isCurrentMonth ? 'text-gray-300 bg-gray-50' : 'hover:bg-gray-50'}
                      ${isSelected ? 'bg-green-50 ring-2 ring-green-500 ring-inset' : ''}
                      ${isTodayDate && !isSelected ? 'bg-blue-50' : ''}
                    `}
                  >
                    <span className={`
                      ${isTodayDate ? 'bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto' : ''}
                    `}>
                      {day.getDate()}
                    </span>
                    {count > 0 && isCurrentMonth && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                        <span className={`
                          text-[10px] font-medium px-1.5 py-0.5 rounded-full
                          ${count >= 5 ? 'bg-red-100 text-red-700' :
                            count >= 3 ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'}
                        `}>
                          {count}
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selected Date Details */}
          {selectedDate && (
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">
                  {format(selectedDate, 'EEEE, MMM d')}
                </h4>
                <Badge variant="outline" className="text-xs">
                  {getCountForDate(selectedDate)} appointments
                </Badge>
              </div>

              {getCountForDate(selectedDate) > 0 ? (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {getAppointmentsForDate(selectedDate).slice(0, 5).map(apt => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="font-medium">{apt.start_time}</span>
                        <span className="text-gray-600 truncate max-w-[100px]">
                          {apt.patient_name}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          apt.status === 'confirmed' ? 'bg-green-50 text-green-700' :
                          apt.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                          'bg-gray-50 text-gray-700'
                        }`}
                      >
                        {apt.status}
                      </Badge>
                    </div>
                  ))}
                  {getCountForDate(selectedDate) > 5 && (
                    <p className="text-xs text-gray-500 text-center">
                      +{getCountForDate(selectedDate) - 5} more
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-2">
                  No appointments scheduled
                </p>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2 border-t pt-3">
            <Link href="/calendar" className="flex-1" onClick={() => setIsOpen(false)}>
              <Button variant="outline" size="sm" className="w-full text-xs">
                Manage Slots
              </Button>
            </Link>
            <Link href="/appointments" className="flex-1" onClick={() => setIsOpen(false)}>
              <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-xs">
                All Appointments
              </Button>
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
