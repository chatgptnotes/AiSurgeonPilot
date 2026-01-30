'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  UserCheck,
  UserX,
  Loader2,
  Shield,
  Stethoscope,
  RefreshCw,
  Building2,
  MapPin,
  Briefcase,
  Users,
  Calendar,
  Eye
} from 'lucide-react'
import { Doctor } from '@/types/database'

type AdminClinical = Doctor

interface DoctorWithStats extends Doctor {
  patientCount: number
  appointmentCount: number
}

interface Patient {
  id: string
  first_name: string
  last_name: string
  email: string
  phone_number: string | null
  created_at: string
}

interface Stats {
  doctorsCount: number
  patientsCount: number
  appointmentsCount: number
}

export default function AdminClinicalDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [admin, setAdmin] = useState<AdminClinical | null>(null)
  const [doctors, setDoctors] = useState<DoctorWithStats[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [stats, setStats] = useState<Stats>({ doctorsCount: 0, patientsCount: 0, appointmentsCount: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchAdminDetails()
  }, [params.id])

  const fetchAdminDetails = async () => {
    setIsLoading(true)
    const supabase = createClient()

    // Fetch admin details
    const { data: adminData, error } = await supabase
      .from('doc_doctors')
      .select('*')
      .eq('id', params.id)
      .eq('role', 'admin_clinical')
      .single()

    if (error) {
      toast.error('Admin Clinical not found')
      router.push('/superadmin/admin-clinical')
      return
    }

    setAdmin(adminData)

    // Fetch doctors created by this admin
    const { data: doctorsData } = await supabase
      .from('doc_doctors')
      .select('*')
      .eq('role', 'doctor')
      .eq('created_by', params.id)
      .order('created_at', { ascending: false })

    if (doctorsData) {
      // Get patient and appointment counts for each doctor
      const doctorsWithStats = await Promise.all(
        doctorsData.map(async (doc) => {
          // Get unique patients from appointments
          const { data: appointmentsData } = await supabase
            .from('doc_appointments')
            .select('patient_email')
            .eq('doctor_id', doc.id)

          const uniquePatients = new Set(appointmentsData?.map(a => a.patient_email) || [])

          // Get appointment count
          const { count: apptCount } = await supabase
            .from('doc_appointments')
            .select('*', { count: 'exact', head: true })
            .eq('doctor_id', doc.id)

          return {
            ...doc,
            patientCount: uniquePatients.size,
            appointmentCount: apptCount || 0,
          }
        })
      )

      setDoctors(doctorsWithStats)

      // Calculate total stats
      const totalPatients = doctorsWithStats.reduce((sum, d) => sum + d.patientCount, 0)
      const totalAppointments = doctorsWithStats.reduce((sum, d) => sum + d.appointmentCount, 0)

      setStats({
        doctorsCount: doctorsData.length,
        patientsCount: totalPatients,
        appointmentsCount: totalAppointments,
      })

      // Fetch unique patients across all doctors
      const doctorIds = doctorsData.map(d => d.id)
      if (doctorIds.length > 0) {
        const { data: allAppointments } = await supabase
          .from('doc_appointments')
          .select('patient_name, patient_email, patient_phone, created_at')
          .in('doctor_id', doctorIds)
          .order('created_at', { ascending: false })

        if (allAppointments) {
          // Get unique patients
          const uniquePatientsMap = new Map()
          allAppointments.forEach(apt => {
            if (!uniquePatientsMap.has(apt.patient_email)) {
              uniquePatientsMap.set(apt.patient_email, {
                id: apt.patient_email,
                first_name: apt.patient_name.split(' ')[0] || '',
                last_name: apt.patient_name.split(' ').slice(1).join(' ') || '',
                email: apt.patient_email,
                phone_number: apt.patient_phone,
                created_at: apt.created_at,
              })
            }
          })
          setPatients(Array.from(uniquePatientsMap.values()).slice(0, 20))
        }
      }
    }

    setIsLoading(false)
  }

  const handleToggleActive = async () => {
    if (!admin) return
    setActionLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('doc_doctors')
      .update({ is_active: !admin.is_active })
      .eq('id', admin.id)

    if (error) {
      toast.error('Failed to update status')
    } else {
      toast.success(admin.is_active ? 'Admin Clinical deactivated' : 'Admin Clinical activated')
      fetchAdminDetails()
    }
    setActionLoading(false)
  }

  const handleResendCredentials = async () => {
    if (!admin) return
    setActionLoading(true)

    try {
      const response = await fetch('/api/superadmin/admin-clinical/resend-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: admin.id }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to resend credentials')
      }

      toast.success('Credentials resent successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resend credentials')
    } finally {
      setActionLoading(false)
    }
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
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!admin) return null

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/superadmin/admin-clinical">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Clinical Details</h1>
            <p className="text-gray-500">View admin clinical and their managed doctors</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleResendCredentials}
            disabled={actionLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Resend Credentials
          </Button>
          <Link href={`/superadmin/admin-clinical/${admin.id}/edit`}>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Profile Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={admin.profile_image || ''} />
                <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xl">
                  {getInitials(admin.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold">{admin.full_name}</h2>
                  <Badge variant={admin.is_active ? 'default' : 'secondary'}>
                    {admin.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {admin.designation && (
                  <p className="text-gray-600 text-sm mb-1">
                    {admin.designation} {admin.department && `• ${admin.department}`}
                  </p>
                )}
                {admin.clinic_name && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Building2 className="h-4 w-4" />
                    <span>{admin.clinic_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Mail className="h-4 w-4" />
                  <span>{admin.email}</span>
                </div>
                {admin.phone && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Phone className="h-4 w-4" />
                    <span>{admin.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-teal-100 rounded-lg">
                <Stethoscope className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.doctorsCount}</p>
                <p className="text-sm text-gray-500">Doctors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.patientsCount}</p>
                <p className="text-sm text-gray-500">Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Doctors and Patients */}
      <Tabs defaultValue="doctors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="doctors" className="gap-2">
            <Stethoscope className="h-4 w-4" />
            Doctors ({stats.doctorsCount})
          </TabsTrigger>
          <TabsTrigger value="patients" className="gap-2">
            <Users className="h-4 w-4" />
            Patients ({stats.patientsCount})
          </TabsTrigger>
          <TabsTrigger value="info" className="gap-2">
            <Shield className="h-4 w-4" />
            Account Info
          </TabsTrigger>
        </TabsList>

        {/* Doctors Tab */}
        <TabsContent value="doctors">
          <Card>
            <CardHeader>
              <CardTitle>Doctors Created by {admin.full_name}</CardTitle>
              <CardDescription>
                View-only list of doctors managed by this Admin Clinical
              </CardDescription>
            </CardHeader>
            <CardContent>
              {doctors.length === 0 ? (
                <div className="text-center py-8">
                  <Stethoscope className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No doctors created yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead>Patients</TableHead>
                      <TableHead>Appointments</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctors.map((doctor) => (
                      <TableRow key={doctor.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-teal-100 text-teal-600 text-xs">
                                {getInitials(doctor.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{doctor.full_name}</p>
                              <p className="text-sm text-gray-500">{doctor.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{doctor.specialization || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{doctor.patientCount}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{doctor.appointmentCount}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={doctor.is_active ? 'default' : 'secondary'}>
                            {doctor.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(doctor.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patients Tab */}
        <TabsContent value="patients">
          <Card>
            <CardHeader>
              <CardTitle>Patients</CardTitle>
              <CardDescription>
                View-only list of patients who have appointments with doctors under this Admin Clinical
              </CardDescription>
            </CardHeader>
            <CardContent>
              {patients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No patients yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>First Visit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-green-100 text-green-600 text-xs">
                                {getInitials(`${patient.first_name} ${patient.last_name}`)}
                              </AvatarFallback>
                            </Avatar>
                            <p className="font-medium">
                              {patient.first_name} {patient.last_name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{patient.email}</TableCell>
                        <TableCell>{patient.phone_number || '-'}</TableCell>
                        <TableCell>
                          {new Date(patient.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Info Tab */}
        <TabsContent value="info">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Organization Details */}
            {admin.clinic_name && (
              <Card>
                <CardHeader>
                  <CardTitle>Organization Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-indigo-600 mt-0.5" />
                    <div>
                      <p className="font-medium">{admin.clinic_name}</p>
                      {admin.department && (
                        <p className="text-sm text-gray-500">{admin.department} Department</p>
                      )}
                    </div>
                  </div>
                  {(admin.clinic_address || admin.city || admin.state) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-indigo-600 mt-0.5" />
                      <div>
                        {admin.clinic_address && <p className="font-medium">{admin.clinic_address}</p>}
                        <p className="text-sm text-gray-500">
                          {[admin.city, admin.state, admin.pincode].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Account Created</p>
                    <p className="font-medium">{new Date(admin.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Updated</p>
                    <p className="font-medium">{new Date(admin.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Password Status</p>
                    <p className="text-sm text-gray-500">
                      {admin.must_change_password ? 'Must change on next login' : 'Password has been set'}
                    </p>
                  </div>
                  <Badge variant={admin.must_change_password ? 'secondary' : 'default'}>
                    {admin.must_change_password ? 'Pending Change' : 'Set'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleToggleActive}
                  disabled={actionLoading}
                >
                  {admin.is_active ? (
                    <>
                      <UserX className="h-4 w-4 mr-2 text-red-600" />
                      Deactivate Account
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2 text-green-600" />
                      Activate Account
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
