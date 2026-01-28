import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createRecallBot } from '@/lib/recall/client'

// CORS headers for cross-origin requests from Patient Portal
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { appointmentId } = body

    console.log('=== Recall Schedule Bot API ===')
    console.log('Appointment ID:', appointmentId)

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = await createServiceClient()

    // Get the appointment details with meeting link
    const { data: appointment, error: appointmentError } = await supabase
      .from('doc_appointments')
      .select('*, doctor:doc_doctors(*)')
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      console.error('Appointment not found:', appointmentError)
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Check if it's an online appointment
    if (appointment.visit_type !== 'online') {
      return NextResponse.json(
        { error: 'Recall bot only needed for online appointments' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Check if meeting link exists
    if (!appointment.meeting_link) {
      return NextResponse.json(
        { error: 'No meeting link found for this appointment' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Check if bot is already scheduled
    if (appointment.recall_bot_id) {
      return NextResponse.json({
        success: true,
        bot_id: appointment.recall_bot_id,
        message: 'Bot already scheduled',
      }, { headers: corsHeaders })
    }

    // Calculate join time (1 minute before appointment start)
    const appointmentDateTime = new Date(
      `${appointment.appointment_date}T${appointment.start_time}`
    )
    const joinAt = new Date(appointmentDateTime.getTime() - 60 * 1000) // 1 min before

    console.log('Scheduling bot to join at:', joinAt.toISOString())

    // Create the Recall bot
    const bot = await createRecallBot({
      meeting_url: appointment.meeting_link,
      join_at: joinAt.toISOString(),
      bot_name: `AI Assistant - Dr. ${appointment.doctor.full_name}`,
      transcription_options: {
        provider: 'default',
      },
      recording_mode: 'speaker_view',
      automatic_leave: {
        waiting_room_timeout: 600, // 10 minutes
        noone_joined_timeout: 600, // 10 minutes
        everyone_left_timeout: 120, // 2 minutes after everyone leaves
      },
    })

    console.log('Recall bot created:', bot.id)

    // Save the bot ID to the appointment
    const { error: updateError } = await supabase
      .from('doc_appointments')
      .update({ recall_bot_id: bot.id })
      .eq('id', appointmentId)

    if (updateError) {
      console.error('Failed to save bot ID:', updateError)
      // Don't fail the request, bot is still scheduled
    }

    return NextResponse.json({
      success: true,
      bot_id: bot.id,
      join_at: joinAt.toISOString(),
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Error scheduling Recall bot:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to schedule bot' },
      { status: 500, headers: corsHeaders }
    )
  }
}
