'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { Plus, Stethoscope, DollarSign, Clock, Trash2, Edit, Loader2 } from 'lucide-react'
import type { SurgeryOption } from '@/types/database'

export default function SurgeryOptionsPage() {
  const { doctor, isLoading: authLoading } = useAuth()
  const [options, setOptions] = useState<SurgeryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    estimated_cost_min: '',
    estimated_cost_max: '',
    recovery_time: '',
    is_active: true,
  })

  useEffect(() => {
    const fetchOptions = async () => {
      if (!doctor) return

      const supabase = createClient()

      const { data, error } = await supabase
        .from('doc_surgery_options')
        .select('*')
        .eq('doctor_id', doctor.id)
        .order('created_at', { ascending: false })

      if (error) {
        toast.error('Failed to load surgery options')
        return
      }

      setOptions(data || [])
      setLoading(false)
    }

    if (doctor) {
      fetchOptions()
    }
  }, [doctor])

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      estimated_cost_min: '',
      estimated_cost_max: '',
      recovery_time: '',
      is_active: true,
    })
    setEditingId(null)
  }

  const handleSave = async () => {
    if (!doctor || !formData.name) {
      toast.error('Name is required')
      return
    }

    setSaving(true)
    const supabase = createClient()

    const payload = {
      doctor_id: doctor.id,
      name: formData.name,
      description: formData.description || null,
      estimated_cost_min: formData.estimated_cost_min ? parseFloat(formData.estimated_cost_min) : null,
      estimated_cost_max: formData.estimated_cost_max ? parseFloat(formData.estimated_cost_max) : null,
      recovery_time: formData.recovery_time || null,
      is_active: formData.is_active,
    }

    if (editingId) {
      const { data, error } = await supabase
        .from('doc_surgery_options')
        .update(payload)
        .eq('id', editingId)
        .select()
        .single()

      setSaving(false)

      if (error) {
        toast.error('Failed to update')
        return
      }

      setOptions(prev => prev.map(o => o.id === editingId ? data : o))
      toast.success('Surgery option updated')
    } else {
      const { data, error } = await supabase
        .from('doc_surgery_options')
        .insert(payload)
        .select()
        .single()

      setSaving(false)

      if (error) {
        toast.error('Failed to create')
        return
      }

      setOptions(prev => [data, ...prev])
      toast.success('Surgery option created')
    }

    setShowDialog(false)
    resetForm()
  }

  const handleEdit = (option: SurgeryOption) => {
    setFormData({
      name: option.name,
      description: option.description || '',
      estimated_cost_min: option.estimated_cost_min?.toString() || '',
      estimated_cost_max: option.estimated_cost_max?.toString() || '',
      recovery_time: option.recovery_time || '',
      is_active: option.is_active,
    })
    setEditingId(option.id)
    setShowDialog(true)
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('doc_surgery_options')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete')
      return
    }

    setOptions(prev => prev.filter(o => o.id !== id))
    toast.success('Surgery option deleted')
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
      <Header title="Surgery Options" />

      <div className="p-6 space-y-6">
        {/* Info Banner */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-start gap-4">
            <Stethoscope className="h-6 w-6 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">Surgery Packages</p>
              <p className="text-sm text-blue-600">
                Define surgery options with estimated costs and recovery times. Patients can view these when booking consultations.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Options List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Surgery Options</CardTitle>
              <CardDescription>Manage your surgery packages</CardDescription>
            </div>
            <Dialog open={showDialog} onOpenChange={(open) => {
              setShowDialog(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Option
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? 'Edit Surgery Option' : 'Add Surgery Option'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      placeholder="e.g., Knee Replacement Surgery"
                      value={formData.name}
                      onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe the surgery procedure..."
                      value={formData.description}
                      onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Cost ($)</Label>
                      <Input
                        type="number"
                        placeholder="5000"
                        value={formData.estimated_cost_min}
                        onChange={(e) => setFormData(p => ({ ...p, estimated_cost_min: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Cost ($)</Label>
                      <Input
                        type="number"
                        placeholder="10000"
                        value={formData.estimated_cost_max}
                        onChange={(e) => setFormData(p => ({ ...p, estimated_cost_max: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Recovery Time</Label>
                    <Input
                      placeholder="e.g., 4-6 weeks"
                      value={formData.recovery_time}
                      onChange={(e) => setFormData(p => ({ ...p, recovery_time: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData(p => ({ ...p, is_active: checked }))
                      }
                    />
                    <Label>Active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setShowDialog(false)
                    resetForm()
                  }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {options.length === 0 ? (
              <div className="text-center py-12">
                <Stethoscope className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No surgery options defined</p>
                <p className="text-sm text-gray-400">Add surgery packages for patients to view</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {options.map((option) => (
                  <Card key={option.id} className={`hover:shadow-md transition-shadow ${!option.is_active && 'opacity-60'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium">{option.name}</h4>
                        <Badge variant={option.is_active ? 'default' : 'outline'}>
                          {option.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {option.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{option.description}</p>
                      )}
                      <div className="space-y-2 text-sm">
                        {(option.estimated_cost_min || option.estimated_cost_max) && (
                          <div className="flex items-center gap-2 text-gray-500">
                            <DollarSign className="h-4 w-4" />
                            <span>
                              ${option.estimated_cost_min?.toLocaleString() || '?'} - ${option.estimated_cost_max?.toLocaleString() || '?'}
                            </span>
                          </div>
                        )}
                        {option.recovery_time && (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Clock className="h-4 w-4" />
                            <span>{option.recovery_time}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(option)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500"
                          onClick={() => handleDelete(option.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
