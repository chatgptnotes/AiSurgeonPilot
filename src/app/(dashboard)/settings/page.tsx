'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { Loader2, Camera, Copy, Check, Video } from 'lucide-react'
import slugify from 'slugify'

export default function SettingsPage() {
  const { doctor, isLoading } = useAuth()
  const setDoctor = useAuthStore(state => state.setDoctor)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    specialization: '',
    qualification: '',
    experience_years: '',
    clinic_name: '',
    clinic_address: '',
    bio: '',
    consultation_fee: '',
    online_fee: '',
    booking_slug: '',
    standard_meeting_link: '',
  })

  useEffect(() => {
    if (doctor) {
      setFormData({
        full_name: doctor.full_name || '',
        email: doctor.email || '',
        phone: doctor.phone || '',
        specialization: doctor.specialization || '',
        qualification: doctor.qualification || '',
        experience_years: doctor.experience_years?.toString() || '',
        clinic_name: doctor.clinic_name || '',
        clinic_address: doctor.clinic_address || '',
        bio: doctor.bio || '',
        consultation_fee: doctor.consultation_fee?.toString() || '',
        online_fee: doctor.online_fee?.toString() || '',
        booking_slug: doctor.booking_slug || '',
        standard_meeting_link: doctor.standard_meeting_link || '',
      })
    }
  }, [doctor])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = slugify(e.target.value, { lower: true, strict: true })
    setFormData(prev => ({
      ...prev,
      booking_slug: value
    }))
  }

  const handleSave = async () => {
    if (!doctor) return

    setSaving(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('doc_doctors')
      .update({
        full_name: formData.full_name,
        phone: formData.phone || null,
        specialization: formData.specialization || null,
        qualification: formData.qualification || null,
        experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
        clinic_name: formData.clinic_name || null,
        clinic_address: formData.clinic_address || null,
        bio: formData.bio || null,
        consultation_fee: formData.consultation_fee ? parseFloat(formData.consultation_fee) : null,
        online_fee: formData.online_fee ? parseFloat(formData.online_fee) : null,
        booking_slug: formData.booking_slug || null,
        standard_meeting_link: formData.standard_meeting_link || null,
      })
      .eq('id', doctor.id)
      .select()
      .single()

    setSaving(false)

    if (error) {
      toast.error('Failed to save settings', {
        description: error.message
      })
      return
    }

    setDoctor(data)
    toast.success('Settings saved successfully')
  }

  const copyBookingLink = () => {
    const link = `${window.location.origin}/book/${formData.booking_slug}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success('Booking link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
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
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    )
  }

  return (
    <div>
      <Header title="Settings" />

      <div className="p-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="practice">Practice Details</TabsTrigger>
            <TabsTrigger value="booking">Booking Settings</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Image */}
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={doctor?.profile_image || ''} />
                    <AvatarFallback className="bg-green-600 text-white text-2xl">
                      {formData.full_name ? getInitials(formData.full_name) : 'DR'}
                    </AvatarFallback>
                  </Avatar>
                  <Button variant="outline" className="gap-2">
                    <Camera className="h-4 w-4" />
                    Change Photo
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="Dr. John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialization">Specialization</Label>
                    <Input
                      id="specialization"
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleChange}
                      placeholder="e.g., Cardiology, Orthopedics"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qualification">Qualification</Label>
                    <Input
                      id="qualification"
                      name="qualification"
                      value={formData.qualification}
                      onChange={handleChange}
                      placeholder="e.g., MBBS, MD, MS"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experience_years">Years of Experience</Label>
                    <Input
                      id="experience_years"
                      name="experience_years"
                      type="number"
                      value={formData.experience_years}
                      onChange={handleChange}
                      placeholder="10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Tell patients about yourself, your expertise, and approach to care..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="practice" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Practice Details</CardTitle>
                <CardDescription>Information about your clinic or practice</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="clinic_name">Clinic/Hospital Name</Label>
                    <Input
                      id="clinic_name"
                      name="clinic_name"
                      value={formData.clinic_name}
                      onChange={handleChange}
                      placeholder="City Medical Center"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic_address">Clinic Address</Label>
                  <Textarea
                    id="clinic_address"
                    name="clinic_address"
                    value={formData.clinic_address}
                    onChange={handleChange}
                    placeholder="Full address of your clinic..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="booking" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Consultation Fees</CardTitle>
                <CardDescription>Set your consultation fees for different visit types</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="consultation_fee">Physical Consultation Fee ($)</Label>
                    <Input
                      id="consultation_fee"
                      name="consultation_fee"
                      type="number"
                      value={formData.consultation_fee}
                      onChange={handleChange}
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="online_fee">Online Consultation Fee ($)</Label>
                    <Input
                      id="online_fee"
                      name="online_fee"
                      type="number"
                      value={formData.online_fee}
                      onChange={handleChange}
                      placeholder="75"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-green-600" />
                  Online Consultation Meeting Link
                </CardTitle>
                <CardDescription>
                  Set your standard meeting link (Zoom, Google Meet, etc.) that will be automatically shared with patients for all online consultations via Email and WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="standard_meeting_link">Standard Meeting Link</Label>
                  <Input
                    id="standard_meeting_link"
                    name="standard_meeting_link"
                    value={formData.standard_meeting_link}
                    onChange={handleChange}
                    placeholder="https://zoom.us/j/your-personal-meeting-id"
                  />
                </div>
                <Alert>
                  <AlertDescription>
                    This link will be automatically sent to patients via Email and WhatsApp when you confirm their online consultation appointment.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking Link</CardTitle>
                <CardDescription>
                  Share this link with patients for direct booking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="booking_slug">Custom URL Slug</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center bg-gray-50 border rounded-md px-3">
                      <span className="text-gray-500 text-sm">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/book/
                      </span>
                      <Input
                        id="booking_slug"
                        name="booking_slug"
                        value={formData.booking_slug}
                        onChange={handleSlugChange}
                        className="border-0 bg-transparent focus-visible:ring-0 px-0"
                        placeholder="dr-john-doe"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={copyBookingLink}
                      disabled={!formData.booking_slug}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Alert>
                  <AlertDescription>
                    Patients can use this link to book appointments directly with you. Share it on your website, social media, or business cards.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Notification settings coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
