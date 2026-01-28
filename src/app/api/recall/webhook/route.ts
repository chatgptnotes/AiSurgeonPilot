import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getRecallBot, getRecallBotTranscript, recallTranscriptToText } from '@/lib/recall/client'

// Recall.ai webhook events
type RecallWebhookEvent =
  | 'bot.status_change'
  | 'bot.transcription_complete'
  | 'bot.recording_complete'
  | 'bot.media_upload_complete'

interface RecallWebhookPayload {
  event: RecallWebhookEvent
  data: {
    bot_id: string
    status?: {
      code: string
      message: string | null
    }
    transcript_url?: string
    recording_url?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload: RecallWebhookPayload = await request.json()

    console.log('=== Recall Webhook ===')
    console.log('Event:', payload.event)
    console.log('Bot ID:', payload.data.bot_id)

    const supabase = await createServiceClient()

    // Find the appointment with this bot ID
    const { data: appointment, error: appointmentError } = await supabase
      .from('doc_appointments')
      .select('*, doctor:doc_doctors(*)')
      .eq('recall_bot_id', payload.data.bot_id)
      .single()

    if (appointmentError || !appointment) {
      console.log('No appointment found for bot:', payload.data.bot_id)
      // Return 200 to acknowledge webhook even if we don't have the appointment
      return NextResponse.json({ received: true })
    }

    switch (payload.event) {
      case 'bot.status_change':
        console.log('Bot status changed:', payload.data.status?.code)

        // If meeting ended, fetch transcript
        if (payload.data.status?.code === 'done') {
          await handleMeetingComplete(supabase, appointment, payload.data.bot_id)
        }
        break

      case 'bot.transcription_complete':
        console.log('Transcription complete')
        await handleTranscriptComplete(supabase, appointment, payload.data.bot_id)
        break

      case 'bot.recording_complete':
        console.log('Recording complete:', payload.data.recording_url)
        // Could save recording URL if needed
        break

      default:
        console.log('Unhandled event:', payload.event)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Recall webhook error:', error)
    // Return 200 anyway to prevent retries
    return NextResponse.json({ received: true, error: 'Processing failed' })
  }
}

async function handleMeetingComplete(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  appointment: { id: string; doctor_id: string; patient_id?: string },
  botId: string
) {
  try {
    // Get the transcript from Recall
    const transcript = await getRecallBotTranscript(botId)
    const transcriptText = recallTranscriptToText(transcript)

    console.log('Transcript length:', transcriptText.length)

    // Check if meeting record exists
    const { data: existingMeeting } = await supabase
      .from('doc_meetings')
      .select('id')
      .eq('appointment_id', appointment.id)
      .single()

    if (existingMeeting) {
      // Update existing meeting with transcript
      await supabase
        .from('doc_meetings')
        .update({
          transcript: transcriptText,
          ended_at: new Date().toISOString(),
        })
        .eq('id', existingMeeting.id)
    } else {
      // Create new meeting record
      await supabase
        .from('doc_meetings')
        .insert({
          appointment_id: appointment.id,
          doctor_id: appointment.doctor_id,
          patient_id: appointment.patient_id || null,
          transcript: transcriptText,
          ended_at: new Date().toISOString(),
        })
    }

    // Update appointment status to completed
    await supabase
      .from('doc_appointments')
      .update({ status: 'completed' })
      .eq('id', appointment.id)

    console.log('Meeting and transcript saved successfully')

  } catch (error) {
    console.error('Error handling meeting complete:', error)
  }
}

async function handleTranscriptComplete(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  appointment: { id: string; doctor_id: string; patient_id?: string },
  botId: string
) {
  // Same as handleMeetingComplete - just fetch and save transcript
  await handleMeetingComplete(supabase, appointment, botId)
}

// Webhook verification (if Recall sends verification requests)
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('challenge')
  if (challenge) {
    return NextResponse.json({ challenge })
  }
  return NextResponse.json({ status: 'ok' })
}
