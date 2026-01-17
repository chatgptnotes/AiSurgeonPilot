import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRecordings, refreshAccessToken, findTranscriptFile } from '@/lib/zoom/client'

async function getValidAccessToken(supabase: Awaited<ReturnType<typeof createClient>>, doctorId: string, doctor: {
  zoom_access_token: string | null
  zoom_refresh_token: string | null
  zoom_token_expires_at: string | null
}): Promise<string | null> {
  if (!doctor.zoom_access_token || !doctor.zoom_refresh_token) {
    return null
  }

  // Check if token is expired or about to expire (within 5 minutes)
  const expiresAt = doctor.zoom_token_expires_at
    ? new Date(doctor.zoom_token_expires_at)
    : new Date(0)
  const now = new Date()
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

  if (expiresAt > fiveMinutesFromNow) {
    return doctor.zoom_access_token
  }

  // Token is expired or expiring soon, refresh it
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    if (!doctor.zoom_access_token) {
      return NextResponse.json({ error: 'Zoom not connected' }, { status: 400 })
    }

    const accessToken = await getValidAccessToken(supabase, doctor.id, doctor)

    if (!accessToken) {
      return NextResponse.json({ error: 'Zoom token expired, please reconnect' }, { status: 401 })
    }

    // Get date range from query params or default to last 30 days
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const toDate = searchParams.get('to') || new Date().toISOString().split('T')[0]

    const recordings = await getRecordings(accessToken, fromDate, toDate)

    // Transform recordings for frontend
    const transformedRecordings = recordings.meetings.map(meeting => ({
      id: meeting.id,
      uuid: meeting.uuid,
      topic: meeting.topic,
      startTime: meeting.start_time,
      duration: meeting.duration,
      hasTranscript: findTranscriptFile(meeting.recording_files) !== null,
      recordingCount: meeting.recording_count,
    }))

    return NextResponse.json({
      recordings: transformedRecordings,
      totalRecords: recordings.total_records,
    })
  } catch (error) {
    console.error('Error fetching recordings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recordings' },
      { status: 500 }
    )
  }
}
