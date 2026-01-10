import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMeetingSummary } from '@/lib/gemini/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { meetingId, transcript } = await request.json()

    if (!meetingId || !transcript) {
      return NextResponse.json(
        { error: 'Meeting ID and transcript are required' },
        { status: 400 }
      )
    }

    // Verify the meeting belongs to the doctor
    const { data: meeting, error: meetingError } = await supabase
      .from('doc_meetings')
      .select('*, doctor:doc_doctors!inner(*)')
      .eq('id', meetingId)
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    if (meeting.doctor.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Generate summary using Gemini
    const { summary, diagnosis, prescription } = await generateMeetingSummary(transcript)

    // Update the meeting record
    const { error: updateError } = await supabase
      .from('doc_meetings')
      .update({
        transcript,
        summary,
        diagnosis,
        prescription,
      })
      .eq('id', meetingId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save summary' }, { status: 500 })
    }

    return NextResponse.json({ summary, diagnosis, prescription })
  } catch (error) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
