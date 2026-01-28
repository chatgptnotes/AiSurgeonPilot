import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRecallBot, getRecallBotTranscript, recallTranscriptToText, getBotStatus } from '@/lib/recall/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { appointmentId, botId } = body

    console.log('=== Recall Transcript Fetch ===')

    if (!appointmentId && !botId) {
      return NextResponse.json(
        { error: 'Either appointmentId or botId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let recallBotId = botId

    // If we have an appointmentId, get the bot ID from it
    if (appointmentId) {
      const { data: appointment, error } = await supabase
        .from('doc_appointments')
        .select('recall_bot_id, doctor_id')
        .eq('id', appointmentId)
        .single()

      if (error || !appointment) {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        )
      }

      // Verify the user owns this appointment
      const { data: doctor } = await supabase
        .from('doc_doctors')
        .select('id')
        .eq('user_id', user.id)
        .eq('id', appointment.doctor_id)
        .single()

      if (!doctor) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      recallBotId = appointment.recall_bot_id
    }

    if (!recallBotId) {
      return NextResponse.json(
        { error: 'No Recall bot associated with this appointment' },
        { status: 404 }
      )
    }

    // Get the bot and transcript
    const bot = await getRecallBot(recallBotId)
    const status = getBotStatus(bot)

    // If bot hasn't finished, return status info
    if (status !== 'done') {
      return NextResponse.json({
        success: false,
        status,
        message: `Bot is currently: ${status}. Transcript will be available after the meeting ends.`,
      })
    }

    // Get the transcript
    const transcript = await getRecallBotTranscript(recallBotId)
    const transcriptText = recallTranscriptToText(transcript)

    return NextResponse.json({
      success: true,
      status,
      transcript: transcriptText,
      raw_transcript: transcript,
      video_url: bot.video_url,
    })

  } catch (error) {
    console.error('Error fetching Recall transcript:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch transcript' },
      { status: 500 }
    )
  }
}
