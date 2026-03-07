import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailTemplates } from '@/lib/email/client'

const DOUBLETICK_API_URL = 'https://public.doubletick.io/whatsapp/message/template'

// IST is UTC+5:30, India has no DST so this is always correct
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

// Use service role for cron jobs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Get current time adjusted to IST */
function getISTNow(): Date {
  return new Date(Date.now() + IST_OFFSET_MS)
}

/** Format Date as YYYY-MM-DD (using the IST-adjusted date's UTC representation) */
function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

/** Format Date as HH:mm:ss (using the IST-adjusted date's UTC representation) */
function formatTime(d: Date): string {
  return d.toISOString().slice(11, 19)
}

// ─── 12-HOUR EMAIL REMINDER (no meeting link) ────────────────────────────────

async function process12hReminders(istNow: Date, results: any[]) {
  const target = new Date(istNow.getTime() + 12 * 60 * 60 * 1000)
  const windowMin = new Date(target.getTime() - 5 * 60 * 1000) // -5 min
  const windowMax = new Date(target.getTime() + 5 * 60 * 1000) // +5 min

  const targetDate = formatDate(target)
  const timeMin = formatTime(windowMin)
  const timeMax = formatTime(windowMax)

  // If the window crosses midnight (timeMax < timeMin), skip — extremely rare edge case
  if (timeMax < timeMin) return

  const { data: appointments, error } = await supabase
    .from('doc_appointments')
    .select(`
      *,
      doctor:doc_doctors(full_name)
    `)
    .eq('appointment_date', targetDate)
    .eq('status', 'confirmed')
    .eq('visit_type', 'online')
    .gte('start_time', timeMin)
    .lt('start_time', timeMax)
    .is('reminder_12h_email_sent', null)

  if (error) {
    console.error('Error fetching 12h reminders:', error)
    return
  }

  if (!appointments || appointments.length === 0) return

  for (const appt of appointments) {
    if (!appt.patient_email) {
      results.push({ id: appt.id, type: '12h', status: 'skipped', reason: 'No email' })
      continue
    }

    try {
      const timeDisplay = appt.start_time.slice(0, 5)
      const doctorName = appt.doctor?.full_name || 'your doctor'

      const emailHtml = emailTemplates.appointmentReminder12h({
        patientName: appt.patient_name,
        doctorName,
        date: appt.appointment_date,
        time: timeDisplay,
      })

      await sendEmail({
        to: appt.patient_email,
        subject: `Reminder: Your consultation with ${doctorName} on ${appt.appointment_date} at ${timeDisplay}`,
        html: emailHtml,
      })

      // Mark as sent
      await supabase
        .from('doc_appointments')
        .update({ reminder_12h_email_sent: new Date().toISOString() })
        .eq('id', appt.id)

      // Log notification
      await supabase.from('doc_notifications').insert({
        doctor_id: appt.doctor_id,
        appointment_id: appt.id,
        type: 'email',
        channel: 'reminder_12h',
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: { patientEmail: appt.patient_email },
      })

      results.push({ id: appt.id, type: '12h', status: 'sent' })
    } catch (err) {
      console.error('12h reminder error for', appt.id, err)
      results.push({ id: appt.id, type: '12h', status: 'error', error: String(err) })
    }
  }
}

// ─── 30-MINUTE EMAIL REMINDER (with meeting link) ────────────────────────────

async function process30mReminders(istNow: Date, results: any[]) {
  const target = new Date(istNow.getTime() + 30 * 60 * 1000)
  const windowMin = new Date(target.getTime() - 2.5 * 60 * 1000) // -2.5 min
  const windowMax = new Date(target.getTime() + 2.5 * 60 * 1000) // +2.5 min

  const targetDate = formatDate(target)
  const timeMin = formatTime(windowMin)
  const timeMax = formatTime(windowMax)

  const { data: appointments, error } = await supabase
    .from('doc_appointments')
    .select(`
      *,
      doctor:doc_doctors(full_name, standard_meeting_link)
    `)
    .eq('appointment_date', targetDate)
    .eq('status', 'confirmed')
    .eq('visit_type', 'online')
    .gte('start_time', timeMin)
    .lt('start_time', timeMax)
    .is('reminder_30m_email_sent', null)

  if (error) {
    console.error('Error fetching 30m reminders:', error)
    return
  }

  if (!appointments || appointments.length === 0) return

  for (const appt of appointments) {
    if (!appt.patient_email) {
      results.push({ id: appt.id, type: '30m', status: 'skipped', reason: 'No email' })
      continue
    }

    // Resolve meeting link: appointment-specific first, then doctor's standard link
    const meetingLink = appt.meeting_link || appt.doctor?.standard_meeting_link

    if (!meetingLink) {
      results.push({ id: appt.id, type: '30m', status: 'skipped', reason: 'No meeting link' })
      continue
    }

    try {
      const timeDisplay = appt.start_time.slice(0, 5)
      const doctorName = appt.doctor?.full_name || 'your doctor'

      const emailHtml = emailTemplates.appointmentReminder30m({
        patientName: appt.patient_name,
        doctorName,
        time: timeDisplay,
        meetingLink,
      })

      await sendEmail({
        to: appt.patient_email,
        subject: `Your consultation with ${doctorName} starts in 30 minutes - Join Link Inside`,
        html: emailHtml,
      })

      // Mark as sent
      await supabase
        .from('doc_appointments')
        .update({ reminder_30m_email_sent: new Date().toISOString() })
        .eq('id', appt.id)

      // Log notification
      await supabase.from('doc_notifications').insert({
        doctor_id: appt.doctor_id,
        appointment_id: appt.id,
        type: 'email',
        channel: 'reminder_30m',
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: { patientEmail: appt.patient_email, meetingLink },
      })

      results.push({ id: appt.id, type: '30m', status: 'sent' })
    } catch (err) {
      console.error('30m reminder error for', appt.id, err)
      results.push({ id: appt.id, type: '30m', status: 'error', error: String(err) })
    }
  }
}

