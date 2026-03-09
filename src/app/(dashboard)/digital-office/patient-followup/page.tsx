'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Plus, Calendar as CalendarIcon, Check, X, Loader2, UserCheck, Clock, Search } from 'lucide-react'
import type { Followup } from '@/types/database'

interface PatientOption {
  patient_name: string
  patient_email: string
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function PatientFollowupPage() {
  const { doctor, isLoading: authLoading } = useAuth()
  const [followups, setFollowups] = useState<Followup[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [newFollowup, setNewFollowup] = useState({
    patientName: '',
    patientEmail: '',
    notes: '',
  })
  const [patientSearch, setPatientSearch] = useState('')
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([])
  const [searchingPatients, setSearchingPatients] = useState(false)
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)

  useEffect(() => {
    const fetchFollowups = async () => {
      if (!doctor) return

      const supabase = createClient()

      const { data, error } = await supabase
        .from('doc_followups')
        .select('*')
        .eq('doctor_id', doctor.id)
        .order('followup_date', { ascending: true })

      if (error) {
        toast.error('Failed to load follow-ups')
        return
      }

      setFollowups(data || [])
      setLoading(false)
    }

    if (doctor) {
      fetchFollowups()
    }
  }, [doctor])

  const searchPatients = async (query: string) => {
    setPatientSearch(query)
    if (!doctor || query.length < 2) {
      setPatientOptions([])
      setShowPatientDropdown(false)
      return
    }

    setSearchingPatients(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('doc_appointments')
      .select('patient_name, patient_email')
      .eq('doctor_id', doctor.id)
      .ilike('patient_name', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    setSearchingPatients(false)

    if (error) {
      setPatientOptions([])
      return
    }

    // Deduplicate by email
    const seen = new Set<string>()
    const unique = (data || []).filter((p: PatientOption) => {
      const key = p.patient_email || p.patient_name
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    setPatientOptions(unique)
    setShowPatientDropdown(unique.length > 0)
  }

  const selectPatient = (patient: PatientOption) => {
    setNewFollowup(p => ({
      ...p,
      patientName: patient.patient_name,
      patientEmail: patient.patient_email || '',
    }))
    setPatientSearch(patient.patient_name)
    setShowPatientDropdown(false)
  }

  const handleCreateFollowup = async () => {
    if (!doctor || !selectedDate || !newFollowup.patientName) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    const supabase = createClient()

    // 1. Create appointment in doc_appointments with pending payment so patient can pay to confirm
    const appointmentDate = format(selectedDate, 'yyyy-MM-dd')
    const consultationFee = doctor.consultation_fee || doctor.online_fee || 0
    const { data: appointment, error: appointmentError } = await supabase
      .from('doc_appointments')
      .insert({
        doctor_id: doctor.id,
        patient_name: newFollowup.patientName,
        patient_email: newFollowup.patientEmail || '',
        appointment_date: appointmentDate,
        start_time: '09:00',
        end_time: '09:30',
        visit_type: 'online',
        status: 'pending',
        payment_status: 'pending',
        amount: consultationFee,
        notes: `[Follow-up] ${newFollowup.notes || ''}`.trim(),
      })
      .select()
      .single()

    if (appointmentError) {
      setSaving(false)
      toast.error('Failed to create follow-up appointment')
      console.error(appointmentError)
      return
    }

    // 2. Create follow-up record linked to the appointment
    const { data, error } = await supabase
      .from('doc_followups')
      .insert({
        doctor_id: doctor.id,
        appointment_id: appointment.id,
        followup_date: appointmentDate,
        notes: `Patient: ${newFollowup.patientName}\nEmail: ${newFollowup.patientEmail}\n\n${newFollowup.notes}`,
        status: 'pending',
      })
      .select()
      .single()

    setSaving(false)

    if (error) {
      toast.error('Failed to create follow-up record')
      return
    }

    setFollowups(prev => [...prev, data])
    setShowDialog(false)
    setNewFollowup({ patientName: '', patientEmail: '', notes: '' })
    setPatientSearch('')
    setPatientOptions([])
    setShowPatientDropdown(false)
    setSelectedDate(undefined)
    toast.success('Follow-up scheduled and added to appointments')
  }

  const updateStatus = async (id: string, status: 'completed' | 'cancelled') => {
    const supabase = createClient()

    const { error } = await supabase
      .from('doc_followups')
      .update({ status })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update status')
      return
    }

    setFollowups(prev =>
      prev.map(f => f.id === id ? { ...f, status } : f)
    )
    toast.success(`Follow-up marked as ${status}`)
  }

  const pendingFollowups = followups.filter(f => f.status === 'pending')
  const todayFollowups = pendingFollowups.filter(
    f => f.followup_date === new Date().toISOString().split('T')[0]
  )

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    )
  }

  return (
    <div>
      <Header title="Patient Follow-up" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending Follow-ups</p>
                  <p className="text-2xl font-bold">{pendingFollowups.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <CalendarIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Today&apos;s Follow-ups</p>
                  <p className="text-2xl font-bold">{todayFollowups.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Completed This Month</p>
                  <p className="text-2xl font-bold">
                    {followups.filter(f => f.status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Follow-ups List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Scheduled Follow-ups</CardTitle>
              <CardDescription>Track and manage patient follow-ups</CardDescription>
            </div>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Follow-up
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule Follow-up</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Search Patient *</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Type patient name to search..."
                        value={patientSearch}
                        onChange={(e) => searchPatients(e.target.value)}
                        onFocus={() => patientOptions.length > 0 && setShowPatientDropdown(true)}
                        className="pl-9"
                      />
                      {searchingPatients && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                      )}
                      {showPatientDropdown && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {patientOptions.map((patient, idx) => (
                            <button
                              key={`${patient.patient_email || patient.patient_name}-${idx}`}
                              type="button"
                              className="w-full text-left px-4 py-2.5 hover:bg-green-50 flex items-center justify-between transition-colors"
                              onClick={() => selectPatient(patient)}
                            >
                              <span className="font-medium text-sm text-gray-800">{patient.patient_name}</span>
                              {patient.patient_email && (
                                <span className="text-xs text-gray-400">{patient.patient_email}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {newFollowup.patientName && (
                      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                        <UserCheck className="h-4 w-4" />
                        <span>{newFollowup.patientName}</span>
                        {newFollowup.patientEmail && (
                          <span className="text-green-500">({newFollowup.patientEmail})</span>
                        )}
                        <button
                          type="button"
                          className="ml-auto text-green-400 hover:text-red-500"
                          onClick={() => {
                            setNewFollowup(p => ({ ...p, patientName: '', patientEmail: '' }))
                            setPatientSearch('')
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Follow-up Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Add notes about the follow-up..."
                      value={newFollowup.notes}
                      onChange={(e) => setNewFollowup(p => ({ ...p, notes: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateFollowup}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Schedule'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {followups.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No follow-ups scheduled</p>
                <p className="text-sm text-gray-400">Click &quot;Add Follow-up&quot; to schedule one</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {followups.map((followup) => (
                    <TableRow key={followup.id}>
                      <TableCell>
                        {format(new Date(followup.followup_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {followup.notes}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[followup.status]}>
                          {followup.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {followup.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={() => updateStatus(followup.id, 'completed')}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => updateStatus(followup.id, 'cancelled')}
                            >
                              <X className="h-4 w-4" />
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
      </div>
    </div>
  )
}
