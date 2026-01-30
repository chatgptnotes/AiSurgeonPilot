import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST - Submit a new account request (public)
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const body = await request.json()
    const {
      fullName,
      email,
      phone,
      specialization,
      qualification,
      experienceYears,
      clinicName,
      clinicAddress,
      licenseNumber,
      reason,
    } = body

    // Validation
    if (!fullName || !email) {
      return NextResponse.json(
        { error: 'Full name and email are required' },
        { status: 400 }
      )
    }

    // Check if email already has a pending request
    const { data: existingRequest } = await supabase
      .from('doc_account_requests')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .single()

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return NextResponse.json(
          { error: 'A request with this email is already pending' },
          { status: 400 }
        )
      }
      if (existingRequest.status === 'approved') {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please login.' },
          { status: 400 }
        )
      }
    }

    // Check if doctor already exists
    const { data: existingDoctor } = await supabase
      .from('doc_doctors')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingDoctor) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please login.' },
        { status: 400 }
      )
    }

    // Create the request
    const { data: newRequest, error: insertError } = await supabase
      .from('doc_account_requests')
      .insert({
        full_name: fullName,
        email: email.toLowerCase(),
        phone: phone || null,
        specialization: specialization || null,
        qualification: qualification || null,
        experience_years: experienceYears || null,
        clinic_name: clinicName || null,
        clinic_address: clinicAddress || null,
        license_number: licenseNumber || null,
        reason: reason || null,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: `Failed to submit request: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Request submitted successfully',
      requestId: newRequest.id,
    })
  } catch (error) {
    console.error('Account request error:', error)
    return NextResponse.json(
      { error: 'Failed to submit request' },
      { status: 500 }
    )
  }
}
