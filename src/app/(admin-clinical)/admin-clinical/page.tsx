'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import {
  Stethoscope,
  UserPlus,
  CheckCircle,
  Clock,
  Loader2,
  Calendar,
  CalendarCheck,
  IndianRupee,
} from 'lucide-react'
import { Doctor } from '@/types/database'

interface DoctorStats {
  total: number
  active: number
  verified: number
  pending: number
}

interface AppointmentStats {
  totalAppointments: number
  todayAppointments: number
  pendingAppointments: number
  totalRevenue: number
}

interface DoctorWithStats extends Doctor {
  appointmentCount?: number
}

export default function AdminClinicalDashboard() {
  const { doctor: currentUser } = useAuth()
  const [stats, setStats] = useState<DoctorStats>({
    total: 0,
    active: 0,
    verified: 0,
    pending: 0,
  })
  const [appointmentStats, setAppointmentStats] = useState<AppointmentStats>({
    totalAppointments: 0,
    todayAppointments: 0,
    pendingAppointments: 0,
    totalRevenue: 0,
  })
  const [recentDoctors, setRecentDoctors] = useState<DoctorWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (currentUser?.id) {
      fetchDashboardData()
    }
  }, [currentUser?.id])

  const fetchDashboardData = async () => {
    if (!currentUser?.id) return

    const supabase = createClient()

    // Fetch doctors created by this admin clinical
    const { data: doctors, error } = await supabase
      .from('doc_doctors')
      .select('*')
      .eq('role', 'doctor')
      .eq('created_by', currentUser.id)
      .order('created_at', { ascending: false })

    if (!error && doctors) {
      const active = doctors.filter(d => d.is_active).length
      const verified = doctors.filter(d => d.is_verified).length
      const pending = doctors.filter(d => !d.is_verified).length

      setStats({
        total: doctors.length,
        active,
        verified,
        pending,
      })

      // Fetch appointment statistics
      const doctorIds = doctors.map(d => d.id)

      if (doctorIds.length > 0) {
        // Total appointments
        const { count: totalAppts } = await supabase
          .from('doc_appointments')
          .select('*', { count: 'exact', head: true })
          .in('doctor_id', doctorIds)

        // Today's appointments
        const today = new Date().toISOString().split('T')[0]
        const { count: todayAppts } = await supabase
          .from('doc_appointments')
          .select('*', { count: 'exact', head: true })
          .in('doctor_id', doctorIds)
          .eq('appointment_date', today)

        // Pending appointments
        const { count: pendingAppts } = await supabase
          .from('doc_appointments')
          .select('*', { count: 'exact', head: true })
          .in('doctor_id', doctorIds)
          .eq('status', 'pending')

        // Total revenue
        const { data: revenueData } = await supabase
          .from('doc_appointments')
          .select('amount')
          .in('doctor_id', doctorIds)
          .eq('payment_status', 'paid')

        const totalRevenue = revenueData?.reduce((sum, a) => sum + (a.amount || 0), 0) || 0

        setAppointmentStats({
          totalAppointments: totalAppts || 0,
          todayAppointments: todayAppts || 0,
          pendingAppointments: pendingAppts || 0,
          totalRevenue,
        })

        // Fetch appointment count per doctor for recent doctors list
        const doctorsWithStats = await Promise.all(
          doctors.slice(0, 5).map(async (doc) => {
            const { count } = await supabase
              .from('doc_appointments')
              .select('*', { count: 'exact', head: true })
              .eq('doctor_id', doc.id)
            return { ...doc, appointmentCount: count || 0 }
          })
        )
        setRecentDoctors(doctorsWithStats)
      } else {
        setRecentDoctors(doctors.slice(0, 5))
      }
    }

    setIsLoading(false)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {currentUser?.full_name || 'Admin Clinical'}
        </h1>
        <p className="text-gray-500 mt-1">
          Manage your doctors and their accounts
        </p>
      </div>

      {/* Doctor Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Link href="/admin-clinical/doctors">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-100 rounded-lg">
                  <Stethoscope className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-gray-500">Total Doctors</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.verified}</p>
                <p className="text-sm text-gray-500">Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-gray-500">Pending Verification</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{appointmentStats.totalAppointments}</p>
                <p className="text-sm text-gray-500">Total Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CalendarCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{appointmentStats.todayAppointments}</p>
                <p className="text-sm text-gray-500">Today's Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{appointmentStats.pendingAppointments}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <IndianRupee className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">₹{appointmentStats.totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Doctors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin-clinical/doctors/create">
              <Button className="w-full justify-start bg-teal-600 hover:bg-teal-700">
                <UserPlus className="h-4 w-4 mr-2" />
                Add New Doctor
              </Button>
            </Link>
            <Link href="/admin-clinical/doctors">
              <Button variant="outline" className="w-full justify-start">
                <Stethoscope className="h-4 w-4 mr-2" />
                View All Doctors
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Doctors */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Doctors</CardTitle>
              <CardDescription>Doctors you've recently added</CardDescription>
            </div>
            <Link href="/admin-clinical/doctors">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentDoctors.length === 0 ? (
              <div className="text-center py-8">
                <Stethoscope className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No doctors added yet</p>
                <Link href="/admin-clinical/doctors/create">
                  <Button variant="outline" className="mt-4">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add First Doctor
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentDoctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-teal-100 text-teal-600">
                          {getInitials(doctor.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{doctor.full_name}</p>
                        <p className="text-sm text-gray-500">
                          {doctor.specialization || 'No specialization'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-purple-600 border-purple-200">
                        {doctor.appointmentCount || 0} appts
                      </Badge>
                      <Badge variant={doctor.is_active ? 'default' : 'secondary'}>
                        {doctor.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Link href={`/admin-clinical/doctors/${doctor.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
