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
import { Plus, Calendar as CalendarIcon, Check, X, Loader2, UserCheck, Clock } from 'lucide-react'
import type { Followup } from '@/types/database'

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

  const handleCreateFollowup = async () => {
    if (!doctor || !selectedDate || !newFollowup.patientName) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('doc_followups')
      .insert({
        doctor_id: doctor.id,
        followup_date: format(selectedDate, 'yyyy-MM-dd'),
        notes: `Patient: ${newFollowup.patientName}\nEmail: ${newFollowup.patientEmail}\n\n${newFollowup.notes}`,
        status: 'pending',
      })
      .select()
      .single()

    setSaving(false)

    if (error) {
      toast.error('Failed to create follow-up')
      return
    }

    setFollowups(prev => [...prev, data])
    setShowDialog(false)
    setNewFollowup({ patientName: '', patientEmail: '', notes: '' })
    setSelectedDate(undefined)
    toast.success('Follow-up scheduled')
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
                    <Label>Patient Name *</Label>
                    <Input
                      placeholder="John Doe"
                      value={newFollowup.patientName}
                      onChange={(e) => setNewFollowup(p => ({ ...p, patientName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Patient Email</Label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={newFollowup.patientEmail}
                      onChange={(e) => setNewFollowup(p => ({ ...p, patientEmail: e.target.value }))}
                    />
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
