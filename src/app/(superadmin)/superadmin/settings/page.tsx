'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Settings,
  User,
  Lock,
  Bell,
  Mail,
  MessageSquare,
  Loader2,
  Save,
  Check
} from 'lucide-react'

export default function SuperAdminSettingsPage() {
  const { doctor } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const [profile, setProfile] = useState({
    fullName: doctor?.full_name || '',
    email: doctor?.email || '',
    phone: doctor?.phone || '',
  })

  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: '',
  })

  const [notifications, setNotifications] = useState({
    emailNewDoctor: true,
    emailAppointment: true,
    whatsappNewDoctor: false,
  })

  const handleProfileUpdate = async () => {
    if (!doctor) return
    setIsLoading(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('doc_doctors')
      .update({
        full_name: profile.fullName,
        phone: profile.phone || null,
      })
      .eq('id', doctor.id)

    if (error) {
      toast.error('Failed to update profile')
    } else {
      toast.success('Profile updated successfully')
    }
    setIsLoading(false)
  }

  const handlePasswordChange = async () => {
    if (password.new !== password.confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (password.new.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setPasswordLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({
      password: password.new,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password changed successfully')
      setPassword({ current: '', new: '', confirm: '' })
    }
    setPasswordLoading(false)
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-600" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={profile.fullName}
                onChange={(e) => setProfile(prev => ({ ...prev, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile.email}
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleProfileUpdate} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-indigo-600" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={password.current}
                onChange={(e) => setPassword(prev => ({ ...prev, current: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={password.new}
                onChange={(e) => setPassword(prev => ({ ...prev, new: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={password.confirm}
                onChange={(e) => setPassword(prev => ({ ...prev, confirm: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handlePasswordChange}
              disabled={passwordLoading || !password.new || !password.confirm}
            >
              {passwordLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Lock className="h-4 w-4 mr-2" />
              )}
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-600" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Configure how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium">New Doctor Registration</p>
                <p className="text-sm text-gray-500">Receive email when a new doctor is created</p>
              </div>
            </div>
            <Switch
              checked={notifications.emailNewDoctor}
              onCheckedChange={(checked) =>
                setNotifications(prev => ({ ...prev, emailNewDoctor: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium">New Appointments</p>
                <p className="text-sm text-gray-500">Receive email for new appointment bookings</p>
              </div>
            </div>
            <Switch
              checked={notifications.emailAppointment}
              onCheckedChange={(checked) =>
                setNotifications(prev => ({ ...prev, emailAppointment: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium">WhatsApp Notifications</p>
                <p className="text-sm text-gray-500">Receive WhatsApp alerts for critical events</p>
              </div>
            </div>
            <Switch
              checked={notifications.whatsappNewDoctor}
              onCheckedChange={(checked) =>
                setNotifications(prev => ({ ...prev, whatsappNewDoctor: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-600" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Application</p>
              <p className="font-medium">AiSurgeonPilot</p>
            </div>
            <div>
              <p className="text-gray-500">Version</p>
              <p className="font-medium">1.3</p>
            </div>
            <div>
              <p className="text-gray-500">Role</p>
              <p className="font-medium">SuperAdmin</p>
            </div>
            <div>
              <p className="text-gray-500">User ID</p>
              <p className="font-medium font-mono text-xs">{doctor?.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
