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
import { format, addDays, startOfWeek } from 'date-fns'
import { Plus, Trash2, Loader2, Clock, Save } from 'lucide-react'
import type { Availability, AvailabilityOverride } from '@/types/database'

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

interface DaySchedule {
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration: number
  is_active: boolean
  visit_type: string[]
}

export default function CalendarPage() {
  const { doctor, isLoading: authLoading } = useAuth()
  const [availability, setAvailability] = useState<Availability[]>([])
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [showOverrideDialog, setShowOverrideDialog] = useState(false)

  const [schedules, setSchedules] = useState<DaySchedule[]>(
    DAYS_OF_WEEK.map((_, index) => ({
      day_of_week: index,
      start_time: '09:00',
      end_time: '17:00',
      slot_duration: 30,
      is_active: index > 0 && index < 6, // Mon-Fri active by default
      visit_type: ['online', 'physical'],
    }))
  )

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!doctor) {
        setLoading(false)
        return
      }

      const supabase = createClient()

      const { data: availData } = await supabase
        .from('doc_availability')
        .select('*')
        .eq('doctor_id', doctor.id)

      const { data: overrideData } = await supabase
        .from('doc_availability_overrides')
        .select('*')
        .eq('doctor_id', doctor.id)
        .gte('date', new Date().toISOString().split('T')[0])

      if (availData && availData.length > 0) {
        setAvailability(availData)
        // Map existing availability to schedules
        const newSchedules = [...schedules]
        availData.forEach(avail => {
          newSchedules[avail.day_of_week] = {
            day_of_week: avail.day_of_week,
            start_time: avail.start_time,
            end_time: avail.end_time,
            slot_duration: avail.slot_duration,
            is_active: avail.is_active,
            visit_type: avail.visit_type,
          }
        })
        setSchedules(newSchedules)
      }

      if (overrideData) {
        setOverrides(overrideData)
      }

      setLoading(false)
    }

    if (!authLoading) {
      fetchAvailability()
    }
  }, [doctor, authLoading])

  const handleScheduleChange = (dayIndex: number, field: keyof DaySchedule, value: unknown) => {
    setSchedules(prev => {
      const newSchedules = [...prev]
      newSchedules[dayIndex] = {
        ...newSchedules[dayIndex],
        [field]: value
      }
      return newSchedules
    })
  }

  const handleVisitTypeChange = (dayIndex: number, type: string, checked: boolean) => {
    setSchedules(prev => {
      const newSchedules = [...prev]
      const currentTypes = newSchedules[dayIndex].visit_type
      if (checked) {
        newSchedules[dayIndex].visit_type = [...currentTypes, type]
      } else {
        newSchedules[dayIndex].visit_type = currentTypes.filter(t => t !== type)
      }
      return newSchedules
    })
  }

  const handleSaveAvailability = async () => {
    if (!doctor) return

    setSaving(true)
    const supabase = createClient()

    // Delete existing availability
    await supabase
      .from('doc_availability')
      .delete()
      .eq('doctor_id', doctor.id)

    // Insert new availability
    const availabilityData = schedules
      .filter(s => s.is_active)
      .map(s => ({
        doctor_id: doctor.id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        slot_duration: s.slot_duration,
        is_active: s.is_active,
        visit_type: s.visit_type,
      }))

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
              {schedules.map((schedule, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-gray-50"
                >
                  <div className="w-28">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={schedule.is_active}
                        onCheckedChange={(checked) =>
                          handleScheduleChange(index, 'is_active', checked)
                        }
                      />
                      <Label className="font-medium">{DAYS_OF_WEEK[index]}</Label>
                    </div>
                  </div>

                  {schedule.is_active ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <Select
                          value={schedule.start_time}
                          onValueChange={(value) =>
                            handleScheduleChange(index, 'start_time', value)
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
                          value={schedule.end_time}
                          onValueChange={(value) =>
                            handleScheduleChange(index, 'end_time', value)
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
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={schedule.slot_duration.toString()}
                          onValueChange={(value) =>
                            handleScheduleChange(index, 'slot_duration', parseInt(value))
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
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`online-${index}`}
                            checked={schedule.visit_type.includes('online')}
                            onCheckedChange={(checked) =>
                              handleVisitTypeChange(index, 'online', checked as boolean)
                            }
                          />
                          <Label htmlFor={`online-${index}`} className="text-sm">Online</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`physical-${index}`}
                            checked={schedule.visit_type.includes('physical')}
                            onCheckedChange={(checked) =>
                              handleVisitTypeChange(index, 'physical', checked as boolean)
                            }
                          />
                          <Label htmlFor={`physical-${index}`} className="text-sm">Physical</Label>
                        </div>
                      </div>
                    </>
                  ) : (
                    <span className="text-gray-400 text-sm">Not available</span>
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
              <CardTitle>Calendar Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border mx-auto"
                modifiers={{
                  holiday: overrides
                    .filter(o => !o.is_available)
                    .map(o => new Date(o.date)),
                  working: overrides
                    .filter(o => o.is_available)
                    .map(o => new Date(o.date)),
                }}
                modifiersClassNames={{
                  holiday: 'bg-red-100 text-red-600',
                  working: 'bg-green-100 text-green-600',
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
