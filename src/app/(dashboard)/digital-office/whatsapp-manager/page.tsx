'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { MessageSquare, Send, Users, Clock, CheckCheck, Loader2, Video, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

const templates = [
  {
    id: 'appointment_confirmation',
    name: 'Appointment Confirmation',
    preview: 'Hello {patient_name}! Your appointment with {doctor_name} has been confirmed for {date} at {time}.',
  },
  {
    id: 'appointment_reminder',
    name: 'Appointment Reminder',
    preview: 'Reminder: {patient_name}, your appointment is tomorrow at {time}. See you soon!',
  },
  {
    id: 'meeting_link',
    name: 'Meeting Link',
    preview: 'Hello {patient_name}! Your online consultation is starting in 5 minutes. Join here: {link}',
  },
  {
    id: 'follow_up',
    name: 'Follow-up Reminder',
    preview: 'Hello {patient_name}, this is a reminder for your follow-up appointment. Please book your next visit.',
  },
]

export default function WhatsAppManagerPage() {
  const { doctor } = useAuth()
  const [sending, setSending] = useState(false)
  const [sendingTemplate, setSendingTemplate] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [message, setMessage] = useState('')

  // Template form state
  const [templatePhone, setTemplatePhone] = useState('')
  const [patientName, setPatientName] = useState('')
  const [consultationDate, setConsultationDate] = useState('')
  const [consultationTime, setConsultationTime] = useState('')

  const handleSendMessage = async () => {
    if (!phoneNumber || !message) {
      toast.error('Please enter phone number and message')
      return
    }

    setSending(true)

    try {
      const response = await fetch('/api/notifications/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, message }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      toast.success('Message sent successfully')
      setPhoneNumber('')
      setMessage('')
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleSendTemplate = async () => {
    if (!templatePhone || !patientName) {
      toast.error('Please enter phone number and patient name')
      return
    }

    if (!doctor?.standard_meeting_link) {
      toast.error('Please set your meeting link in Settings first')
      return
    }

    setSendingTemplate(true)

    try {
      const response = await fetch('/api/notifications/whatsapp-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: templatePhone,
          templateName: 'video_consultation_15min_reminder',
          patientName,
          doctorName: doctor.full_name,
          date: consultationDate || new Date().toLocaleDateString('en-IN'),
          time: consultationTime || 'As scheduled',
          meetingLink: doctor.standard_meeting_link,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send template message')
      }

      toast.success('Consultation reminder sent successfully!')
      setTemplatePhone('')
      setPatientName('')
      setConsultationDate('')
      setConsultationTime('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send template message')
    } finally {
      setSendingTemplate(false)
    }
  }

  return (
    <div>
      <Header title="WhatsApp Manager" />

      <div className="p-6 space-y-6">
        {/* Info Banner */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 flex items-start gap-4">
            <MessageSquare className="h-6 w-6 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">WhatsApp Business Integration</p>
              <p className="text-sm text-green-600">
                Send appointment confirmations, reminders, and meeting links directly to patients via WhatsApp using DoubleTick.
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="consultation" className="space-y-6">
          <TabsList>
            <TabsTrigger value="consultation">Consultation Reminder</TabsTrigger>
            <TabsTrigger value="send">Send Message</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="consultation">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-green-600" />
                  Send Consultation Reminder
                </CardTitle>
                <CardDescription>
                  Send a WhatsApp message with your video consultation meeting link using DoubleTick template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!doctor?.standard_meeting_link && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please set your meeting link in <a href="/settings" className="underline font-medium">Settings → Booking Settings</a> first.
                    </AlertDescription>
                  </Alert>
                )}

                {doctor?.standard_meeting_link && (
                  <Alert>
                    <Video className="h-4 w-4" />
                    <AlertDescription>
                      Meeting link: <span className="font-medium">{doctor.standard_meeting_link}</span>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="templatePhone">Patient Phone Number *</Label>
                    <Input
                      id="templatePhone"
                      placeholder="+91 98765 43210"
                      value={templatePhone}
                      onChange={(e) => setTemplatePhone(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">Include country code (e.g., +91 for India)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patientName">Patient Name *</Label>
                    <Input
                      id="patientName"
                      placeholder="Patient's name"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consultationDate">Consultation Date</Label>
                    <Input
                      id="consultationDate"
                      type="date"
                      value={consultationDate}
                      onChange={(e) => setConsultationDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consultationTime">Consultation Time</Label>
                    <Input
                      id="consultationTime"
                      type="time"
                      value={consultationTime}
                      onChange={(e) => setConsultationTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-800 mb-2">Message Preview:</p>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>Hi {patientName || '{patient_name}'},</p>
                    <p>Your video consultation with Dr. {doctor?.full_name || '{doctor_name}'} starts in 15 minutes!</p>
                    <p>Date: {consultationDate || '{date}'}</p>
                    <p>Time: {consultationTime || '{time}'}</p>
                    <p>Click here to join: {doctor?.standard_meeting_link || '{meeting_link}'}</p>
                    <p className="text-gray-500 mt-2">Please ensure you have a stable internet connection and your camera/microphone ready.</p>
                  </div>
                </div>

                <Button
                  onClick={handleSendTemplate}
                  disabled={sendingTemplate || !doctor?.standard_meeting_link}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {sendingTemplate ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Consultation Reminder
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="send">
            <Card>
              <CardHeader>
                <CardTitle>Send WhatsApp Message</CardTitle>
                <CardDescription>Send a quick message to a patient</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+91 98765 43210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">Include country code (e.g., +91 for India)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Type your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={sending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>Message Templates</CardTitle>
                <CardDescription>Pre-defined templates for common scenarios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setMessage(template.preview)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{template.name}</h4>
                        <Badge variant="outline">Click to use</Badge>
                      </div>
                      <p className="text-sm text-gray-500">{template.preview}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Message History</CardTitle>
                <CardDescription>Recently sent WhatsApp messages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No messages sent yet</p>
                  <p className="text-sm text-gray-400">Your sent messages will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Send className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Messages Sent Today</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCheck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Delivered</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Unique Recipients</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