// ─── 15-MINUTE WHATSAPP REMINDER (existing logic, timezone fixed) ─────────────

async function processWhatsAppReminders(istNow: Date, results: any[]) {
  const target = new Date(istNow.getTime() + 15 * 60 * 1000)
  const windowMax = new Date(target.getTime() + 1 * 60 * 1000) // 1-min window

  const targetDate = formatDate(istNow)
  const timeMin = formatTime(target)
  const timeMax = formatTime(windowMax)

  const { data: appointments, error } = await supabase
    .from('doc_appointments')
    .select(`
      *,
      doctor:doc_doctors(full_name, standard_meeting_link)
    `)
    .eq('appointment_date', targetDate)
    .eq('status', 'confirmed')
    .eq('visit_type', 'online')
    .gte('start_time', timeMin)
    .lt('start_time', timeMax)
    .is('reminder_sent', null)

  if (error) {
    console.error('Error fetching WhatsApp reminders:', error)
    return
  }

  if (!appointments || appointments.length === 0) return

  const apiKey = process.env.DOUBLETICK_API_KEY
  const fromNumber = process.env.DOUBLETICK_PHONE_NUMBER

  if (!apiKey || !fromNumber) {
    console.warn('WhatsApp not configured (DOUBLETICK_API_KEY / DOUBLETICK_PHONE_NUMBER)')
    return
  }

  for (const appt of appointments) {
    const meetingLink = appt.meeting_link || appt.doctor?.standard_meeting_link

    if (!appt.patient_phone || !meetingLink) {
      results.push({
        id: appt.id,
        type: 'whatsapp',
        status: 'skipped',
        reason: !appt.patient_phone ? 'No phone number' : 'No meeting link',
      })
      continue
    }

    // Format phone number
    let formattedPhone = appt.patient_phone.replace(/[\s\-()]/g, '')
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone
    }

    const formattedFrom = fromNumber.replace(/[\s\-()]/g, '')
    const doctorName = appt.doctor?.full_name || 'your doctor'
    const timeDisplay = appt.start_time.slice(0, 5)

    try {
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
                      appt.patient_name,
                      doctorName,
                      timeDisplay,
                      meetingLink,
                    ],
                  },
                },
              },
            },
          ],
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // Mark reminder as sent
        await supabase
          .from('doc_appointments')
          .update({ reminder_sent: new Date().toISOString() })
          .eq('id', appt.id)

        results.push({ id: appt.id, type: 'whatsapp', status: 'sent', result })
      } else {
        results.push({ id: appt.id, type: 'whatsapp', status: 'failed', error: result })
      }
    } catch (err) {
      console.error('WhatsApp reminder error for', appt.id, err)
      results.push({ id: appt.id, type: 'whatsapp', status: 'error', error: String(err) })
    }
  }
}

// ─── MAIN CRON HANDLER ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const istNow = getISTNow()
    const results = {
      reminder12h: [] as any[],
      reminder30m: [] as any[],
      reminderWhatsApp: [] as any[],
    }

    // Compute debug info for all windows
    const target12h = new Date(istNow.getTime() + 12 * 60 * 60 * 1000)
    const target30m = new Date(istNow.getTime() + 30 * 60 * 1000)
    const target15m = new Date(istNow.getTime() + 15 * 60 * 1000)

    const debug = {
      istNow: formatDate(istNow) + ' ' + formatTime(istNow),
      reminder12h: {
        targetDate: formatDate(target12h),
        windowMin: formatTime(new Date(target12h.getTime() - 5 * 60 * 1000)),
        windowMax: formatTime(new Date(target12h.getTime() + 5 * 60 * 1000)),
      },
      reminder30m: {
        targetDate: formatDate(target30m),
        windowMin: formatTime(new Date(target30m.getTime() - 2.5 * 60 * 1000)),
        windowMax: formatTime(new Date(target30m.getTime() + 2.5 * 60 * 1000)),
      },
      reminder15m: {
        targetDate: formatDate(istNow),
        windowMin: formatTime(target15m),
        windowMax: formatTime(new Date(target15m.getTime() + 1 * 60 * 1000)),
      },
    }

    // Run all three reminder checks
    await Promise.all([
      process12hReminders(istNow, results.reminder12h),
      process30mReminders(istNow, results.reminder30m),
      processWhatsAppReminders(istNow, results.reminderWhatsApp),
    ])

    return NextResponse.json({
      message: 'Reminder job completed',
      timestamp: new Date().toISOString(),
      istTime: istNow.toISOString(),
      debug,
      results,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
