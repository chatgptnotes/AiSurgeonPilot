import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import slugify from 'slugify'

function generateBookingSlug(name: string) {
  const slug = slugify(name, { lower: true, strict: true })
  const randomSuffix = Math.random().toString(36).substring(2, 6)
  return `dr-${slug}-${randomSuffix}`
}

export async function POST(request: NextRequest) {
  try {
    // Check environment variables first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('Supabase URL exists:', !!supabaseUrl)
    console.log('Service Role Key exists:', !!serviceRoleKey)

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables')
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      )
    }

    // Create admin client inside the handler
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const body = await request.json()
    const { email, password, fullName } = body

    console.log('Signup attempt for:', email)

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      )
    }

    // Create the user using admin client
    console.log('Creating auth user...')
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      console.error('No user returned from createUser')
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    console.log('Auth user created:', authData.user.id)

    // Create doctor profile
    const bookingSlug = generateBookingSlug(fullName)
    console.log('Creating doctor profile with slug:', bookingSlug)

    const { error: profileError } = await supabaseAdmin
      .from('doc_doctors')
      .insert({
        user_id: authData.user.id,
        email: email,
        full_name: fullName,
        booking_slug: bookingSlug,
      })

    if (profileError) {
      console.error('Profile error:', profileError)
      // Delete auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    console.log('Doctor profile created successfully')

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    })
  } catch (error) {
    console.error('Signup error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: `Signup failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}
