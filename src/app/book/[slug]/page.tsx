'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { format, addDays, isSameDay, isAfter, isBefore, parse } from 'date-fns'
import {
  MapPin,
  Video,
  Clock,
  DollarSign,
  Star,
  Calendar as CalendarIcon,
  Loader2,
  CheckCircle,
  User,
  Mail,
  Phone,
} from 'lucide-react'
import type { Doctor, Availability, AvailabilityOverride, Appointment } from '@/types/database'

interface TimeSlot {
  start: string
  end: string
  available: boolean
}

export default function BookingPage() {
  const { slug } = useParams()
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [availability, setAvailability] = useState<Availability[]>([])
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [visitType, setVisitType] = useState<'online' | 'physical'>('online')
  const [step, setStep] = useState<'select' | 'details' | 'payment' | 'success'>('select')
  const [submitting, setSubmitting] = useState(false)

  const [patientDetails, setPatientDetails] = useState({
    name: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    const fetchDoctor = async () => {
      const supabase = createClient()

      // Fetch doctor by slug
      const { data: doctorData, error } = await supabase
        .from('doc_doctors')
        .select('*')
        .eq('booking_slug', slug)
        .single()

      if (error || !doctorData) {
        setLoading(false)
        return
      }

      setDoctor(doctorData)

      // Fetch availability
      const { data: availData } = await supabase
        .from('doc_availability')
        .select('*')
        .eq('doctor_id', doctorData.id)
        .eq('is_active', true)

      // Fetch overrides for next 30 days
      const { data: overrideData } = await supabase
        .from('doc_availability_overrides')
        .select('*')
        .eq('doctor_id', doctorData.id)
        .gte('date', new Date().toISOString().split('T')[0])

      // Fetch existing appointments
      const { data: appointmentData } = await supabase
        .from('doc_appointments')
        .select('*')
        .eq('doctor_id', doctorData.id)
        .in('status', ['pending', 'confirmed'])
        .gte('appointment_date', new Date().toISOString().split('T')[0])

      setAvailability(availData || [])
      setOverrides(overrideData || [])
      setAppointments(appointmentData || [])
      setLoading(false)
    }

    if (slug) {
      fetchDoctor()
    }
  }, [slug])

  const getAvailableSlots = (date: Date): TimeSlot[] => {
    const dayOfWeek = date.getDay()
    const dateStr = format(date, 'yyyy-MM-dd')

    // Check for override
    const override = overrides.find(o => o.date === dateStr)
    if (override && !override.is_available) {
      return []
    }

    // Get regular availability for this day
    const dayAvailability = availability.filter(a =>
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

        // Check if slot is already booked
        const isBooked = appointments.some(apt =>
          apt.appointment_date === dateStr &&
          apt.start_time === slotStartStr + ':00'
        )

        // Check if slot is in the past (for today)
        const isPast = isSameDay(date, new Date()) &&
          isBefore(current, new Date())

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

    // Check override
    const override = overrides.find(o => o.date === dateStr)
    if (override) {
      return override.is_available
    }

    // Check regular availability
    return availability.some(a => a.day_of_week === dayOfWeek && a.is_active)
  }

  const handleBooking = async () => {
    if (!doctor || !selectedDate || !selectedSlot) return

    setSubmitting(true)

    try {
      const supabase = createClient()
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const dayOfWeek = selectedDate.getDay()

      // SERVER-SIDE VALIDATION: Re-fetch and validate availability before booking

      // 1. Check for holiday/override on this date (using array query instead of .single())
      const { data: overrideData, error: overrideError } = await supabase
        .from('doc_availability_overrides')
        .select('*')
        .eq('doctor_id', doctor.id)
        .eq('date', dateStr)

      if (overrideError) {
        console.error('Error checking override:', overrideError)
        alert('Unable to verify availability. Please try again.')
        setSubmitting(false)
        return
      }

      const override = overrideData?.[0]

      // If there's an override marking this day as unavailable (holiday), block booking
      if (override && !override.is_available) {
        alert('Sorry, this date is marked as a holiday. The doctor is not available.')
        setSelectedDate(undefined)
        setSelectedSlot(null)
        setStep('select')
        setSubmitting(false)
        return
      }

      // 2. Check regular availability for this day of week
      const { data: availData, error: availError } = await supabase
        .from('doc_availability')
        .select('*')
        .eq('doctor_id', doctor.id)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)

      if (availError) {
        console.error('Error checking availability:', availError)
        alert('Unable to verify availability. Please try again.')
        setSubmitting(false)
        return
      }

      // If there's no override making this day available, check regular schedule
      const hasOverrideWorkingDay = override?.is_available === true

      if (!hasOverrideWorkingDay) {
        // Check if the selected slot falls within any availability window for this day
        const hasValidSlot = availData && availData.length > 0 && availData.some((a: Availability) =>
          a.visit_type.includes(visitType) &&
          a.start_time <= selectedSlot.start + ':00' &&
          a.end_time >= selectedSlot.end + ':00'
        )

        if (!hasValidSlot) {
          alert('Sorry, this time slot is no longer available. The doctor may have changed their schedule.')
          setSelectedSlot(null)
          setStep('select')
          setSubmitting(false)
          return
        }
      }

      // 3. Check if slot is already booked (race condition protection)
      const { data: existingBookings, error: bookingError } = await supabase
        .from('doc_appointments')
        .select('id')
        .eq('doctor_id', doctor.id)
        .eq('appointment_date', dateStr)
        .eq('start_time', selectedSlot.start + ':00')
        .in('status', ['pending', 'confirmed'])

      if (bookingError) {
        console.error('Error checking existing bookings:', bookingError)
        alert('Unable to verify slot availability. Please try again.')
        setSubmitting(false)
        return
      }

      if (existingBookings && existingBookings.length > 0) {
        alert('Sorry, this slot was just booked by someone else. Please select a different time.')
        setSelectedSlot(null)
        // Refresh appointments list
        const { data: refreshedAppointments } = await supabase
          .from('doc_appointments')
          .select('*')
          .eq('doctor_id', doctor.id)
          .in('status', ['pending', 'confirmed'])
          .gte('appointment_date', new Date().toISOString().split('T')[0])
        setAppointments(refreshedAppointments || [])
        setSubmitting(false)
        return
      }

      // All validations passed - proceed with booking
      const fee = visitType === 'online' ? doctor.online_fee : doctor.consultation_fee

      const { data, error } = await supabase
        .from('doc_appointments')
        .insert({
          doctor_id: doctor.id,
          patient_name: patientDetails.name,
          patient_email: patientDetails.email,
          patient_phone: patientDetails.phone || null,
          appointment_date: dateStr,
          start_time: selectedSlot.start + ':00',
          end_time: selectedSlot.end + ':00',
          visit_type: visitType,
          amount: fee || 0,
          status: 'pending',
          payment_status: 'pending',
        })
        .select()
        .single()

      if (error) throw error

      // Create Zoom meeting for online appointments
      let meetingLink = null
      if (visitType === 'online' && data) {
        try {
          const meetingResponse = await fetch('/api/zoom/create-meeting', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              appointmentId: data.id,
            }),
          })

          if (meetingResponse.ok) {
            const meetingData = await meetingResponse.json()
            meetingLink = meetingData.meeting_link

            // Schedule Recall.ai bot to join the meeting
            if (meetingLink) {
              try {
                await fetch('/api/recall/schedule-bot', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    appointmentId: data.id,
                  }),
                })
                console.log('Recall bot scheduled successfully')
              } catch (recallError) {
                // Don't fail the booking if Recall bot scheduling fails
                console.error('Failed to schedule Recall bot:', recallError)
              }
            }

            // Send meeting link via Email and WhatsApp
            if (meetingLink) {
              try {
                await fetch('/api/notifications/send-meeting-link', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    appointmentId: data.id,
                    patientName: patientDetails.name,
                    patientEmail: patientDetails.email,
                    patientPhone: patientDetails.phone || null,
                    doctorName: doctor.full_name,
                    appointmentDate: format(selectedDate, 'EEEE, MMMM d, yyyy'),
                    startTime: `${selectedSlot.start} - ${selectedSlot.end}`,
                    meetingLink: meetingLink,
                    doctorId: doctor.id,
                  }),
                })
              } catch (notifyError) {
                console.error('Failed to send meeting link notification:', notifyError)
              }
            }
          } else {
            console.log('Zoom meeting creation failed, will use standard link or send later')
          }
        } catch (zoomError) {
          // Don't fail the booking if Zoom meeting creation fails
          console.error('Zoom meeting creation failed:', zoomError)
        }
      }

      // Send WhatsApp confirmation for all appointments (with or without meeting link)
      if (patientDetails.phone) {
        try {
          await fetch('/api/notifications/booking-confirmation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              patientName: patientDetails.name,
              patientPhone: patientDetails.phone,
              doctorName: doctor.full_name,
              appointmentDate: format(selectedDate, 'EEEE, MMMM d, yyyy'),
              appointmentTime: `${selectedSlot.start} - ${selectedSlot.end}`,
              visitType: visitType === 'online' ? 'Online Consultation' : 'Physical Visit',
            }),
          })
        } catch (whatsappError) {
          // Don't fail the booking if WhatsApp fails, just log it
          console.error('WhatsApp confirmation failed:', whatsappError)
        }
      }

      setStep('success')
    } catch (error) {
      console.error('Booking error:', error)
      alert('Failed to book appointment. Please try again.')
    } finally {
      setSubmitting(false)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Doctor Not Found</h2>
            <p className="text-gray-500">
              The booking link you followed is invalid or the doctor is no longer available.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Appointment Booked Successfully!</h2>
            <p className="text-gray-600 mb-6">
              Your appointment has been booked with <strong>Dr. {doctor.full_name}</strong>
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left mb-6">
              <div className="space-y-2">
                <p className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-green-600" />
                  <span><strong>Date:</strong> {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  <span><strong>Time:</strong> {selectedSlot?.start} - {selectedSlot?.end}</span>
                </p>
                <p className="flex items-center gap-2">
                  {visitType === 'online' ? (
                    <Video className="h-4 w-4 text-green-600" />
                  ) : (
                    <MapPin className="h-4 w-4 text-green-600" />
                  )}
                  <span><strong>Type:</strong> {visitType === 'online' ? 'Online Consultation' : 'Physical Visit'}</span>
                </p>
              </div>
            </div>
            {visitType === 'online' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 text-sm flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  <span>The Zoom meeting link will be shared with you <strong>15 minutes before</strong> your appointment.</span>
                </p>
              </div>
            )}
            <p className="text-sm text-gray-500">
              A confirmation has been sent to your email. Please check your inbox for further details.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const availableSlots = selectedDate ? getAvailableSlots(selectedDate) : []

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Doctor Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={doctor.profile_image || ''} />
                <AvatarFallback className="bg-green-600 text-white text-2xl">
                  {getInitials(doctor.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{doctor.full_name}</h1>
                {doctor.specialization && (
                  <p className="text-gray-600">{doctor.specialization}</p>
                )}
                {doctor.qualification && (
                  <p className="text-sm text-gray-500">{doctor.qualification}</p>
                )}
                {doctor.experience_years && (
                  <p className="text-sm text-gray-500">{doctor.experience_years} years experience</p>
                )}
                {doctor.clinic_name && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-2">
                    <MapPin className="h-4 w-4" />
                    {doctor.clinic_name}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {doctor.online_fee && (
                  <Badge variant="outline" className="gap-1">
                    <Video className="h-3 w-3" />
                    Online: ${doctor.online_fee}
                  </Badge>
                )}
                {doctor.consultation_fee && (
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    Physical: ${doctor.consultation_fee}
                  </Badge>
                )}
              </div>
            </div>
            {doctor.bio && (
              <p className="mt-4 text-gray-600 text-sm">{doctor.bio}</p>
            )}
          </CardContent>
        </Card>

        {step === 'select' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visit Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Visit Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant={visitType === 'online' ? 'default' : 'outline'}
                  className={`w-full justify-start gap-3 ${visitType === 'online' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  onClick={() => setVisitType('online')}
                >
                  <Video className="h-5 w-5" />
                  <div className="text-left">
                    <p>Online Consultation</p>
                    {doctor.online_fee && (
                      <p className="text-sm opacity-75">${doctor.online_fee}</p>
                    )}
                  </div>
                </Button>
                <Button
                  variant={visitType === 'physical' ? 'default' : 'outline'}
                  className={`w-full justify-start gap-3 ${visitType === 'physical' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  onClick={() => setVisitType('physical')}
                >
                  <MapPin className="h-5 w-5" />
                  <div className="text-left">
                    <p>Physical Visit</p>
                    {doctor.consultation_fee && (
                      <p className="text-sm opacity-75">${doctor.consultation_fee}</p>
                    )}
                  </div>
                </Button>
              </CardContent>
            </Card>

            {/* Calendar */}
            <Card>
              <CardHeader>
                <CardTitle>Select Date</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) =>
                    isBefore(date, new Date()) || !isDayAvailable(date)
                  }
                  className="rounded-md border mx-auto"
                />
              </CardContent>
            </Card>

            {/* Time Slots */}
            {selectedDate && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>
                    Available Slots for {format(selectedDate, 'MMMM d, yyyy')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {availableSlots.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No available slots for this date. Please select another date.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot.start}
                          variant={selectedSlot?.start === slot.start ? 'default' : 'outline'}
                          className={`
                            ${!slot.available && 'opacity-50 cursor-not-allowed'}
                            ${selectedSlot?.start === slot.start ? 'bg-green-600 hover:bg-green-700' : ''}
                          `}
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {slot.start}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Continue Button */}
            {selectedSlot && (
              <div className="md:col-span-2">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => setStep('details')}
                >
                  Continue to Details
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'details' && (
          <Card>
            <CardHeader>
              <CardTitle>Your Details</CardTitle>
              <CardDescription>Please provide your information for the appointment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <CalendarIcon className="h-4 w-4" />
                <AlertDescription>
                  <strong>{format(selectedDate!, 'MMMM d, yyyy')}</strong> at{' '}
                  <strong>{selectedSlot?.start} - {selectedSlot?.end}</strong> ({visitType})
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={patientDetails.name}
                      onChange={(e) => setPatientDetails(p => ({ ...p, name: e.target.value }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={patientDetails.email}
                      onChange={(e) => setPatientDetails(p => ({ ...p, email: e.target.value }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      placeholder="+1 234 567 8900"
                      value={patientDetails.phone}
                      onChange={(e) => setPatientDetails(p => ({ ...p, phone: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep('select')}>
                  Back
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleBooking}
                  disabled={!patientDetails.name || !patientDetails.email || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      Book Appointment - ${visitType === 'online' ? doctor.online_fee : doctor.consultation_fee}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
