'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { format, startOfWeek, endOfWeek, addDays, isSameDay, isToday } from 'date-fns'
import { Calendar, Clock, Users, ChevronRight, Plus } from 'lucide-react'
import Link from 'next/link'
import type { Appointment } from '@/types/database'

export function SidebarCalendarStats() {
  const { doctor } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!doctor) {
        setLoading(false)
        return
      }

      const supabase = createClient()
      const today = new Date()
      const weekStart = startOfWeek(today, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 })

      const { data, error } = await supabase
        .from('doc_appointments')
        .select('*')
        .eq('doctor_id', doctor.id)
        .gte('appointment_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('appointment_date', format(weekEnd, 'yyyy-MM-dd'))
        .neq('status', 'cancelled')
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (!error && data) {
        setAppointments(data)
      }
      setLoading(false)
    }

    fetchAppointments()

    // Subscribe to changes
    const supabase = createClient()
    const channel = supabase
      .channel('sidebar-appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'doc_appointments',
          filter: doctor ? `doctor_id=eq.${doctor.id}` : undefined,
        },
        () => {
          fetchAppointments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [doctor])

  // Get today's appointments
  const getTodayAppointments = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    return appointments.filter(apt => apt.appointment_date === todayStr)
  }

  // Get week days with counts
  const getWeekDays = () => {
    const today = new Date()
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const days = []

    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i)
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayAppointments = appointments.filter(apt => apt.appointment_date === dateStr)
      days.push({
        date: day,
        count: dayAppointments.length,
        isToday: isToday(day),
      })
    }

    return days
  }

  const todayAppointments = getTodayAppointments()
  const weekDays = getWeekDays()
  const totalWeek = appointments.length
  const pendingCount = appointments.filter(apt => apt.status === 'pending').length

  if (loading) {
    return (
      <div className="px-3 py-2">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 py-2 space-y-3">
      {/* Quick Stats Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          This Week
        </span>
        <Link href="/appointments">
          <Badge variant="outline" className="text-xs cursor-pointer hover:bg-gray-100">
            {totalWeek} total
          </Badge>
        </Link>
      </div>

      {/* Week Mini Calendar */}
      <div className="bg-gray-50 rounded-lg p-2">
        <div className="grid grid-cols-7 gap-1">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
            <div key={i} className="text-center text-[10px] text-gray-400 font-medium">
              {day}
            </div>
          ))}
          {weekDays.map((day, i) => (
            <div
              key={i}
              className={`
                text-center py-1 rounded text-xs relative
                ${day.isToday ? 'bg-green-600 text-white font-bold' : 'text-gray-600'}
              `}
            >
              {format(day.date, 'd')}
              {day.count > 0 && (
                <span className={`
                  absolute -top-1 -right-1 text-[8px] min-w-[14px] h-[14px] flex items-center justify-center rounded-full
                  ${day.isToday ? 'bg-white text-green-600' : 'bg-green-600 text-white'}
                `}>
                  {day.count}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Today's Summary */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-700">Today</span>
          <span className="text-xs text-gray-500">
            {format(new Date(), 'MMM d')}
          </span>
        </div>

        {todayAppointments.length > 0 ? (
          <div className="space-y-1">
            {todayAppointments.slice(0, 3).map(apt => (
              <Link key={apt.id} href="/appointments">
                <div className="flex items-center gap-2 p-2 bg-white rounded border hover:border-green-300 transition-colors cursor-pointer">
                  <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-700">{apt.start_time}</span>
                  <span className="text-xs text-gray-500 truncate flex-1">
                    {apt.patient_name.split(' ')[0]}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1 py-0 ${
                      apt.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' :
                      apt.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-gray-50 text-gray-700'
                    }`}
                  >
                    {apt.status === 'confirmed' ? 'OK' : apt.status === 'pending' ? '!' : apt.status[0].toUpperCase()}
                  </Badge>
                </div>
              </Link>
            ))}
            {todayAppointments.length > 3 && (
              <Link href="/appointments">
                <div className="text-xs text-center text-green-600 hover:text-green-700 cursor-pointer py-1">
                  +{todayAppointments.length - 3} more
                </div>
              </Link>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded">
            No appointments today
          </div>
        )}
      </div>

      {/* Pending Alert */}
      {pendingCount > 0 && (
        <Link href="/appointments?status=pending">
          <div className="flex items-center gap-2 p-2 bg-amber-50 rounded border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer">
            <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-amber-700 font-medium">
              {pendingCount} pending confirmation
            </span>
            <ChevronRight className="h-3 w-3 text-amber-500 ml-auto" />
          </div>
        </Link>
      )}

      {/* Quick Actions */}
      <div className="space-y-1.5 pt-1">
        <Link href="/calendar">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8">
            <Plus className="h-3 w-3" />
            Manage Time Slots
          </Button>
        </Link>
      </div>
    </div>
  )
}
