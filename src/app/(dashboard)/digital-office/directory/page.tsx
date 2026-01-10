'use client'

import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import { Copy, Check, ExternalLink, MapPin, Phone, Mail, Award, Clock } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function DirectoryPage() {
  const { doctor, isLoading } = useAuth()
  const [copied, setCopied] = useState(false)

  const copyBookingLink = () => {
    if (!doctor?.booking_slug) return
    const link = `${window.location.origin}/book/${doctor.booking_slug}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success('Booking link copied!')
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

  const profileCompletion = doctor ? [
    doctor.full_name,
    doctor.specialization,
    doctor.qualification,
    doctor.experience_years,
    doctor.clinic_name,
    doctor.phone,
    doctor.bio,
    doctor.consultation_fee,
    doctor.profile_image,
  ].filter(Boolean).length / 9 * 100 : 0

  return (
    <div>
      <Header title="Doctor Directory" />

      <div className="p-6 space-y-6">
        {/* Profile Preview Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Public Profile</CardTitle>
                <CardDescription>This is how patients see your profile</CardDescription>
              </div>
              <Link href="/settings">
                <Button variant="outline">Edit Profile</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="h-32 w-32">
                <AvatarImage src={doctor?.profile_image || ''} />
                <AvatarFallback className="bg-green-600 text-white text-3xl">
                  {doctor?.full_name ? getInitials(doctor.full_name) : 'DR'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">{doctor?.full_name || 'Your Name'}</h2>
                  <p className="text-gray-600">{doctor?.specialization || 'Add your specialization'}</p>
                  {doctor?.qualification && (
                    <p className="text-sm text-gray-500">{doctor.qualification}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  {doctor?.experience_years && (
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {doctor.experience_years} years exp.
                    </Badge>
                  )}
                  {doctor?.is_verified && (
                    <Badge className="bg-green-100 text-green-800 gap-1">
                      <Award className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>

                {doctor?.bio && (
                  <p className="text-gray-600">{doctor.bio}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {doctor?.clinic_name && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {doctor.clinic_name}
                    </div>
                  )}
                  {doctor?.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4" />
                      {doctor.phone}
                    </div>
                  )}
                  {doctor?.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="h-4 w-4" />
                      {doctor.email}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  {doctor?.consultation_fee && (
                    <Badge variant="secondary">
                      Physical: ${doctor.consultation_fee}
                    </Badge>
                  )}
                  {doctor?.online_fee && (
                    <Badge variant="secondary">
                      Online: ${doctor.online_fee}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Completion */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Completion</CardTitle>
            <CardDescription>Complete your profile to attract more patients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {Math.round(profileCompletion)}% Complete
                </span>
                <span className="text-sm font-medium">
                  {profileCompletion < 100 && (
                    <Link href="/settings" className="text-green-600 hover:underline">
                      Complete Profile
                    </Link>
                  )}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
              {profileCompletion < 100 && (
                <div className="text-sm text-gray-500">
                  Add the following to complete your profile:
                  <ul className="mt-2 space-y-1">
                    {!doctor?.specialization && <li>- Specialization</li>}
                    {!doctor?.qualification && <li>- Qualification</li>}
                    {!doctor?.experience_years && <li>- Years of experience</li>}
                    {!doctor?.clinic_name && <li>- Clinic name</li>}
                    {!doctor?.phone && <li>- Phone number</li>}
                    {!doctor?.bio && <li>- Bio</li>}
                    {!doctor?.consultation_fee && <li>- Consultation fee</li>}
                    {!doctor?.profile_image && <li>- Profile photo</li>}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Booking Link */}
        <Card>
          <CardHeader>
            <CardTitle>Your Booking Link</CardTitle>
            <CardDescription>Share this link with patients for direct booking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-50 rounded-lg p-3 font-mono text-sm truncate">
                {doctor?.booking_slug
                  ? `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${doctor.booking_slug}`
                  : 'Set up your booking slug in Settings'}
              </div>
              <Button
                variant="outline"
                onClick={copyBookingLink}
                disabled={!doctor?.booking_slug}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              {doctor?.booking_slug && (
                <Link
                  href={`/book/${doctor.booking_slug}`}
                  target="_blank"
                >
                  <Button variant="outline">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
