import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppTemplate } from '@/lib/doubletick/client'

interface SendTemplateRequest {
  phoneNumber: string
  templateName: string
  patientName: string
  doctorName: string
  date: string
  time: string
  meetingLink: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SendTemplateRequest = await request.json()
    const {
      phoneNumber,
      templateName,
      patientName,
      doctorName,
      date,
      time,
      meetingLink,
    } = body

    if (!phoneNumber || !templateName) {
      return NextResponse.json(
        { error: 'Phone number and template name are required' },
        { status: 400 }
      )
    }

    // Get doctor info
    const { data: doctor } = await supabase
      .from('doc_doctors')
      .select('id, full_name')
      .eq('user_id', user.id)
      .single()

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    // Build parameters array for the template
    // Template: video_consultation_15min_reminder
    // {{1}} - Patient name
    // {{2}} - Doctor name
    // {{3}} - Date
    // {{4}} - Time
    // {{5}} - Meeting link
    const parameters = [
      patientName || 'Patient',
      doctorName || doctor.full_name || 'Doctor',
      date || new Date().toLocaleDateString(),
      time || 'Scheduled time',
      meetingLink || '',
    ]

    // Send WhatsApp template message
    const result = await sendWhatsAppTemplate({
      phoneNumber,
      templateName,
      languageCode: 'en',
      parameters,
    })

    // Log notification
    await supabase
      .from('doc_notifications')
      .insert({
        doctor_id: doctor.id,
        type: 'whatsapp',
        channel: 'template',
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: {
          phone: phoneNumber,
          template: templateName,
          parameters,
          response: result,
        },
      })

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('WhatsApp template send error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send template message' },
      { status: 500 }
    )
  }
}
