import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getMeetingRecordings,
  refreshAccessToken,
  downloadTranscript,
  parseVttToText,
  findTranscriptFile,
} from '@/lib/zoom/client'

async function getValidAccessToken(supabase: Awaited<ReturnType<typeof createClient>>, doctorId: string, doctor: {
  zoom_access_token: string | null
  zoom_refresh_token: string | null
  zoom_token_expires_at: string | null
}): Promise<string | null> {
  if (!doctor.zoom_access_token || !doctor.zoom_refresh_token) {
    return null
  }

  const expiresAt = doctor.zoom_token_expires_at
    ? new Date(doctor.zoom_token_expires_at)
    : new Date(0)
  const now = new Date()
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

  if (expiresAt > fiveMinutesFromNow) {
    return doctor.zoom_access_token
  }

  try {
    const newTokens = await refreshAccessToken(doctor.zoom_refresh_token)
    const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString()

    await supabase
      .from('doc_doctors')
      .update({
        zoom_access_token: newTokens.access_token,
        zoom_refresh_token: newTokens.refresh_token,
        zoom_token_expires_at: newExpiresAt,
      })
      .eq('id', doctorId)

    return newTokens.access_token
  } catch (error) {
    console.error('Error refreshing Zoom token:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { meetingId, zoomMeetingId } = await request.json()

    if (!meetingId || !zoomMeetingId) {
      return NextResponse.json(
        { error: 'Meeting ID and Zoom meeting ID are required' },
        { status: 400 }
      )
    }

    // Get doctor with Zoom tokens
    const { data: doctor, error: doctorError } = await supabase
      .from('doc_doctors')
      .select('id, zoom_access_token, zoom_refresh_token, zoom_token_expires_at')
      .eq('user_id', user.id)
      .single()

    if (doctorError || !doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    // Verify the meeting belongs to this doctor
    const { data: meeting, error: meetingError } = await supabase
      .from('doc_meetings')
      .select('id')
      .eq('id', meetingId)
      .eq('doctor_id', doctor.id)
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    if (!doctor.zoom_access_token) {
      return NextResponse.json({ error: 'Zoom not connected' }, { status: 400 })
    }

    const accessToken = await getValidAccessToken(supabase, doctor.id, doctor)

    if (!accessToken) {
      return NextResponse.json({ error: 'Zoom token expired, please reconnect' }, { status: 401 })
    }

    // Get meeting recordings from Zoom
    const recordings = await getMeetingRecordings(accessToken, zoomMeetingId)

    // Find transcript file
    const transcriptFile = findTranscriptFile(recordings.recording_files)

    if (!transcriptFile) {
      return NextResponse.json(
        { error: 'No transcript available for this meeting. Ensure "Audio transcript" is enabled in Zoom settings.' },
        { status: 404 }
      )
    }

    // Download and parse transcript
    const vttContent = await downloadTranscript(accessToken, transcriptFile.download_url)
    const transcript = parseVttToText(vttContent)

    // Save transcript to meeting record
    const { error: updateError } = await supabase
      .from('doc_meetings')
      .update({ transcript })
      .eq('id', meetingId)

    if (updateError) {
      console.error('Error saving transcript:', updateError)
      return NextResponse.json({ error: 'Failed to save transcript' }, { status: 500 })
    }

    return NextResponse.json({
      transcript,
      meetingTopic: recordings.topic,
      meetingDate: recordings.start_time,
    })
  } catch (error) {
    console.error('Error fetching transcript:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transcript' },
      { status: 500 }
    )
  }
}
