'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Mail,
  MessageSquare
} from 'lucide-react'

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

function generatePassword(length = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'
  const allChars = uppercase + lowercase + numbers + symbols

  let password = ''
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

export default function CreateDoctorPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: generatePassword(),
    specialization: '',
    qualification: '',
    experienceYears: '',
    clinicName: '',
    clinicAddress: '',
    consultationFee: '',
    onlineFee: '',
    sendEmail: true,
    sendWhatsApp: false,
    verifyImmediately: true,
  })

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const regeneratePassword = () => {
    setFormData(prev => ({ ...prev, password: generatePassword() }))
  }

  const copyPassword = async () => {
    await navigator.clipboard.writeText(formData.password)
    setCopied(true)
    toast.success('Password copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    // Validation
    if (!formData.fullName.trim()) {
      setError('Full name is required')
      setIsLoading(false)
      return
    }
    if (!formData.email.trim()) {
      setError('Email is required')
      setIsLoading(false)
      return
    }
    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/superadmin/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || null,
          password: formData.password,
          specialization: formData.specialization || null,
          qualification: formData.qualification.trim() || null,
          experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : null,
          clinicName: formData.clinicName.trim() || null,
          clinicAddress: formData.clinicAddress.trim() || null,
          consultationFee: formData.consultationFee ? parseFloat(formData.consultationFee) : null,
          onlineFee: formData.onlineFee ? parseFloat(formData.onlineFee) : null,
          sendEmail: formData.sendEmail,
          sendWhatsApp: formData.sendWhatsApp,
          verifyImmediately: formData.verifyImmediately,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create doctor')
      }

      toast.success('Doctor created successfully!')

      if (formData.sendEmail) {
        toast.success('Credentials sent via email')
      }
      if (formData.sendWhatsApp && formData.phone) {
        toast.success('Credentials sent via WhatsApp')
      }

      router.push('/superadmin/doctors')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create doctor'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/superadmin/doctors">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Doctor</h1>
          <p className="text-gray-500">Create a doctor account and share credentials</p>
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
            <CardDescription>Doctor's personal and contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="Dr. John Smith"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Select
                  value={formData.specialization}
                  onValueChange={(value) => handleChange('specialization', value)}
                  disabled={isLoading}
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
                  placeholder="MBBS, MS, MCh"
                  value={formData.qualification}
                  onChange={(e) => handleChange('qualification', e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experienceYears">Years of Experience</Label>
                <Input
                  id="experienceYears"
                  type="number"
                  min="0"
                  max="60"
                  placeholder="10"
                  value={formData.experienceYears}
                  onChange={(e) => handleChange('experienceYears', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Login Credentials */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Login Credentials</CardTitle>
            <CardDescription>Temporary password for first login (doctor will be required to change it)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    disabled={isLoading}
                    required
                    className="pr-20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-10 top-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={copyPassword}
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button type="button" variant="outline" onClick={regeneratePassword}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Password contains uppercase, lowercase, numbers, and symbols
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Practice Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Practice Details</CardTitle>
            <CardDescription>Clinic and consultation information (optional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clinicName">Clinic/Hospital Name</Label>
                <Input
                  id="clinicName"
                  placeholder="City General Hospital"
                  value={formData.clinicName}
                  onChange={(e) => handleChange('clinicName', e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinicAddress">Clinic Address</Label>
                <Input
                  id="clinicAddress"
                  placeholder="123 Medical Street, City"
                  value={formData.clinicAddress}
                  onChange={(e) => handleChange('clinicAddress', e.target.value)}
                  disabled={isLoading}
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
                  placeholder="500"
                  value={formData.consultationFee}
                  onChange={(e) => handleChange('consultationFee', e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onlineFee">Online Consultation Fee (INR)</Label>
                <Input
                  id="onlineFee"
                  type="number"
                  min="0"
                  placeholder="300"
                  value={formData.onlineFee}
                  onChange={(e) => handleChange('onlineFee', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Credential Delivery</CardTitle>
            <CardDescription>How to send login credentials to the doctor</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="sendEmail"
                checked={formData.sendEmail}
                onCheckedChange={(checked) => handleChange('sendEmail', checked as boolean)}
                disabled={isLoading}
              />
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <Label htmlFor="sendEmail" className="cursor-pointer">
                  Send credentials via Email
                </Label>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="sendWhatsApp"
                checked={formData.sendWhatsApp}
                onCheckedChange={(checked) => handleChange('sendWhatsApp', checked as boolean)}
                disabled={isLoading || !formData.phone}
              />
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                <Label htmlFor="sendWhatsApp" className={`cursor-pointer ${!formData.phone ? 'text-gray-400' : ''}`}>
                  Send credentials via WhatsApp {!formData.phone && '(requires phone number)'}
                </Label>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-4 border-t">
              <Checkbox
                id="verifyImmediately"
                checked={formData.verifyImmediately}
                onCheckedChange={(checked) => handleChange('verifyImmediately', checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="verifyImmediately" className="cursor-pointer">
                Verify doctor immediately (skip verification step)
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/superadmin/doctors">
            <Button type="button" variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Doctor'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
