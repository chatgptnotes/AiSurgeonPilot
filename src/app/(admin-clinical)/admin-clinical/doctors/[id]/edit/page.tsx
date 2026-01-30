'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Doctor } from '@/types/database'

const specializations = [
  'General Surgery',
  'Orthopedic Surgery',
  'Cardiothoracic Surgery',
  'Neurosurgery',
  'Plastic Surgery',
  'Pediatric Surgery',
  'Urological Surgery',
  'Vascular Surgery',
  'Oncological Surgery',
  'Gynecological Surgery',
  'ENT Surgery',
  'Ophthalmic Surgery',
  'Dental Surgery',
  'Other',
]

export default function EditDoctorPage() {
  const params = useParams()
  const router = useRouter()
  const { doctor: currentUser } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    specialization: '',
    qualification: '',
    experienceYears: '',
    clinicName: '',
    clinicAddress: '',
    consultationFee: '',
    onlineFee: '',
    bio: '',
    isVerified: false,
    isActive: true,
  })

  useEffect(() => {
    if (currentUser?.id) {
      fetchDoctor()
    }
  }, [params.id, currentUser?.id])

  const fetchDoctor = async () => {
    if (!currentUser?.id) return

    const supabase = createClient()
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

    setFormData({
      fullName: data.full_name,
      email: data.email,
      phone: data.phone || '',
      specialization: data.specialization || '',
      qualification: data.qualification || '',
      experienceYears: data.experience_years?.toString() || '',
      clinicName: data.clinic_name || '',
      clinicAddress: data.clinic_address || '',
      consultationFee: data.consultation_fee?.toString() || '',
      onlineFee: data.online_fee?.toString() || '',
      bio: data.bio || '',
      isVerified: data.is_verified,
      isActive: data.is_active,
    })
    setIsLoading(false)
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)

    if (!formData.fullName.trim()) {
      setError('Full name is required')
      setIsSaving(false)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('doc_doctors')
        .update({
          full_name: formData.fullName.trim(),
          phone: formData.phone.trim() || null,
          specialization: formData.specialization || null,
          qualification: formData.qualification.trim() || null,
          experience_years: formData.experienceYears ? parseInt(formData.experienceYears) : null,
          clinic_name: formData.clinicName.trim() || null,
          clinic_address: formData.clinicAddress.trim() || null,
          consultation_fee: formData.consultationFee ? parseFloat(formData.consultationFee) : null,
          online_fee: formData.onlineFee ? parseFloat(formData.onlineFee) : null,
          bio: formData.bio.trim() || null,
          is_verified: formData.isVerified,
          is_active: formData.isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)

      if (error) throw error

      toast.success('Doctor updated successfully')
      router.push(`/admin-clinical/doctors/${params.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update doctor'
      setError(message)
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/admin-clinical/doctors/${params.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Doctor</h1>
          <p className="text-gray-500">Update doctor information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Basic Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Doctor's personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  disabled={isSaving}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Select
                  value={formData.specialization}
                  onValueChange={(value) => handleChange('specialization', value)}
                  disabled={isSaving}
                >
                  <SelectTrigger id="specialization">
                    <SelectValue placeholder="Select specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    {specializations.map((spec) => (
                      <SelectItem key={spec} value={spec}>
                        {spec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qualification">Qualification</Label>
                <Input
                  id="qualification"
                  value={formData.qualification}
                  onChange={(e) => handleChange('qualification', e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experienceYears">Years of Experience</Label>
                <Input
                  id="experienceYears"
                  type="number"
                  min="0"
                  max="60"
                  value={formData.experienceYears}
                  onChange={(e) => handleChange('experienceYears', e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={3}
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                disabled={isSaving}
                placeholder="Brief professional bio..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Practice Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Practice Details</CardTitle>
            <CardDescription>Clinic and fee information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clinicName">Clinic/Hospital Name</Label>
                <Input
                  id="clinicName"
                  value={formData.clinicName}
                  onChange={(e) => handleChange('clinicName', e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinicAddress">Clinic Address</Label>
                <Input
                  id="clinicAddress"
                  value={formData.clinicAddress}
                  onChange={(e) => handleChange('clinicAddress', e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="consultationFee">Physical Consultation Fee (INR)</Label>
                <Input
                  id="consultationFee"
                  type="number"
                  min="0"
                  value={formData.consultationFee}
                  onChange={(e) => handleChange('consultationFee', e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onlineFee">Online Consultation Fee (INR)</Label>
                <Input
                  id="onlineFee"
                  type="number"
                  min="0"
                  value={formData.onlineFee}
                  onChange={(e) => handleChange('onlineFee', e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
            <CardDescription>Verification and activation settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isVerified">Verified</Label>
                <p className="text-sm text-gray-500">Mark doctor as verified</p>
              </div>
              <Switch
                id="isVerified"
                checked={formData.isVerified}
                onCheckedChange={(checked) => handleChange('isVerified', checked)}
                disabled={isSaving}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isActive">Active</Label>
                <p className="text-sm text-gray-500">Deactivating prevents login</p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleChange('isActive', checked)}
                disabled={isSaving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href={`/admin-clinical/doctors/${params.id}`}>
            <Button type="button" variant="outline" disabled={isSaving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
