'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import {
  Shield,
  UserPlus,
  Activity,
  Calendar,
  TrendingUp,
  Stethoscope,
  Users,
  Building2,
  Eye
} from 'lucide-react'

interface Stats {
  totalAdminClinical: number
  activeAdminClinical: number
  totalDoctors: number
  totalPatients: number
  totalAppointments: number
  todayAppointments: number
}

interface AdminClinical {
  id: string
  full_name: string
  email: string
  clinic_name: string | null
  designation: string | null
  is_active: boolean
  created_at: string
  doctorCount?: number
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalAdminClinical: 0,
    activeAdminClinical: 0,
    totalDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
    todayAppointments: 0,
  })
  const [recentAdmins, setRecentAdmins] = useState<AdminClinical[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    const supabase = createClient()

    // Fetch admin clinical users
    const { data: adminClinicals, error: adminsError } = await supabase
      .from('doc_doctors')
      .select('id, full_name, email, clinic_name, designation, is_active, created_at')
      .eq('role', 'admin_clinical')
      .order('created_at', { ascending: false })

    if (!adminsError && adminClinicals) {
      const activeAdmins = adminClinicals.filter((a: { is_active: boolean }) => a.is_active)

      // Get doctor counts for each admin
      const adminsWithCounts = await Promise.all(
        adminClinicals.slice(0, 5).map(async (admin) => {
          const { count } = await supabase
            .from('doc_doctors')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'doctor')
            .eq('created_by', admin.id)

          return { ...admin, doctorCount: count || 0 }
        })
      )

      setRecentAdmins(adminsWithCounts)
      setStats(prev => ({
        ...prev,
        totalAdminClinical: adminClinicals.length,
        activeAdminClinical: activeAdmins.length,
      }))
    }

    // Fetch total doctors count
    const { count: doctorsCount } = await supabase
      .from('doc_doctors')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'doctor')

    // Fetch total patients count
    const { count: patientsCount } = await supabase
      .from('doc_patients')
      .select('*', { count: 'exact', head: true })

    // Fetch appointment stats
    const today = new Date().toISOString().split('T')[0]
    const { count: totalAppts } = await supabase
      .from('doc_appointments')
      .select('*', { count: 'exact', head: true })

    const { count: todayAppts } = await supabase
      .from('doc_appointments')
      .select('*', { count: 'exact', head: true })
      .eq('appointment_date', today)

    setStats(prev => ({
      ...prev,
      totalDoctors: doctorsCount || 0,
      totalPatients: patientsCount || 0,
      totalAppointments: totalAppts || 0,
      todayAppointments: todayAppts || 0,
    }))

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

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SuperAdmin Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage Admin Clinicals and monitor platform activity</p>
        </div>
        <Link href="/superadmin/admin-clinical/create">
          <Button className="mt-4 sm:mt-0 bg-indigo-600 hover:bg-indigo-700">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Admin Clinical
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href="/superadmin/admin-clinical">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Admin Clinical</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {isLoading ? '-' : stats.totalAdminClinical}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-indigo-500">
                  <Shield className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/superadmin/doctors">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Doctors</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {isLoading ? '-' : stats.totalDoctors}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-teal-500">
                  <Stethoscope className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Patients</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {isLoading ? '-' : stats.totalPatients}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-500">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Link href="/superadmin/reports">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Appointments</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {isLoading ? '-' : stats.totalAppointments}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-500">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Activity & Admin Clinicals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              Today's Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Appointments Today</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? '-' : stats.todayAppointments}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Active Admin Clinicals</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? '-' : stats.activeAdminClinical}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Admin Clinicals</CardTitle>
            <Link href="/superadmin/admin-clinical">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-gray-500 text-center py-4">Loading...</p>
            ) : recentAdmins.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No admin clinicals yet</p>
                <Link href="/superadmin/admin-clinical/create">
                  <Button variant="outline" className="mt-4">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add First Admin Clinical
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAdmins.map((admin) => (
                  <Link
                    key={admin.id}
                    href={`/superadmin/admin-clinical/${admin.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-indigo-600">
                            {getInitials(admin.full_name)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{admin.full_name}</p>
                          <p className="text-xs text-gray-500">
                            {admin.clinic_name || admin.designation || 'No organization'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {admin.doctorCount} doctors
                        </Badge>
                        <Badge variant={admin.is_active ? 'default' : 'secondary'}>
                          {admin.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/superadmin/admin-clinical/create">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <UserPlus className="h-6 w-6 text-indigo-600" />
                <span>Add Admin Clinical</span>
              </Button>
            </Link>
            <Link href="/superadmin/admin-clinical">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Shield className="h-6 w-6 text-teal-600" />
                <span>Manage Admins</span>
              </Button>
            </Link>
            <Link href="/superadmin/doctors">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Eye className="h-6 w-6 text-green-600" />
                <span>View All Doctors</span>
              </Button>
            </Link>
            <Link href="/superadmin/reports">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <TrendingUp className="h-6 w-6 text-purple-600" />
                <span>View Reports</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
