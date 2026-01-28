import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createZoomMeeting, refreshAccessToken } from '@/lib/zoom/client'

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

    console.log('=== Zoom Create Meeting API ===')
    console.log('Request body:', body)
    console.log('Appointment ID:', appointmentId)

    if (!appointmentId) {
      console.log('ERROR: No appointment ID provided')
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = await createServiceClient()

    // Get the appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from('doc_appointments')
      .select('*, doctor:doc_doctors(*)')
      .eq('id', appointmentId)
      .single()

    console.log('Appointment query result:', { appointment, error: appointmentError })

    if (appointmentError || !appointment) {
      console.log('ERROR: Appointment not found. Error:', appointmentError)
      return NextResponse.json(
        { error: 'Appointment not found', details: appointmentError?.message },
        { status: 404, headers: corsHeaders }
      )
    }

    // Check if it's an online appointment
    if (appointment.visit_type !== 'online') {
      return NextResponse.json(
        { error: 'Meeting link only needed for online appointments' },
        { status: 400, headers: corsHeaders }
      )
    }

    const doctor = appointment.doctor

    // Check if doctor has Zoom connected
    if (!doctor.zoom_access_token || !doctor.zoom_refresh_token) {
      // Use standard meeting link if available
      if (doctor.standard_meeting_link) {
        const { error: updateError } = await supabase
          .from('doc_appointments')
          .update({ meeting_link: doctor.standard_meeting_link })
          .eq('id', appointmentId)

        if (updateError) {
          throw updateError
        }

        return NextResponse.json({
          success: true,
          meeting_link: doctor.standard_meeting_link,
          source: 'standard_link'
        }, { headers: corsHeaders })
      }

      return NextResponse.json(
        { error: 'Doctor has not connected Zoom account' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Check if token is expired and refresh if needed
    let accessToken = doctor.zoom_access_token
    const tokenExpiresAt = new Date(doctor.zoom_token_expires_at)

    if (tokenExpiresAt < new Date()) {
      // Token expired, refresh it
      try {
        const newTokens = await refreshAccessToken(doctor.zoom_refresh_token)
        accessToken = newTokens.access_token

        // Update tokens in database
        const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
        await supabase
          .from('doc_doctors')
          .update({
            zoom_access_token: newTokens.access_token,
            zoom_refresh_token: newTokens.refresh_token,
            zoom_token_expires_at: newExpiresAt,
          })
          .eq('id', doctor.id)
      } catch (refreshError) {
        console.error('Failed to refresh Zoom token:', refreshError)
        return NextResponse.json(
          { error: 'Zoom token expired. Please reconnect Zoom.' },
          { status: 401, headers: corsHeaders }
        )
      }
    }

    // Create the Zoom meeting
    const startDateTime = `${appointment.appointment_date}T${appointment.start_time}`
    const startTime = new Date(startDateTime)

    // Calculate duration in minutes
    const endTime = new Date(`${appointment.appointment_date}T${appointment.end_time}`)
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

    const meeting = await createZoomMeeting(accessToken, {
      topic: `Consultation with Dr. ${doctor.full_name}`,
      start_time: startTime.toISOString(),
      duration: durationMinutes || 30,
      agenda: `Online consultation appointment with ${appointment.patient_name}`,
      settings: {
        join_before_host: true,
        waiting_room: false,
        auto_recording: 'cloud',
      },
    })

    // Update the appointment with the meeting link
    const { error: updateError } = await supabase
      .from('doc_appointments')
      .update({
        meeting_link: meeting.join_url,
      })
      .eq('id', appointmentId)

    if (updateError) {
      console.error('Failed to update appointment with meeting link:', updateError)
      throw updateError
    }

    return NextResponse.json({
      success: true,
      meeting_link: meeting.join_url,
      meeting_id: meeting.id,
      start_url: meeting.start_url,
      source: 'zoom_created'
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Error creating Zoom meeting:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create meeting' },
      { status: 500, headers: corsHeaders }
    )
  }
}
