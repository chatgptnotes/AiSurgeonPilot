import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, getZoomUser } from '@/lib/zoom/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings?zoom_error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings?zoom_error=missing_params', request.url)
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.id !== state) {
      return NextResponse.redirect(
        new URL('/settings?zoom_error=unauthorized', request.url)
      )
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Get Zoom user info
    const zoomUser = await getZoomUser(tokens.access_token)

    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Update doctor record with Zoom tokens
    const { error: updateError } = await supabase
      .from('doc_doctors')
      .update({
        zoom_access_token: tokens.access_token,
        zoom_refresh_token: tokens.refresh_token,
        zoom_token_expires_at: expiresAt,
        zoom_user_id: zoomUser.id,
        zoom_connected_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error saving Zoom tokens:', updateError)
      return NextResponse.redirect(
        new URL('/settings?zoom_error=save_failed', request.url)
      )
    }

    return NextResponse.redirect(
      new URL('/meetings?zoom_connected=true', request.url)
    )
  } catch (error) {
    console.error('Error in Zoom callback:', error)
    return NextResponse.redirect(
      new URL('/settings?zoom_error=unknown', request.url)
    )
  }
}
