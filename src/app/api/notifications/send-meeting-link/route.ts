import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, emailTemplates } from '@/lib/email/client'
import { sendWhatsAppMessage, messageTemplates } from '@/lib/doubletick/client'
import { createClient } from '@/lib/supabase/server'

interface SendMeetingLinkRequest {
  appointmentId: string
  patientName: string
  patientEmail: string
  patientPhone: string | null
  doctorName: string
  appointmentDate: string
  startTime: string
  meetingLink: string
  doctorId: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SendMeetingLinkRequest = await request.json()

    const {
      appointmentId,
      patientName,
      patientEmail,
      patientPhone,
      doctorName,
      appointmentDate,
      startTime,
      meetingLink,
      doctorId,
    } = body

    if (!meetingLink) {
      return NextResponse.json(
        { error: 'Meeting link is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const results = {
      email: { success: false, error: null as string | null },
      whatsapp: { success: false, error: null as string | null },
    }

    // Send Email
    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; background: #f9f9f9; }
            .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .button { display: inline-block; background: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 15px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .meeting-link { word-break: break-all; color: #16a34a; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Online Consultation is Confirmed!</h1>
            </div>
            <div class="content">
              <p>Dear ${patientName},</p>
              <p>Great news! Your online consultation with <strong>${doctorName}</strong> has been confirmed.</p>
              <div class="details">
                <p><strong>Date:</strong> ${appointmentDate}</p>
                <p><strong>Time:</strong> ${startTime}</p>
                <p><strong>Type:</strong> Online Video Consultation</p>
              </div>
              <h3>Join Your Consultation</h3>
              <p>Click the button below to join your video consultation at the scheduled time:</p>
              <p style="text-align: center;">
                <a href="${meetingLink}" class="button">Join Meeting</a>
              </p>
              <p>Or copy this link: <span class="meeting-link">${meetingLink}</span></p>
              <h4>Before Your Appointment:</h4>
              <ul>
                <li>Test your camera and microphone</li>
                <li>Ensure you have a stable internet connection</li>
                <li>Find a quiet, well-lit space</li>
                <li>Have any relevant medical reports ready</li>
              </ul>
            </div>
            <div class="footer">
              <p>AI Surgeon Pilot - Digital Healthcare Platform</p>
            </div>
          </div>
        </body>
        </html>
      `

      await sendEmail({
        to: patientEmail,
        subject: `Online Consultation Confirmed - ${doctorName} on ${appointmentDate}`,
        html: emailHtml,
      })

      results.email.success = true

      // Log notification
      await supabase.from('doc_notifications').insert({
        doctor_id: doctorId,
        appointment_id: appointmentId,
        type: 'email',
        channel: 'appointment_confirmation',
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: { patientEmail, meetingLink },
      })
    } catch (error) {
      results.email.error = error instanceof Error ? error.message : 'Failed to send email'
      console.error('Email error:', error)
    }

    // Send WhatsApp (if phone number provided)
    if (patientPhone) {
      try {
        const whatsappMessage = `Hello ${patientName}!

Your online consultation with ${doctorName} has been confirmed.

Date: ${appointmentDate}
Time: ${startTime}

Join your video consultation here:
${meetingLink}

Please ensure you have a stable internet connection and your camera/microphone are working.

- AI Surgeon Pilot`

        await sendWhatsAppMessage({
          phoneNumber: patientPhone,
          message: whatsappMessage,
        })

        results.whatsapp.success = true

        // Log notification
        await supabase.from('doc_notifications').insert({
          doctor_id: doctorId,
          appointment_id: appointmentId,
          type: 'whatsapp',
          channel: 'appointment_confirmation',
          status: 'sent',
          sent_at: new Date().toISOString(),
          metadata: { patientPhone, meetingLink },
        })
      } catch (error) {
        results.whatsapp.error = error instanceof Error ? error.message : 'Failed to send WhatsApp'
        console.error('WhatsApp error:', error)
      }
    } else {
      results.whatsapp.error = 'No phone number provided'
    }

    return NextResponse.json({
      success: results.email.success || results.whatsapp.success,
      results,
    })
  } catch (error) {
    console.error('Send meeting link error:', error)
    return NextResponse.json(
      { error: 'Failed to send meeting link notifications' },
      { status: 500 }
    )
  }
}
