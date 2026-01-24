'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { Plus, Trash2, Loader2, Clock, Save, Users, CalendarDays } from 'lucide-react'
import type { Availability, AvailabilityOverride, Appointment } from '@/types/database'

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
]

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0')
  return [`${hour}:00`, `${hour}:30`]
}).flat()

const SLOT_DURATIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '60 minutes' },
]

interface TimeSlot {
  id?: string              // For existing slots (from DB)
  start_time: string
  end_time: string
  slot_duration: number
  visit_type: string[]
}

interface DaySchedule {
  day_of_week: number
  is_active: boolean
  time_slots: TimeSlot[]   // Array of multiple time windows
}

export default function CalendarPage() {
  const { doctor, isLoading: authLoading } = useAuth()
  const [availability, setAvailability] = useState<Availability[]>([])
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())
  const [showOverrideDialog, setShowOverrideDialog] = useState(false)

  const [schedules, setSchedules] = useState<DaySchedule[]>(
    DAYS_OF_WEEK.map((_, index) => ({
      day_of_week: index,
      is_active: index > 0 && index < 6, // Mon-Fri active by default
      time_slots: [{
        start_time: '09:00',
        end_time: '17:00',
        slot_duration: 30,
        visit_type: ['online', 'physical'],
      }],
    }))
  )

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!doctor) {
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()

        // Get the first and last day of the calendar month for appointment fetching
        const monthStart = startOfMonth(calendarMonth)
        const monthEnd = endOfMonth(calendarMonth)

        const { data: availData, error: availError } = await supabase
          .from('doc_availability')
          .select('*')
          .eq('doctor_id', doctor.id)

        const { data: overrideData, error: overrideError } = await supabase
          .from('doc_availability_overrides')
          .select('*')
          .eq('doctor_id', doctor.id)
          .gte('date', new Date().toISOString().split('T')[0])

        // Fetch appointments for the displayed month
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('doc_appointments')
          .select('*')
          .eq('doctor_id', doctor.id)
          .gte('appointment_date', format(monthStart, 'yyyy-MM-dd'))
          .lte('appointment_date', format(monthEnd, 'yyyy-MM-dd'))

        if (appointmentsError) {
          console.error('Error fetching appointments:', appointmentsError)
        }

        if (appointmentsData) {
          setAppointments(appointmentsData)
        }

        if (availError) {
          console.error('Error fetching availability:', availError)
        }
        if (overrideError) {
          console.error('Error fetching overrides:', overrideError)
        }

        if (availData && availData.length > 0) {
          setAvailability(availData)
          // Create fresh schedules with empty time_slots
          const newSchedules: DaySchedule[] = DAYS_OF_WEEK.map((_, index) => ({
            day_of_week: index,
            is_active: false,
            time_slots: [] as TimeSlot[],
          }))

          // Group availability records by day_of_week
          availData.forEach((avail: Availability) => {
            newSchedules[avail.day_of_week].is_active = true
            newSchedules[avail.day_of_week].time_slots.push({
              id: avail.id,
              start_time: avail.start_time,
              end_time: avail.end_time,
              slot_duration: avail.slot_duration,
              visit_type: avail.visit_type,
            })
          })

          // Add default empty slot for days with no data
          newSchedules.forEach(day => {
            if (day.time_slots.length === 0) {
              day.time_slots = [{
                start_time: '09:00',
                end_time: '17:00',
                slot_duration: 30,
                visit_type: ['online', 'physical'],
              }]
            }
          })

          setSchedules(newSchedules)
        }

        if (overrideData) {
          setOverrides(overrideData)
        }
      } catch (error) {
        console.error('Error in fetchAvailability:', error)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchAvailability()
    }
  }, [doctor, authLoading, calendarMonth])

  const handleDayToggle = (dayIndex: number, checked: boolean) => {
    setSchedules(prev => {
      const newSchedules = [...prev]
      newSchedules[dayIndex] = {
        ...newSchedules[dayIndex],
        is_active: checked,
      }
      return newSchedules
    })
  }

  const addTimeSlot = (dayIndex: number) => {
    setSchedules(prev => {
      const newSchedules = [...prev]
      newSchedules[dayIndex] = {
        ...newSchedules[dayIndex],
        time_slots: [
          ...newSchedules[dayIndex].time_slots,
          {
            start_time: '09:00',
            end_time: '17:00',
            slot_duration: 30,
            visit_type: ['online', 'physical'],
          },
        ],
      }
      return newSchedules
    })
  }

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    setSchedules(prev => {
      const newSchedules = [...prev]
      const newSlots = newSchedules[dayIndex].time_slots.filter((_, i) => i !== slotIndex)
      // Ensure at least one slot remains
      if (newSlots.length === 0) {
        newSlots.push({
          start_time: '09:00',
          end_time: '17:00',
          slot_duration: 30,
          visit_type: ['online', 'physical'],
        })
      }
      newSchedules[dayIndex] = {
        ...newSchedules[dayIndex],
        time_slots: newSlots,
      }
      return newSchedules
    })
  }

  const handleSlotChange = (
    dayIndex: number,
    slotIndex: number,
    field: keyof TimeSlot,
    value: unknown
  ) => {
    setSchedules(prev => {
      const newSchedules = [...prev]
      const newSlots = [...newSchedules[dayIndex].time_slots]
      newSlots[slotIndex] = {
        ...newSlots[slotIndex],
        [field]: value,
      }
      newSchedules[dayIndex] = {
        ...newSchedules[dayIndex],
        time_slots: newSlots,
      }
      return newSchedules
    })
  }

  const handleVisitTypeChange = (
    dayIndex: number,
    slotIndex: number,
    type: string,
    checked: boolean
  ) => {
    setSchedules(prev => {
      const newSchedules = [...prev]
      const newSlots = [...newSchedules[dayIndex].time_slots]
      const currentTypes = newSlots[slotIndex].visit_type
      if (checked) {
        newSlots[slotIndex] = {
          ...newSlots[slotIndex],
          visit_type: [...currentTypes, type],
        }
      } else {
        newSlots[slotIndex] = {
          ...newSlots[slotIndex],
          visit_type: currentTypes.filter(t => t !== type),
        }
      }
      newSchedules[dayIndex] = {
        ...newSchedules[dayIndex],
        time_slots: newSlots,
      }
      return newSchedules
    })
  }

  const handleSaveAvailability = async () => {
    if (!doctor) return

    // Validate time slots before saving
    for (const schedule of schedules) {
      if (!schedule.is_active) continue

      for (const slot of schedule.time_slots) {
        // Check for empty times
        if (!slot.start_time || !slot.end_time) {
          toast.error('Invalid time slot', {
            description: `${DAYS_OF_WEEK[schedule.day_of_week]}: Please set both start and end times`
          })
          return
        }

        // Check that start time is before end time
        if (slot.start_time >= slot.end_time) {
          toast.error('Invalid time range', {
            description: `${DAYS_OF_WEEK[schedule.day_of_week]}: End time (${slot.end_time}) must be after start time (${slot.start_time})`
          })
          return
        }

        // Check that at least one visit type is selected
        if (!slot.visit_type || slot.visit_type.length === 0) {
          toast.error('Invalid visit type', {
            description: `${DAYS_OF_WEEK[schedule.day_of_week]}: Please select at least one visit type (Online or Physical)`
          })
          return
        }
      }
    }

    setSaving(true)
    const supabase = createClient()

    // Delete existing availability
    await supabase
      .from('doc_availability')
      .delete()
      .eq('doctor_id', doctor.id)

    // Flatten nested structure back to DB format
    const availabilityData = schedules
      .filter(s => s.is_active)
      .flatMap(s => s.time_slots.map(slot => ({
        doctor_id: doctor.id,
        day_of_week: s.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        slot_duration: slot.slot_duration,
        is_active: true,
        visit_type: slot.visit_type,
      })))

    const { error } = await supabase
      .from('doc_availability')
      .insert(availabilityData)

    setSaving(false)

    if (error) {
      toast.error('Failed to save availability', { description: error.message })
      return
    }

    toast.success('Availability saved successfully')
  }

  const addDateOverride = async (date: Date, isAvailable: boolean) => {
    if (!doctor) return

    const supabase = createClient()
    const dateStr = format(date, 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('doc_availability_overrides')
      .upsert({
        doctor_id: doctor.id,
        date: dateStr,
        is_available: isAvailable,
      })
      .select()
      .single()

    if (error) {
      toast.error('Failed to add override', { description: error.message })
      return
    }

    setOverrides(prev => [...prev.filter(o => o.date !== dateStr), data])
    setShowOverrideDialog(false)
    toast.success(isAvailable ? 'Working day added' : 'Holiday added')
  }

  const removeOverride = async (id: string) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('doc_availability_overrides')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to remove override')
      return
    }

    setOverrides(prev => prev.filter(o => o.id !== id))
    toast.success('Override removed')
  }

  // Helper function to get appointments for a specific date
  const getAppointmentsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return appointments.filter(apt => apt.appointment_date === dateStr)
  }

  // Helper function to calculate total slots for a date
  const getTotalSlotsForDate = (date: Date) => {
    const dayOfWeek = date.getDay()
    const dateStr = format(date, 'yyyy-MM-dd')

    // Check for override first
    const override = overrides.find(o => o.date === dateStr)
    if (override && !override.is_available) {
      return 0 // Holiday
    }

    const daySchedule = schedules[dayOfWeek]
    if (!daySchedule.is_active && !override?.is_available) {
      return 0 // Not a working day
    }

    // Calculate slots from time windows
    let totalSlots = 0
    for (const slot of daySchedule.time_slots) {
      const [startHour, startMin] = slot.start_time.split(':').map(Number)
      const [endHour, endMin] = slot.end_time.split(':').map(Number)
      const startMinutes = startHour * 60 + startMin
      const endMinutes = endHour * 60 + endMin
      const duration = slot.slot_duration || 30
      totalSlots += Math.floor((endMinutes - startMinutes) / duration)
    }
    return totalSlots
  }

  // Helper function to get available slots (total - booked)
  const getAvailableSlotsForDate = (date: Date) => {
    const total = getTotalSlotsForDate(date)
    const booked = getAppointmentsForDate(date).filter(
      apt => apt.status !== 'cancelled'
    ).length
    return Math.max(0, total - booked)
  }

  // Get date info for the calendar display
  const getDateInfo = (date: Date) => {
    const dayAppointments = getAppointmentsForDate(date)
    const confirmedAppointments = dayAppointments.filter(apt => apt.status !== 'cancelled')
    const totalSlots = getTotalSlotsForDate(date)
    const availableSlots = getAvailableSlotsForDate(date)

    return {
      appointments: confirmedAppointments.length,
      totalSlots,
      availableSlots,
      patients: new Set(dayAppointments.map(apt => apt.patient_email)).size,
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    )
  }

  return (
    <div>
      <Header title="Calendar & Availability" />

      <div className="p-6 space-y-6">
        {/* Weekly Schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Weekly Schedule</CardTitle>
            <Button
              onClick={handleSaveAvailability}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Schedule
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {schedules.map((schedule, dayIndex) => (
                <div
                  key={dayIndex}
                  className="p-4 rounded-lg border bg-gray-50 space-y-3"
                >
                  {/* Day header with toggle */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={schedule.is_active}
                      onCheckedChange={(checked) => handleDayToggle(dayIndex, checked)}
                    />
                    <Label className="font-medium w-28">{DAYS_OF_WEEK[dayIndex]}</Label>
                    {schedule.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addTimeSlot(dayIndex)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Slot
                      </Button>
                    )}
                  </div>

                  {/* Time slots */}
                  {schedule.is_active ? (
                    <div className="space-y-2 ml-6">
                      {schedule.time_slots.map((slot, slotIndex) => (
                        <div
                          key={slotIndex}
                          className="flex items-center gap-2 flex-wrap p-2 bg-white rounded border"
                        >
                          {/* Time selectors */}
                          <Clock className="h-4 w-4 text-gray-400" />
                          <Select
                            value={slot.start_time}
                            onValueChange={(value) =>
                              handleSlotChange(dayIndex, slotIndex, 'start_time', value)
                            }
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map(time => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-gray-400">to</span>
                          <Select
                            value={slot.end_time}
                            onValueChange={(value) =>
                              handleSlotChange(dayIndex, slotIndex, 'end_time', value)
                            }
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map(time => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Slot duration */}
                          <Select
                            value={slot.slot_duration.toString()}
                            onValueChange={(value) =>
                              handleSlotChange(dayIndex, slotIndex, 'slot_duration', parseInt(value))
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SLOT_DURATIONS.map(({ value, label }) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Visit type checkboxes */}
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`online-${dayIndex}-${slotIndex}`}
                              checked={slot.visit_type.includes('online')}
                              onCheckedChange={(checked) =>
                                handleVisitTypeChange(dayIndex, slotIndex, 'online', checked as boolean)
                              }
                            />
                            <Label htmlFor={`online-${dayIndex}-${slotIndex}`} className="text-sm">Online</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`physical-${dayIndex}-${slotIndex}`}
                              checked={slot.visit_type.includes('physical')}
                              onCheckedChange={(checked) =>
                                handleVisitTypeChange(dayIndex, slotIndex, 'physical', checked as boolean)
                              }
                            />
                            <Label htmlFor={`physical-${dayIndex}-${slotIndex}`} className="text-sm">Physical</Label>
                          </div>

                          {/* Remove button (show if more than 1 slot) */}
                          {schedule.time_slots.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeTimeSlot(dayIndex, slotIndex)}
                              className="ml-auto"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm ml-6">Not available</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Date Overrides */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Date Overrides</CardTitle>
              <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Override
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Date Override</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border mx-auto"
                    />
                    {selectedDate && (
                      <div className="flex gap-2 justify-center">
                        <Button
                          variant="outline"
                          onClick={() => addDateOverride(selectedDate, false)}
                          className="text-red-600"
                        >
                          Mark as Holiday
                        </Button>
                        <Button
                          onClick={() => addDateOverride(selectedDate, true)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Mark as Working
                        </Button>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {overrides.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No date overrides set. Add holidays or special working days.
                </p>
              ) : (
                <div className="space-y-2">
                  {overrides.map((override) => (
                    <div
                      key={override.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={override.is_available ? 'default' : 'destructive'}>
                          {override.is_available ? 'Working' : 'Holiday'}
                        </Badge>
                        <span>{format(new Date(override.date), 'EEEE, MMMM d, yyyy')}</span>
                        {override.reason && (
                          <span className="text-gray-500 text-sm">({override.reason})</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOverride(override.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Calendar Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                className="rounded-md border mx-auto"
                modifiers={{
                  holiday: overrides
                    .filter(o => !o.is_available)
                    .map(o => new Date(o.date)),
                  working: overrides
                    .filter(o => o.is_available)
                    .map(o => new Date(o.date)),
                  hasAppointments: appointments
                    .filter(apt => apt.status !== 'cancelled')
                    .map(apt => new Date(apt.appointment_date)),
                }}
                modifiersClassNames={{
                  holiday: 'bg-red-100 text-red-600',
                  working: 'bg-green-100 text-green-600',
                  hasAppointments: 'font-bold ring-2 ring-blue-400 ring-offset-1',
                }}
              />

              {/* Legend */}
              <div className="flex flex-wrap gap-4 justify-center text-xs border-t pt-4">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span>Has Appointments</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-100 border border-red-300"></span>
                  <span>Holiday</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-100 border border-green-300"></span>
                  <span>Special Working</span>
                </div>
              </div>

              {/* Selected Date Details */}
              {selectedDate && (
                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-medium text-sm">
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </h4>
                  {(() => {
                    const info = getDateInfo(selectedDate)
                    const dateOverride = overrides.find(o => o.date === format(selectedDate, 'yyyy-MM-dd'))

                    if (dateOverride && !dateOverride.is_available) {
                      return (
                        <Badge variant="destructive">Holiday - Not Available</Badge>
                      )
                    }

                    if (info.totalSlots === 0) {
                      return (
                        <p className="text-sm text-gray-500">Not a working day</p>
                      )
                    }

                    return (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 p-3 rounded-lg text-center">
                          <div className="flex items-center justify-center gap-1 text-blue-600">
                            <Users className="h-4 w-4" />
                            <span className="text-lg font-bold">{info.appointments}</span>
                          </div>
                          <p className="text-xs text-blue-600">Appointments</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg text-center">
                          <div className="flex items-center justify-center gap-1 text-green-600">
                            <Clock className="h-4 w-4" />
                            <span className="text-lg font-bold">{info.availableSlots}</span>
                          </div>
                          <p className="text-xs text-green-600">Available Slots</p>
                        </div>
                        <div className="col-span-2 bg-gray-50 p-2 rounded-lg text-center">
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">{info.totalSlots}</span> total slots &bull;{' '}
                            <span className="font-medium">{info.patients}</span> unique patients
                          </p>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Show appointments for selected date */}
                  {(() => {
                    const dayAppointments = getAppointmentsForDate(selectedDate)
                    if (dayAppointments.length === 0) return null

                    return (
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-gray-500 uppercase">Appointments</h5>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {dayAppointments.map((apt) => (
                            <div
                              key={apt.id}
                              className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{apt.start_time}</span>
                                <span className="text-gray-600 truncate max-w-[100px]">
                                  {apt.patient_name}
                                </span>
                              </div>
                              <Badge
                                variant={apt.status === 'cancelled' ? 'destructive' : 'outline'}
                                className="text-xs"
                              >
                                {apt.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
