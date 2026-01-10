'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { StatsCard } from '@/components/dashboard/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import {
  Users,
  Stethoscope,
  Calendar,
  DollarSign,
  MessageSquare,
  UserCheck,
  GraduationCap,
  Video,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  totalPatients: number
  todayConsultations: number
  weekAppointments: number
  monthRevenue: number
}

const quickActions = [
  {
    title: 'WhatsApp Manager',
    icon: MessageSquare,
    href: '/digital-office/whatsapp-manager',
    badge: 'NEW',
  },
  {
    title: 'Patient Follow-up',
    icon: UserCheck,
    href: '/digital-office/patient-followup',
    badge: 'NEW',
  },
  {
    title: 'Patient Education',
    icon: GraduationCap,
    href: '/digital-office/patient-education',
    badge: 'NEW',
  },
  {
    title: 'Meeting',
    icon: Video,
    href: '/meetings',
    badge: 'NEW',
  },
]

export default function DashboardPage() {
  const { doctor, isLoading } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayConsultations: 0,
    weekAppointments: 0,
    monthRevenue: 0,
  })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      if (!doctor) return

      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const monthStart = new Date()
      monthStart.setDate(1)

      try {
        // Get unique patients
        const { count: patientsCount } = await supabase
          .from('doc_appointments')
          .select('patient_email', { count: 'exact', head: true })
          .eq('doctor_id', doctor.id)

        // Get today's consultations
        const { count: todayCount } = await supabase
          .from('doc_appointments')
          .select('*', { count: 'exact', head: true })
          .eq('doctor_id', doctor.id)
          .eq('appointment_date', today)
          .in('status', ['confirmed', 'completed'])

        // Get week's appointments
        const { count: weekCount } = await supabase
          .from('doc_appointments')
          .select('*', { count: 'exact', head: true })
          .eq('doctor_id', doctor.id)
          .gte('appointment_date', weekStart.toISOString().split('T')[0])
          .lte('appointment_date', today)

        // Get month's revenue
        const { data: revenueData } = await supabase
          .from('doc_appointments')
          .select('amount')
          .eq('doctor_id', doctor.id)
          .eq('payment_status', 'paid')
          .gte('appointment_date', monthStart.toISOString().split('T')[0])

        const monthRevenue = revenueData?.reduce((sum, row) => sum + (row.amount || 0), 0) || 0

        setStats({
          totalPatients: patientsCount || 0,
          todayConsultations: todayCount || 0,
          weekAppointments: weekCount || 0,
          monthRevenue,
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoadingStats(false)
      }
    }

    if (doctor) {
      fetchStats()
    }
  }, [doctor])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    )
  }

  return (
    <div>
      <Header title="Doctor Dashboard" />

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Patients"
            value={loadingStats ? '-' : stats.totalPatients}
            subtitle="Click to view all"
            icon={Users}
            iconColor="text-blue-500"
          />
          <StatsCard
            title="Today's Consultations"
            value={loadingStats ? '-' : stats.todayConsultations}
            icon={Stethoscope}
            iconColor="text-green-500"
          />
          <StatsCard
            title="This Week's Appointments"
            value={loadingStats ? '-' : stats.weekAppointments}
            subtitle="Click to view details"
            icon={Calendar}
            iconColor="text-purple-500"
          />
          <StatsCard
            title="Revenue This Month"
            value={loadingStats ? '-' : `$${stats.monthRevenue.toLocaleString()}`}
            icon={DollarSign}
            iconColor="text-amber-500"
          />
        </div>

        {/* Digital Doctor Office Quick Actions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Digital Doctor Office (DDO)</CardTitle>
              <Badge className="bg-green-500">NEW</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <Link key={action.title} href={action.href}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <action.icon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{action.title}</p>
                      </div>
                      {action.badge && (
                        <Badge className="bg-green-500 text-xs">{action.badge}</Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Appointments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
              <Link href="/appointments">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No upcoming appointments</p>
                <p className="text-sm">Your scheduled appointments will appear here</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">Consultation Rate</span>
                  </div>
                  <span className="text-sm font-bold text-green-600">+12%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium">New Patients</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600">+8 this week</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-purple-500" />
                    <span className="text-sm font-medium">Appointment Fill Rate</span>
                  </div>
                  <span className="text-sm font-bold text-purple-600">85%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Completion Banner */}
        {doctor && !doctor.is_verified && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-amber-800">Complete Your Profile</p>
                <p className="text-sm text-amber-600">
                  Add your specialization, qualifications, and clinic details to get verified
                </p>
              </div>
              <Link href="/settings">
                <Button className="bg-amber-600 hover:bg-amber-700">
                  Complete Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
