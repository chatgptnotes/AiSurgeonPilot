'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { Activity, UserPlus, UserCheck, Calendar, Loader2 } from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'doctor_created' | 'doctor_verified' | 'appointment_created' | 'login'
  description: string
  timestamp: string
  metadata?: Record<string, string>
}

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchActivityLog()
  }, [])

  const fetchActivityLog = async () => {
    setIsLoading(true)
    const supabase = createClient()

    // Fetch recent doctors created (as activity)
    const { data: recentDoctors } = await supabase
      .from('doc_doctors')
      .select('id, full_name, email, created_at, is_verified')
      .eq('role', 'doctor')
      .order('created_at', { ascending: false })
      .limit(20)

    // Fetch recent appointments
    const { data: recentAppointments } = await supabase
      .from('doc_appointments')
      .select('id, patient_name, doctor_id, created_at, doc_doctors(full_name)')
      .order('created_at', { ascending: false })
      .limit(20)

    // Combine and sort activities
    const activityItems: ActivityItem[] = []

    if (recentDoctors) {
      for (const doc of recentDoctors) {
        activityItems.push({
          id: `doc-${doc.id}`,
          type: 'doctor_created',
          description: `New doctor account created: ${doc.full_name} (${doc.email})`,
          timestamp: doc.created_at,
          metadata: { doctorId: doc.id, doctorName: doc.full_name },
        })

        if (doc.is_verified) {
          activityItems.push({
            id: `verify-${doc.id}`,
            type: 'doctor_verified',
            description: `Doctor verified: ${doc.full_name}`,
            timestamp: doc.created_at,
            metadata: { doctorId: doc.id, doctorName: doc.full_name },
          })
        }
      }
    }

    if (recentAppointments) {
      for (const appt of recentAppointments) {
        const doctorData = appt.doc_doctors as { full_name: string } | null
        const doctorName = doctorData?.full_name || 'Unknown'
        activityItems.push({
          id: `appt-${appt.id}`,
          type: 'appointment_created',
          description: `New appointment: ${appt.patient_name} with Dr. ${doctorName}`,
          timestamp: appt.created_at,
          metadata: { appointmentId: appt.id },
        })
      }
    }

    // Sort by timestamp descending
    activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    setActivities(activityItems.slice(0, 50))
    setIsLoading(false)
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'doctor_created':
        return <UserPlus className="h-4 w-4 text-blue-600" />
      case 'doctor_verified':
        return <UserCheck className="h-4 w-4 text-green-600" />
      case 'appointment_created':
        return <Calendar className="h-4 w-4 text-purple-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'doctor_created':
        return 'bg-blue-100 text-blue-700'
      case 'doctor_verified':
        return 'bg-green-100 text-green-700'
      case 'appointment_created':
        return 'bg-purple-100 text-purple-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
        <p className="text-gray-500 mt-1">Recent platform activity and events</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No activity found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTimestamp(activity.timestamp)}
                    </p>
                  </div>
                  <Badge variant="outline" className={getActivityColor(activity.type)}>
                    {activity.type.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
