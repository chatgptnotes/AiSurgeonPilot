'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Search, Filter, Video, MapPin, Check, X, Clock, Loader2, Link as LinkIcon, Mail, MessageCircle } from 'lucide-react'
import type { Appointment } from '@/types/database'

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

export default function AppointmentsPage() {
  const { doctor, isLoading: authLoading } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [meetingLink, setMeetingLink] = useState('')
  const [showMeetingDialog, setShowMeetingDialog] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!doctor) return

      const supabase = createClient()

      const { data, error } = await supabase
        .from('doc_appointments')
        .select('*')
        .eq('doctor_id', doctor.id)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) {
        toast.error('Failed to load appointments')
        return
      }

      setAppointments(data || [])
      setLoading(false)
    }

    if (doctor) {
      fetchAppointments()
    }
  }, [doctor])

  const updateAppointmentStatus = async (id: string, status: string) => {
    setUpdating(true)
    const supabase = createClient()

    // Find the appointment
    const appointment = appointments.find(apt => apt.id === id)

    // If confirming an online appointment, include the meeting link and send notifications
    if (status === 'confirmed' && appointment?.visit_type === 'online' && doctor?.standard_meeting_link) {
      const { error } = await supabase
        .from('doc_appointments')
        .update({
          status,
          meeting_link: doctor.standard_meeting_link
        })
        .eq('id', id)

      if (error) {
        setUpdating(false)
        toast.error('Failed to update status')
        return
      }

      // Send meeting link via Email and WhatsApp
      try {
        const response = await fetch('/api/notifications/send-meeting-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: id,
            patientName: appointment.patient_name,
            patientEmail: appointment.patient_email,
            patientPhone: appointment.patient_phone,
            doctorName: doctor.full_name,
            appointmentDate: format(new Date(appointment.appointment_date), 'MMMM d, yyyy'),
            startTime: appointment.start_time,
            meetingLink: doctor.standard_meeting_link,
            doctorId: doctor.id,
          }),
        })

        const result = await response.json()

        if (result.success) {
          const notifications = []
          if (result.results.email.success) notifications.push('Email')
          if (result.results.whatsapp.success) notifications.push('WhatsApp')

          if (notifications.length > 0) {
            toast.success(`Appointment confirmed! Meeting link sent via ${notifications.join(' & ')}`)
          } else {
            toast.success('Appointment confirmed! (Notifications may have failed)')
          }
        }
      } catch (notifyError) {
        console.error('Notification error:', notifyError)
        toast.success('Appointment confirmed! (Failed to send notifications)')
      }

      setAppointments(prev =>
        prev.map(apt => apt.id === id ? {
          ...apt,
          status: status as Appointment['status'],
          meeting_link: doctor.standard_meeting_link
        } : apt)
      )
      setUpdating(false)
      return
    }

    // Default update for non-online or non-confirm actions
    const { error } = await supabase
      .from('doc_appointments')
      .update({ status })
      .eq('id', id)

    setUpdating(false)

    if (error) {
      toast.error('Failed to update status')
      return
    }

    setAppointments(prev =>
      prev.map(apt => apt.id === id ? { ...apt, status: status as Appointment['status'] } : apt)
    )
    toast.success(`Appointment ${status}`)
  }

  const addMeetingLink = async () => {
    if (!selectedAppointment || !meetingLink) return

    setUpdating(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('doc_appointments')
      .update({ meeting_link: meetingLink })
      .eq('id', selectedAppointment.id)

    setUpdating(false)

    if (error) {
      toast.error('Failed to add meeting link')
      return
    }

    setAppointments(prev =>
      prev.map(apt =>
        apt.id === selectedAppointment.id ? { ...apt, meeting_link: meetingLink } : apt
      )
    )
    setShowMeetingDialog(false)
    setMeetingLink('')
    toast.success('Meeting link added')
  }

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch =
      apt.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.patient_email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const todayAppointments = filteredAppointments.filter(
    apt => apt.appointment_date === new Date().toISOString().split('T')[0]
  )

  const upcomingAppointments = filteredAppointments.filter(
    apt => apt.appointment_date > new Date().toISOString().split('T')[0]
  )

  const pastAppointments = filteredAppointments.filter(
    apt => apt.appointment_date < new Date().toISOString().split('T')[0]
  )

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    )
  }

  const AppointmentRow = ({ appointment }: { appointment: Appointment }) => (
    <TableRow key={appointment.id}>
      <TableCell>
        <div>
          <p className="font-medium">{appointment.patient_name}</p>
          <p className="text-sm text-gray-500">{appointment.patient_email}</p>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <p>{format(new Date(appointment.appointment_date), 'MMM d, yyyy')}</p>
          <p className="text-sm text-gray-500">
            {appointment.start_time} - {appointment.end_time}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="gap-1">
          {appointment.visit_type === 'online' ? (
            <Video className="h-3 w-3" />
          ) : (
            <MapPin className="h-3 w-3" />
          )}
          {appointment.visit_type}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className={statusColors[appointment.status]}>
          {appointment.status}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className={paymentColors[appointment.payment_status]}>
          {appointment.payment_status}
        </Badge>
      </TableCell>
      <TableCell>${appointment.amount}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {appointment.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-green-600"
                onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                disabled={updating}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600"
                onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                disabled={updating}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
          {appointment.visit_type === 'online' && appointment.status === 'confirmed' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedAppointment(appointment)
                setMeetingLink(appointment.meeting_link || '')
                setShowMeetingDialog(true)
              }}
            >
              <LinkIcon className="h-4 w-4 mr-1" />
              {appointment.meeting_link ? 'Edit Link' : 'Add Link'}
            </Button>
          )}
          {appointment.status === 'confirmed' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
              disabled={updating}
            >
              Complete
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )

  return (
    <div>
      <Header title="Appointments" />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by patient name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Appointments Tabs */}
        <Tabs defaultValue="today" className="space-y-4">
          <TabsList>
            <TabsTrigger value="today">
              Today ({todayAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({filteredAppointments.length})
            </TabsTrigger>
          </TabsList>

          {['today', 'upcoming', 'past', 'all'].map(tab => (
            <TabsContent key={tab} value={tab}>
              <Card>
                <CardContent className="p-0">
                  {(tab === 'today' ? todayAppointments :
                    tab === 'upcoming' ? upcomingAppointments :
                    tab === 'past' ? pastAppointments :
                    filteredAppointments
                  ).length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">No appointments found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Patient</TableHead>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(tab === 'today' ? todayAppointments :
                          tab === 'upcoming' ? upcomingAppointments :
                          tab === 'past' ? pastAppointments :
                          filteredAppointments
                        ).map(apt => (
                          <AppointmentRow key={apt.id} appointment={apt} />
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Meeting Link Dialog */}
        <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Meeting Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Meeting Link (Zoom, Google Meet, etc.)</Label>
                <Input
                  placeholder="https://zoom.us/j/..."
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                />
              </div>
              <p className="text-sm text-gray-500">
                This link will be sent to the patient 5 minutes before the appointment.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMeetingDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={addMeetingLink}
                disabled={updating || !meetingLink}
                className="bg-green-600 hover:bg-green-700"
              >
                {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Link'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
