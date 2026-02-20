'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Bell, Calendar, Clock, User, Video, MapPin, Check, Ban, CalendarClock } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import type { Appointment, Notification } from '@/types/database'

interface NotificationItem {
  id: string
  type: 'new_booking' | 'cancelled' | 'rescheduled'
  appointment?: Appointment
  title: string
  message: string
  createdAt: string
  isRead: boolean
  link: string
}

export function NotificationBell() {
  const { doctor } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!doctor) return

      const supabase = createClient()

      // Load read IDs from localStorage
      const storedReadIds = localStorage.getItem(`notification_read_${doctor.id}`)
      const readIdsSet = storedReadIds ? new Set(JSON.parse(storedReadIds)) : new Set()
      setReadIds(readIdsSet as Set<string>)

      // Fetch pending appointments (new bookings)
      const { data: pendingAppts } = await supabase
        .from('doc_appointments')
        .select('*')
        .eq('doctor_id', doctor.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20)

      const bookingNotifs: NotificationItem[] = (pendingAppts || []).map((apt: Appointment) => ({
        id: `booking_${apt.id}`,
        type: 'new_booking' as const,
        appointment: apt,
        title: 'New Appointment',
        message: `${apt.patient_name} booked an appointment`,
        createdAt: apt.created_at,
        isRead: readIdsSet.has(`booking_${apt.id}`),
        link: '/appointments?status=pending',
      }))

      // Fetch in-app notifications (reschedule/cancel from admin)
      const { data: inAppNotifs } = await supabase
        .from('doc_notifications')
        .select('*')
        .eq('doctor_id', doctor.id)
        .eq('type', 'in_app')
        .order('created_at', { ascending: false })
        .limit(20)

      const adminNotifs: NotificationItem[] = (inAppNotifs || []).map((notif: Notification) => ({
        id: `notif_${notif.id}`,
        type: notif.title?.includes('Cancel') ? 'cancelled' as const : 'rescheduled' as const,
        title: notif.title || 'Notification',
        message: notif.message || '',
        createdAt: notif.created_at,
        isRead: notif.is_read || readIdsSet.has(`notif_${notif.id}`),
        link: '/appointments',
      }))

      // Merge and sort by createdAt
      const allNotifs = [...bookingNotifs, ...adminNotifs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      setNotifications(allNotifs)
    }

    fetchNotifications()

    // Subscribe to new appointments in real-time
    if (!doctor) return

    const supabase = createClient()
    const channel = supabase
      .channel('notification-appointments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'doc_appointments',
          filter: `doctor_id=eq.${doctor.id}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const apt = payload.new as Appointment
          if (apt.status === 'pending') {
            setNotifications(prev => [{
              id: `booking_${apt.id}`,
              type: 'new_booking',
              appointment: apt,
              title: 'New Appointment',
              message: `${apt.patient_name} booked an appointment`,
              createdAt: apt.created_at,
              isRead: false,
              link: '/appointments?status=pending',
            }, ...prev])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'doc_appointments',
          filter: `doctor_id=eq.${doctor.id}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const apt = payload.new as Appointment
          if (apt.status !== 'pending') {
            // Remove the booking notification for this appointment
            setNotifications(prev => prev.filter(n => n.id !== `booking_${apt.id}`))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'doc_notifications',
          filter: `doctor_id=eq.${doctor.id}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const notif = payload.new as Notification
          if (notif.type === 'in_app') {
            setNotifications(prev => [{
              id: `notif_${notif.id}`,
              type: notif.title?.includes('Cancel') ? 'cancelled' : 'rescheduled',
              title: notif.title || 'Notification',
              message: notif.message || '',
              createdAt: notif.created_at,
              isRead: false,
              link: '/appointments',
            }, ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [doctor])

  const unreadCount = notifications.filter(n => !n.isRead).length

  const markAllAsRead = async () => {
    if (!doctor) return

    const allIds = new Set(notifications.map(n => n.id))
    setReadIds(allIds)
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))

    // Persist to localStorage
    localStorage.setItem(`notification_read_${doctor.id}`, JSON.stringify([...allIds]))

    // Mark in-app notifications as read in DB
    const supabase = createClient()
    await supabase
      .from('doc_notifications')
      .update({ is_read: true })
      .eq('doctor_id', doctor.id)
      .eq('type', 'in_app')
      .eq('is_read', false)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open && unreadCount > 0) {
      markAllAsRead()
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'cancelled':
        return (
          <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100">
            <Ban className="h-5 w-5 text-red-600" />
          </div>
        )
      case 'rescheduled':
        return (
          <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-100">
            <CalendarClock className="h-5 w-5 text-blue-600" />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-gray-500 h-auto p-1"
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No new notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <Link
                  key={notification.id}
                  href={notification.link}
                  onClick={() => setIsOpen(false)}
                >
                  <div className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}>
                    <div className="flex gap-3">
                      {notification.type === 'new_booking' && notification.appointment ? (
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          notification.appointment.visit_type === 'online'
                            ? 'bg-blue-100'
                            : 'bg-green-100'
                        }`}>
                          {notification.appointment.visit_type === 'online'
                            ? <Video className="h-5 w-5 text-blue-600" />
                            : <MapPin className="h-5 w-5 text-green-600" />
                          }
                        </div>
                      ) : (
                        getNotificationIcon(notification.type)
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-900 mt-0.5">
                          {notification.message}
                        </p>
                        {notification.type === 'new_booking' && notification.appointment && (
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {format(new Date(notification.appointment.appointment_date), 'MMM d, yyyy')}
                            </span>
                            <Clock className="h-3 w-3 ml-1" />
                            <span>{notification.appointment.start_time?.slice(0, 5)}</span>
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <Link href="/appointments" onClick={() => setIsOpen(false)}>
              <Button variant="ghost" className="w-full text-sm text-green-600 hover:text-green-700">
                View all appointments
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
