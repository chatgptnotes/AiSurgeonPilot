'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Loader2,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'

interface ReportStats {
  totalDoctors: number
  verifiedDoctors: number
  pendingDoctors: number
  totalAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  pendingAppointments: number
  totalRevenue: number
  totalPatients: number
  appointmentsByMonth: { month: string; count: number }[]
  revenueByMonth: { month: string; amount: number }[]
}

export default function ReportsPage() {
  const [stats, setStats] = useState<ReportStats>({
    totalDoctors: 0,
    verifiedDoctors: 0,
    pendingDoctors: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    pendingAppointments: 0,
    totalRevenue: 0,
    totalPatients: 0,
    appointmentsByMonth: [],
    revenueByMonth: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchReportData()
  }, [])

  const fetchReportData = async () => {
    setIsLoading(true)
    const supabase = createClient()

    // Fetch doctor stats
    const { data: doctors } = await supabase
      .from('doc_doctors')
      .select('id, is_verified')
      .eq('role', 'doctor')

    type DoctorRow = { id: string; is_verified: boolean }
    type AppointmentRow = { id: string; status: string; payment_status: string; amount: number | null; patient_email: string; created_at: string }

    const totalDoctors = doctors?.length || 0
    const verifiedDoctors = doctors?.filter((d: DoctorRow) => d.is_verified).length || 0
    const pendingDoctors = doctors?.filter((d: DoctorRow) => !d.is_verified).length || 0

    // Fetch appointment stats
    const { data: appointments } = await supabase
      .from('doc_appointments')
      .select('id, status, payment_status, amount, patient_email, created_at')

    const totalAppointments = appointments?.length || 0
    const completedAppointments = appointments?.filter((a: AppointmentRow) => a.status === 'completed').length || 0
    const cancelledAppointments = appointments?.filter((a: AppointmentRow) => a.status === 'cancelled').length || 0
    const pendingAppointments = appointments?.filter((a: AppointmentRow) => a.status === 'pending' || a.status === 'confirmed').length || 0

    const totalRevenue = appointments
      ?.filter((a: AppointmentRow) => a.payment_status === 'paid')
      .reduce((sum: number, a: AppointmentRow) => sum + (a.amount || 0), 0) || 0

    const uniquePatients = new Set(appointments?.map((a: AppointmentRow) => a.patient_email) || [])
    const totalPatients = uniquePatients.size

    // Calculate monthly data (last 6 months)
    const now = new Date()
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(date.toLocaleString('default', { month: 'short', year: '2-digit' }))
    }

    const appointmentsByMonth = months.map((month, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1)
      const count = appointments?.filter((a: AppointmentRow) => {
        const created = new Date(a.created_at)
        return created >= date && created < nextMonth
      }).length || 0
      return { month, count }
    })

    const revenueByMonth = months.map((month, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1)
      const amount = appointments
        ?.filter((a: AppointmentRow) => {
          const created = new Date(a.created_at)
          return created >= date && created < nextMonth && a.payment_status === 'paid'
        })
        .reduce((sum: number, a: AppointmentRow) => sum + (a.amount || 0), 0) || 0
      return { month, amount }
    })

    setStats({
      totalDoctors,
      verifiedDoctors,
      pendingDoctors,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      pendingAppointments,
      totalRevenue,
      totalPatients,
      appointmentsByMonth,
      revenueByMonth,
    })

    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">Platform analytics and statistics</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Doctors</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalDoctors}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.verifiedDoctors} verified, {stats.pendingDoctors} pending
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Appointments</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalAppointments}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.completedAppointments} completed
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalRevenue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">From paid appointments</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Patients</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalPatients}</p>
                <p className="text-xs text-gray-500 mt-1">Unique patients</p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Appointment Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Appointment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Completed</span>
                </div>
                <span className="text-xl font-bold text-green-600">{stats.completedAppointments}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium">Pending/Confirmed</span>
                </div>
                <span className="text-xl font-bold text-yellow-600">{stats.pendingAppointments}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium">Cancelled</span>
                </div>
                <span className="text-xl font-bold text-red-600">{stats.cancelledAppointments}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.appointmentsByMonth.map((item, i) => {
                const maxCount = Math.max(...stats.appointmentsByMonth.map(m => m.count), 1)
                const percentage = (item.count / maxCount) * 100
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.month}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.revenueByMonth.map((item, i) => (
              <div key={i} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">{item.month}</p>
                <p className="text-lg font-bold text-gray-900">
                  {item.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
