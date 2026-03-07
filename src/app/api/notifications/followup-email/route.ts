import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, emailTemplates } from '@/lib/email/client'

export async function POST(request: NextRequest) {
  try {
    const {
      patientName,
      patientEmail,
      doctorName,
      date,
      time,
      visitType,
      notes,
    } = await request.json()

    if (!patientEmail) {
      return NextResponse.json(
        { success: false, error: 'Patient email is required' },
        { status: 400 }
      )
    }

    // Send follow-up email
    const emailHtml = emailTemplates.followUpScheduled({
      patientName,
      doctorName,
      date,
      time,
      visitType,
      notes,
    })

    const result = await sendEmail({
      to: patientEmail,
      subject: `Follow-up Appointment Scheduled with Dr. ${doctorName}`,
      html: emailHtml,
    })

    if (result) {
      console.log(`Follow-up email sent to ${patientEmail}, messageId: ${result.id}`)
      return NextResponse.json({ success: true, messageId: result.id })
    } else {
      console.warn('Email not sent - SMTP not configured')
      return NextResponse.json({ success: true, warning: 'Email service not configured' })
    }
  } catch (error) {
    console.error('Follow-up email error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send follow-up email' },
      { status: 500 }
    )
  }
}
