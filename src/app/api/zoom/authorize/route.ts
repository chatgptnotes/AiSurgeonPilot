import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getZoomAuthUrl } from '@/lib/zoom/client'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use user ID as state for security
    const state = user.id
    const authUrl = getZoomAuthUrl(state)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Error initiating Zoom OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Zoom authorization' },
      { status: 500 }
    )
  }
}
