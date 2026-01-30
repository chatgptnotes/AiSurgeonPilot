'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
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
  RefreshCw
} from 'lucide-react'
import { Doctor } from '@/types/database'

interface Stats {
  totalAppointments: number
  completedAppointments: number
  totalPatients: number
  revenue: number
}

export default function DoctorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { doctor: currentUser } = useAuth()
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
    if (currentUser?.id) {
      fetchDoctorDetails()
    }
  }, [params.id, currentUser?.id])

  const fetchDoctorDetails = async () => {
    if (!currentUser?.id) return

    setIsLoading(true)
    const supabase = createClient()

    // Fetch doctor - only if created by this admin clinical
    const { data, error } = await supabase
      .from('doc_doctors')
      .select('*')
      .eq('id', params.id)
      .eq('role', 'doctor')
      .eq('created_by', currentUser.id)
      .single()

    if (error) {
      toast.error('Doctor not found or access denied')
      router.push('/admin-clinical/doctors')
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
      const response = await fetch('/api/admin-clinical/doctors/resend-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: doctor.id }),
      })

      if (!response.ok) {
        throw new Error('Failed to resend credentials')
      }

      toast.success('Credentials sent successfully')
    } catch (error) {
      toast.error('Failed to resend credentials')
    }
    setActionLoading(false)
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

  if (!doctor) return null

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin-clinical/doctors">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Doctor Details</h1>
            <p className="text-gray-500">View and manage doctor information</p>
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
          <Link href={`/admin-clinical/doctors/${doctor.id}/edit`}>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={doctor.profile_image || ''} />
                <AvatarFallback className="bg-teal-100 text-teal-600 text-2xl">
                  {getInitials(doctor.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-2xl font-bold">{doctor.full_name}</h2>
                  <Badge variant={doctor.is_verified ? 'default' : 'secondary'}>
                    {doctor.is_verified ? 'Verified' : 'Pending'}
                  </Badge>
                  <Badge variant={doctor.is_active ? 'default' : 'secondary'}>
                    {doctor.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {doctor.specialization && (
                  <p className="text-gray-600 mb-2">{doctor.specialization}</p>
                )}
                {doctor.qualification && (
                  <p className="text-gray-500 text-sm mb-3">{doctor.qualification}</p>
                )}
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{doctor.email}</span>
                  </div>
                  {doctor.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{doctor.phone}</span>
                    </div>
                  )}
                  {doctor.experience_years && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      <span>{doctor.experience_years} years experience</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Appointments</span>
              <span className="font-bold">{stats.totalAppointments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Completed</span>
              <span className="font-bold">{stats.completedAppointments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Unique Patients</span>
              <span className="font-bold">{stats.totalPatients}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-gray-600">Total Revenue</span>
              <span className="font-bold text-green-600">
                ₹{stats.revenue.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Practice Details */}
        {(doctor.clinic_name || doctor.clinic_address) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Practice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {doctor.clinic_name && (
                <div>
                  <p className="text-sm text-gray-500">Clinic Name</p>
                  <p className="font-medium">{doctor.clinic_name}</p>
                </div>
              )}
              {doctor.clinic_address && (
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">{doctor.clinic_address}</p>
                </div>
              )}
              {(doctor.consultation_fee || doctor.online_fee) && (
                <div className="flex gap-4">
                  {doctor.consultation_fee && (
                    <div>
                      <p className="text-sm text-gray-500">Physical Fee</p>
                      <p className="font-medium">₹{doctor.consultation_fee}</p>
                    </div>
                  )}
                  {doctor.online_fee && (
                    <div>
                      <p className="text-sm text-gray-500">Online Fee</p>
                      <p className="font-medium">₹{doctor.online_fee}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
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
                className="w-full justify-start"
                onClick={() => handleVerify(true)}
                disabled={actionLoading}
              >
                <UserCheck className="h-4 w-4 mr-2 text-green-600" />
                Verify Doctor
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleToggleActive}
              disabled={actionLoading}
            >
              {doctor.is_active ? (
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
            {doctor.booking_slug && (
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <a
                  href={`/book/${doctor.booking_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Booking Page
                </a>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="font-medium">{new Date(doctor.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="font-medium">{new Date(doctor.updated_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Password Status</p>
              <Badge variant={doctor.must_change_password ? 'secondary' : 'default'}>
                {doctor.must_change_password ? 'Pending Change' : 'Set'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
