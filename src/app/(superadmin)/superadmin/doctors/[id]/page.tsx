'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  DollarSign,
  UserCheck,
  UserX,
  Loader2,
  ExternalLink,
  Activity
} from 'lucide-react'

interface Doctor {
  id: string
  user_id: string
  full_name: string
  email: string
  phone: string | null
  specialization: string | null
  qualification: string | null
  experience_years: number | null
  clinic_name: string | null
  clinic_address: string | null
  consultation_fee: number | null
  online_fee: number | null
  booking_slug: string | null
  profile_image: string | null
  bio: string | null
  is_verified: boolean
  is_active: boolean
  must_change_password: boolean
  zoom_connected_at: string | null
  stripe_account_id: string | null
  created_at: string
  updated_at: string
}

interface Stats {
  totalAppointments: number
  completedAppointments: number
  totalPatients: number
  revenue: number
}

export default function DoctorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalAppointments: 0,
    completedAppointments: 0,
    totalPatients: 0,
    revenue: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchDoctorDetails()
  }, [params.id])

  const fetchDoctorDetails = async () => {
    setIsLoading(true)
    const supabase = createClient()

    // Fetch doctor
    const { data, error } = await supabase
      .from('doc_doctors')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      toast.error('Doctor not found')
      router.push('/superadmin/doctors')
      return
    }

    setDoctor(data)

    // Fetch stats
    const { count: totalAppts } = await supabase
      .from('doc_appointments')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', params.id)

    const { count: completedAppts } = await supabase
      .from('doc_appointments')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', params.id)
      .eq('status', 'completed')

    const { data: patientsData } = await supabase
      .from('doc_appointments')
      .select('patient_email')
      .eq('doctor_id', params.id)

    const uniquePatients = new Set(patientsData?.map((p: { patient_email: string }) => p.patient_email) || [])

    const { data: revenueData } = await supabase
      .from('doc_appointments')
      .select('amount')
      .eq('doctor_id', params.id)
      .eq('payment_status', 'paid')

    const totalRevenue = revenueData?.reduce((sum: number, a: { amount: number | null }) => sum + (a.amount || 0), 0) || 0

    setStats({
      totalAppointments: totalAppts || 0,
      completedAppointments: completedAppts || 0,
      totalPatients: uniquePatients.size,
      revenue: totalRevenue,
    })

    setIsLoading(false)
  }

  const handleVerify = async (verify: boolean) => {
    if (!doctor) return
    setActionLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('doc_doctors')
      .update({ is_verified: verify })
      .eq('id', doctor.id)

    if (error) {
      toast.error('Failed to update verification status')
    } else {
      toast.success(verify ? 'Doctor verified successfully' : 'Verification removed')
      fetchDoctorDetails()
    }
    setActionLoading(false)
  }

  const handleToggleActive = async () => {
    if (!doctor) return
    setActionLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('doc_doctors')
      .update({ is_active: !doctor.is_active })
      .eq('id', doctor.id)

    if (error) {
      toast.error('Failed to update status')
    } else {
      toast.success(doctor.is_active ? 'Doctor deactivated' : 'Doctor activated')
      fetchDoctorDetails()
    }
    setActionLoading(false)
  }

  const handleResendCredentials = async () => {
    if (!doctor) return
    setActionLoading(true)

    try {
      const response = await fetch('/api/superadmin/doctors/resend-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: doctor.id }),
      })

      if (!response.ok) {
        throw new Error('Failed to resend credentials')
      }

      toast.success('New credentials sent successfully')
    } catch (error) {
      toast.error('Failed to resend credentials')
    }
    setActionLoading(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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

  if (!doctor) {
    return null
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/superadmin/doctors">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Doctor Details</h1>
          <p className="text-gray-500">View and manage doctor profile</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResendCredentials} disabled={actionLoading}>
            <Mail className="h-4 w-4 mr-2" />
            Resend Credentials
          </Button>
          <Link href={`/superadmin/doctors/${doctor.id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={doctor.profile_image || ''} />
                  <AvatarFallback className="bg-indigo-100 text-indigo-600 text-2xl">
                    {getInitials(doctor.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold text-gray-900">{doctor.full_name}</h2>
                    <Badge className={doctor.is_verified ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                      {doctor.is_verified ? 'Verified' : 'Pending'}
                    </Badge>
                    <Badge className={doctor.is_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}>
                      {doctor.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-gray-600 mb-4">
                    {doctor.specialization || 'No specialization set'} | {doctor.qualification || 'No qualification'}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {doctor.email}
                    </span>
                    {doctor.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {doctor.phone}
                      </span>
                    )}
                    {doctor.experience_years && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {doctor.experience_years} years experience
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Practice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Practice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Clinic Name</p>
                  <p className="font-medium">{doctor.clinic_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Clinic Address</p>
                  <p className="font-medium">{doctor.clinic_address || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Physical Consultation Fee</p>
                  <p className="font-medium">{doctor.consultation_fee ? `INR ${doctor.consultation_fee}` : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Online Consultation Fee</p>
                  <p className="font-medium">{doctor.online_fee ? `INR ${doctor.online_fee}` : '-'}</p>
                </div>
              </div>
              {doctor.booking_slug && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-1">Booking Link</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      /book/{doctor.booking_slug}
                    </code>
                    <a
                      href={`/book/${doctor.booking_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Integrations */}
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Zoom</p>
                    <p className="text-sm text-gray-500">
                      {doctor.zoom_connected_at ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                  <Badge variant={doctor.zoom_connected_at ? 'default' : 'secondary'}>
                    {doctor.zoom_connected_at ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Stripe</p>
                    <p className="text-sm text-gray-500">
                      {doctor.stripe_account_id ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                  <Badge variant={doctor.stripe_account_id ? 'default' : 'secondary'}>
                    {doctor.stripe_account_id ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-600" />
                Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Total Appointments</span>
                <span className="font-bold">{stats.totalAppointments}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Completed</span>
                <span className="font-bold">{stats.completedAppointments}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Unique Patients</span>
                <span className="font-bold">{stats.totalPatients}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Total Revenue</span>
                <span className="font-bold text-green-600">INR {stats.revenue.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {doctor.is_verified ? (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleVerify(false)}
                  disabled={actionLoading}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Remove Verification
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-start text-green-600 hover:text-green-700"
                  onClick={() => handleVerify(true)}
                  disabled={actionLoading}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Verify Doctor
                </Button>
              )}
              <Button
                variant="outline"
                className={`w-full justify-start ${doctor.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                onClick={handleToggleActive}
                disabled={actionLoading}
              >
                {doctor.is_active ? (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Deactivate Account
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Activate Account
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Account Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Created</p>
                <p className="font-medium">{formatDate(doctor.created_at)}</p>
              </div>
              <div>
                <p className="text-gray-500">Last Updated</p>
                <p className="font-medium">{formatDate(doctor.updated_at)}</p>
              </div>
              <div>
                <p className="text-gray-500">Password Status</p>
                <Badge variant={doctor.must_change_password ? 'secondary' : 'default'}>
                  {doctor.must_change_password ? 'Must Change' : 'Set'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
