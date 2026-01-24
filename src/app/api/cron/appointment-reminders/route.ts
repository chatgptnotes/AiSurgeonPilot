import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const DOUBLETICK_API_URL = 'https://public.doubletick.io/whatsapp/message/template'

// Use service role for cron jobs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended for security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000)
    const sixteenMinutesFromNow = new Date(now.getTime() + 16 * 60 * 1000)

    // Get today's date in YYYY-MM-DD format
    const todayDate = now.toISOString().split('T')[0]

    // Format times for comparison (HH:mm:ss)
    const startTimeMin = fifteenMinutesFromNow.toTimeString().slice(0, 8)
    const startTimeMax = sixteenMinutesFromNow.toTimeString().slice(0, 8)

    // Find confirmed appointments starting in ~15 minutes that haven't received reminder
    const { data: appointments, error } = await supabase
      .from('doc_appointments')
      .select(`
        *,
        doctor:doc_doctors(full_name)
      `)
      .eq('appointment_date', todayDate)
      .eq('status', 'confirmed')
      .eq('visit_type', 'online')
      .gte('start_time', startTimeMin)
      .lt('start_time', startTimeMax)
      .is('reminder_sent', null)

    if (error) {
      console.error('Error fetching appointments:', error)
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
    }

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({ message: 'No reminders to send', count: 0 })
    }

    const apiKey = process.env.DOUBLETICK_API_KEY
    const fromNumber = process.env.DOUBLETICK_PHONE_NUMBER

    if (!apiKey || !fromNumber) {
      return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 500 })
    }

    const results = []

    for (const appointment of appointments) {
      if (!appointment.patient_phone || !appointment.meeting_link) {
        results.push({
          id: appointment.id,
          status: 'skipped',
          reason: !appointment.patient_phone ? 'No phone number' : 'No meeting link'
        })
        continue
      }

      // Format phone number
      let formattedPhone = appointment.patient_phone.replace(/[\s\-()]/g, '')
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone
      }

      const formattedFrom = fromNumber.replace(/[\s\-()]/g, '')
      const doctorName = appointment.doctor?.full_name || 'your doctor'

      // Format time for display (remove seconds)
      const timeDisplay = appointment.start_time.slice(0, 5)

      try {
        // Send WhatsApp reminder with meeting link
        const response = await fetch(DOUBLETICK_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              {
                to: formattedPhone,
                from: formattedFrom,
                content: {
                  templateName: 'appointment_reminder',
                  language: 'en',
                  templateData: {
                    body: {
                      placeholders: [
                        appointment.patient_name,
                        doctorName,
                        timeDisplay,
                        appointment.meeting_link
                      ]
                    }
                  }
                }
              }
            ]
          }),
        })

        const result = await response.json()

        if (response.ok) {
          // Mark reminder as sent
          await supabase
            .from('doc_appointments')
            .update({ reminder_sent: new Date().toISOString() })
            .eq('id', appointment.id)

          results.push({ id: appointment.id, status: 'sent', result })
        } else {
          results.push({ id: appointment.id, status: 'failed', error: result })
        }
      } catch (err) {
        results.push({ id: appointment.id, status: 'error', error: String(err) })
      }
    }

    return NextResponse.json({
      message: 'Reminder job completed',
      processed: appointments.length,
      results
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
