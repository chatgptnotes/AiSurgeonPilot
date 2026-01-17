'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Mail,
  Phone,
  Clock,
  Video,
  MapPin,
  AlertCircle,
} from 'lucide-react'
import type { Appointment } from '@/types/database'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
}

interface PatientInfo {
  name: string
  email: string
  phone: string | null
}

export default function PatientByEmailPage() {
  const params = useParams()
  const router = useRouter()
  const patientEmail = decodeURIComponent(params.email as string)
  const { doctor, isLoading: authLoading } = useAuth()

  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!doctor || !patientEmail) return

      const supabase = createClient()

      // Fetch all appointments for this patient email with this doctor
      const { data: appointmentsData, error } = await supabase
        .from('doc_appointments')
        .select('*')
        .eq('doctor_id', doctor.id)
        .ilike('patient_email', patientEmail)
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false })

      if (error) {
        toast.error('Failed to load patient data')
        router.push('/patients')
        return
      }

      if (!appointmentsData || appointmentsData.length === 0) {
        toast.error('Patient not found')
        router.push('/patients')
        return
      }

      // Get the most recent appointment info for patient details
      const latestAppointment = appointmentsData[0]
      setPatientInfo({
        name: latestAppointment.patient_name,
        email: latestAppointment.patient_email,
        phone: latestAppointment.patient_phone,
      })

      setAppointments(appointmentsData)
      setLoading(false)
    }

    if (doctor) {
      fetchPatientData()
    }
  }, [doctor, patientEmail, router])

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    return parts.map(p => p[0] || '').join('').toUpperCase().slice(0, 2)
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    )
  }

  if (!patientInfo) {
    return null
  }

  const completedAppointments = appointments.filter(a => a.status === 'completed')
  const upcomingAppointments = appointments.filter(a => a.status === 'confirmed' || a.status === 'pending')
  const totalSpent = appointments
    .filter(a => a.payment_status === 'paid')
    .reduce((sum, a) => sum + (a.amount || 0), 0)

  return (
    <div>
      <Header title="Patient Profile" />

      <div className="p-6 space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.push('/patients')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Patients
        </Button>

        {/* Notice Banner */}
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Limited Patient Information</p>
              <p className="text-sm text-amber-700">
                This patient hasn&apos;t created a full profile yet. Only appointment information is available.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Patient Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="bg-green-100 text-green-700 text-2xl">
                  {getInitials(patientInfo.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold">{patientInfo.name}</h1>
                  <Badge variant="outline" className="bg-gray-50">
                    Not Registered
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{patientInfo.email}</span>
                  </div>
                  {patientInfo.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{patientInfo.phone}</span>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="bg-gray-50 px-4 py-2 rounded-lg">
                    <p className="text-sm text-gray-500">Total Appointments</p>
                    <p className="text-xl font-bold">{appointments.length}</p>
                  </div>
                  <div className="bg-gray-50 px-4 py-2 rounded-lg">
                    <p className="text-sm text-gray-500">Completed</p>
                    <p className="text-xl font-bold">{completedAppointments.length}</p>
                  </div>
                  <div className="bg-gray-50 px-4 py-2 rounded-lg">
                    <p className="text-sm text-gray-500">Upcoming</p>
                    <p className="text-xl font-bold">{upcomingAppointments.length}</p>
                  </div>
                  <div className="bg-gray-50 px-4 py-2 rounded-lg">
                    <p className="text-sm text-gray-500">Total Paid</p>
                    <p className="text-xl font-bold">${totalSpent}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Appointment History ({appointments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {appointments.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No appointments found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((apt) => (
                    <TableRow key={apt.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {format(new Date(apt.appointment_date), 'MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-gray-500">
                            {apt.start_time} - {apt.end_time}
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
                        <Badge className={statusColors[apt.status]}>{apt.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={apt.payment_status === 'paid' ? 'default' : 'outline'}>
                          {apt.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>${apt.amount}</TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500 truncate max-w-[200px] block">
                          {apt.notes || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
