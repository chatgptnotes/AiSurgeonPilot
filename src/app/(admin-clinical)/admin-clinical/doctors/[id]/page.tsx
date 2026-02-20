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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { format, parse, isBefore, isAfter, isSameDay } from 'date-fns'
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  UserCheck,
  UserX,
  Loader2,
  ExternalLink,
  RefreshCw,
  Video,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  CalendarClock,
  Ban,
  Check
} from 'lucide-react'
import { Doctor, Appointment, Availability, AvailabilityOverride } from '@/types/database'

interface TimeSlot {
  start: string
  end: string
  available: boolean
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
}

const paymentColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  refunded: 'bg-gray-100 text-gray-800',
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
  const { doctor: currentUser } = useAuth()
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalAppointments: 0,
    completedAppointments: 0,
    totalPatients: 0,
    revenue: 0,
  })
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [showAppointments, setShowAppointments] = useState(false)
  const [appointmentsLoading, setAppointmentsLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [updatingAptId, setUpdatingAptId] = useState<string | null>(null)

  // Reschedule state
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false)
  const [rescheduleApt, setRescheduleApt] = useState<Appointment | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined)
  const [rescheduleSlot, setRescheduleSlot] = useState<TimeSlot | null>(null)
  const [rescheduleLoading, setRescheduleLoading] = useState(false)
  const [doctorAvailability, setDoctorAvailability] = useState<Availability[]>([])
  const [doctorOverrides, setDoctorOverrides] = useState<AvailabilityOverride[]>([])
  const [existingBookings, setExistingBookings] = useState<Appointment[]>([])

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

  const fetchAppointments = async () => {
    setAppointmentsLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('doc_appointments')
      .select('*')
      .eq('doctor_id', params.id)
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: false })

    if (error) {
      toast.error('Failed to load appointments')
    } else {
      setAppointments(data || [])
    }
    setAppointmentsLoading(false)
  }

  const handleToggleAppointments = () => {
    if (!showAppointments && appointments.length === 0) {
      fetchAppointments()
    }
    setShowAppointments(!showAppointments)
  }

  const handleConfirmAppointment = async (apt: Appointment) => {
    setUpdatingAptId(apt.id)
    const supabase = createClient()

    const { error } = await supabase
      .from('doc_appointments')
      .update({ status: 'confirmed' })
      .eq('id', apt.id)

    if (error) {
      toast.error('Failed to confirm appointment')
    } else {
      setAppointments(prev =>
        prev.map(a => a.id === apt.id ? { ...a, status: 'confirmed' } : a)
      )
      toast.success('Appointment confirmed')
    }
    setUpdatingAptId(null)
  }

  const handleCancelAppointment = async (apt: Appointment) => {
    setUpdatingAptId(apt.id)
    const supabase = createClient()

    const { error } = await supabase
      .from('doc_appointments')
      .update({ status: 'cancelled' })
      .eq('id', apt.id)

    if (error) {
      toast.error('Failed to cancel appointment')
    } else {
      // Notify the doctor
      const cancelNotif = {
        doctor_id: apt.doctor_id,
        appointment_id: apt.id,
        type: 'in_app' as const,
        channel: 'admin_action',
        status: 'sent' as const,
        title: 'Appointment Cancelled',
        message: `Appointment with ${apt.patient_name} on ${format(new Date(apt.appointment_date), 'MMM d, yyyy')} at ${apt.start_time?.slice(0, 5)} has been cancelled by admin.`,
        is_read: false,
      }
      await supabase.from('doc_notifications').insert(cancelNotif)

      // Notify the patient (if registered)
      if (apt.patient_id) {
        await supabase.from('doc_notifications').insert({
          ...cancelNotif,
          patient_id: apt.patient_id,
          message: `Your appointment on ${format(new Date(apt.appointment_date), 'MMM d, yyyy')} at ${apt.start_time?.slice(0, 5)} has been cancelled.`,
        })
      }

      setAppointments(prev =>
        prev.map(a => a.id === apt.id ? { ...a, status: 'cancelled' } : a)
      )
      toast.success('Appointment cancelled')
    }
    setUpdatingAptId(null)
  }

  const openRescheduleDialog = async (apt: Appointment) => {
    setRescheduleApt(apt)
    setRescheduleDate(undefined)
    setRescheduleSlot(null)
    setShowRescheduleDialog(true)

    // Fetch doctor availability, overrides, and existing bookings
    const supabase = createClient()

    const [availRes, overrideRes, bookingsRes] = await Promise.all([
      supabase
        .from('doc_availability')
        .select('*')
        .eq('doctor_id', params.id)
        .eq('is_active', true),
      supabase
        .from('doc_availability_overrides')
        .select('*')
        .eq('doctor_id', params.id)
        .gte('date', new Date().toISOString().split('T')[0]),
      supabase
        .from('doc_appointments')
        .select('*')
        .eq('doctor_id', params.id)
        .in('status', ['pending', 'confirmed'])
        .gte('appointment_date', new Date().toISOString().split('T')[0]),
    ])

    setDoctorAvailability(availRes.data || [])
    setDoctorOverrides(overrideRes.data || [])
    setExistingBookings(bookingsRes.data || [])
  }

  const getAvailableSlots = (date: Date): TimeSlot[] => {
    const dayOfWeek = date.getDay()
    const dateStr = format(date, 'yyyy-MM-dd')

    const override = doctorOverrides.find(o => o.date === dateStr)
    if (override && !override.is_available) return []

    const visitType = rescheduleApt?.visit_type || 'online'
    const dayAvailability = doctorAvailability.filter(a =>
      a.day_of_week === dayOfWeek && a.visit_type.includes(visitType)
    )

    if (dayAvailability.length === 0) return []

    const slots: TimeSlot[] = []

    dayAvailability.forEach(avail => {
      const startTime = parse(avail.start_time, 'HH:mm:ss', date)
      const endTime = parse(avail.end_time, 'HH:mm:ss', date)
      const slotDuration = avail.slot_duration

      let current = startTime
      while (isBefore(current, endTime)) {
        const slotEnd = new Date(current.getTime() + slotDuration * 60000)
        if (isAfter(slotEnd, endTime)) break

        const slotStartStr = format(current, 'HH:mm')
        const slotEndStr = format(slotEnd, 'HH:mm')

        const isBooked = existingBookings.some(apt =>
          apt.id !== rescheduleApt?.id &&
          apt.appointment_date === dateStr &&
          apt.start_time === slotStartStr + ':00'
        )

        const isPast = isSameDay(date, new Date()) && isBefore(current, new Date())

        slots.push({
          start: slotStartStr,
          end: slotEndStr,
          available: !isBooked && !isPast,
        })

        current = slotEnd
      }
    })

    return slots
  }

  const isDayAvailable = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayOfWeek = date.getDay()

    const override = doctorOverrides.find(o => o.date === dateStr)
    if (override) return override.is_available

    return doctorAvailability.some(a => a.day_of_week === dayOfWeek && a.is_active)
  }

  const handleReschedule = async () => {
    if (!rescheduleApt || !rescheduleDate || !rescheduleSlot) return

    setRescheduleLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('doc_appointments')
      .update({
        appointment_date: format(rescheduleDate, 'yyyy-MM-dd'),
        start_time: rescheduleSlot.start + ':00',
        end_time: rescheduleSlot.end + ':00',
        status: 'confirmed',
      })
      .eq('id', rescheduleApt.id)

    // Mark as rescheduled (column may not exist yet)
    await supabase
      .from('doc_appointments')
      .update({ is_rescheduled: true } as any)
      .eq('id', rescheduleApt.id)
      .then(() => {})
      .catch(() => {})

    if (error) {
      toast.error('Failed to reschedule appointment')
    } else {
      // Notify the doctor
      const rescheduleNotif = {
        doctor_id: rescheduleApt.doctor_id,
        appointment_id: rescheduleApt.id,
        type: 'in_app' as const,
        channel: 'admin_action',
        status: 'sent' as const,
        title: 'Appointment Rescheduled',
        message: `Appointment with ${rescheduleApt.patient_name} has been rescheduled to ${format(rescheduleDate, 'MMM d, yyyy')} at ${rescheduleSlot.start} by admin.`,
        is_read: false,
      }
      await supabase.from('doc_notifications').insert(rescheduleNotif)

      // Notify the patient (if registered)
      if (rescheduleApt.patient_id) {
        await supabase.from('doc_notifications').insert({
          ...rescheduleNotif,
          patient_id: rescheduleApt.patient_id,
          message: `Your appointment has been rescheduled to ${format(rescheduleDate, 'MMM d, yyyy')} at ${rescheduleSlot.start}.`,
        })
      }

      setAppointments(prev =>
        prev.map(a => a.id === rescheduleApt.id ? {
          ...a,
          appointment_date: format(rescheduleDate, 'yyyy-MM-dd'),
          start_time: rescheduleSlot.start + ':00',
          end_time: rescheduleSlot.end + ':00',
          status: 'confirmed',
        } : a)
      )
      toast.success(`Appointment rescheduled to ${format(rescheduleDate, 'MMM d, yyyy')} at ${rescheduleSlot.start}`)
      setShowRescheduleDialog(false)
    }
    setRescheduleLoading(false)
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
            <div
              className="flex justify-between cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded-md transition-colors"
              onClick={handleToggleAppointments}
            >
              <span className="text-teal-600 font-medium underline decoration-dotted underline-offset-4">
                Total Appointments
              </span>
              <div className="flex items-center gap-1">
                <span className="font-bold">{stats.totalAppointments}</span>
                {showAppointments ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
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

      {/* Appointments Table */}
      {showAppointments && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              Appointments ({appointments.length})
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAppointments(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {appointmentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No appointments found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((apt) => (
                    <TableRow key={apt.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{apt.patient_name}</p>
                          <p className="text-sm text-gray-500">{apt.patient_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {apt.patient_phone ? (
                          <span className="text-sm">{apt.patient_phone}</span>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{format(new Date(apt.appointment_date), 'MMM d, yyyy')}</p>
                          <p className="text-sm text-gray-500">
                            {apt.start_time?.slice(0, 5)} - {apt.end_time?.slice(0, 5)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {apt.visit_type === 'online' ? (
                            <Video className="h-3 w-3" />
                          ) : (
                            <MapPin className="h-3 w-3" />
                          )}
                          {apt.visit_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[apt.status] || 'bg-gray-100 text-gray-800'}>
                          {apt.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={paymentColors[apt.payment_status] || 'bg-gray-100 text-gray-800'}>
                          {apt.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">₹{apt.amount}</TableCell>
                      <TableCell>
                        {(apt.status === 'pending' || apt.status === 'confirmed') && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {apt.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 gap-1"
                                onClick={() => handleConfirmAppointment(apt)}
                                disabled={updatingAptId === apt.id}
                              >
                                {updatingAptId === apt.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                Confirm
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-blue-600 gap-1"
                              onClick={() => openRescheduleDialog(apt)}
                              disabled={updatingAptId === apt.id}
                            >
                              <CalendarClock className="h-3.5 w-3.5" />
                              Reschedule
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 gap-1"
                              onClick={() => handleCancelAppointment(apt)}
                              disabled={updatingAptId === apt.id}
                            >
                              {updatingAptId === apt.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Ban className="h-3.5 w-3.5" />
                              )}
                              Cancel
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
          </DialogHeader>
          {rescheduleApt && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium">{rescheduleApt.patient_name}</p>
                <p className="text-gray-500">
                  Current: {format(new Date(rescheduleApt.appointment_date), 'MMM d, yyyy')} at{' '}
                  {rescheduleApt.start_time?.slice(0, 5)}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Select New Date</p>
                <CalendarComponent
                  mode="single"
                  selected={rescheduleDate}
                  onSelect={(date) => {
                    setRescheduleDate(date)
                    setRescheduleSlot(null)
                  }}
                  disabled={(date) =>
                    isBefore(date, new Date(new Date().setHours(0, 0, 0, 0))) ||
                    !isDayAvailable(date)
                  }
                  className="rounded-md border mx-auto"
                />
              </div>

              {rescheduleDate && (
                <div>
                  <p className="text-sm font-medium mb-2">
                    Available Slots for {format(rescheduleDate, 'MMM d, yyyy')}
                  </p>
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {getAvailableSlots(rescheduleDate).filter(s => s.available).length === 0 ? (
                      <p className="col-span-3 text-sm text-gray-500 text-center py-4">
                        No available slots on this date
                      </p>
                    ) : (
                      getAvailableSlots(rescheduleDate)
                        .filter(s => s.available)
                        .map((slot) => (
                          <Button
                            key={slot.start}
                            size="sm"
                            variant={rescheduleSlot?.start === slot.start ? 'default' : 'outline'}
                            className={rescheduleSlot?.start === slot.start ? 'bg-teal-600 hover:bg-teal-700' : ''}
                            onClick={() => setRescheduleSlot(slot)}
                          >
                            {slot.start}
                          </Button>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={!rescheduleDate || !rescheduleSlot || rescheduleLoading}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {rescheduleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CalendarClock className="h-4 w-4 mr-2" />
              )}
              Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
