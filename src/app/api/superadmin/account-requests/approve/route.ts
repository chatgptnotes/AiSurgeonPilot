import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import slugify from 'slugify'

function generateBookingSlug(name: string) {
  const slug = slugify(name, { lower: true, strict: true })
  const randomSuffix = Math.random().toString(36).substring(2, 6)
  return `dr-${slug}-${randomSuffix}`
}

function generatePassword(length = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'
  const allChars = uppercase + lowercase + numbers + symbols

  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  return password.split('').sort(() => Math.random() - 0.5).join('')
}

// Verify the request is from a superadmin
async function verifySuperAdmin() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { error: 'Unauthorized', status: 401 }
  }

  const { data: doctor } = await supabase
    .from('doc_doctors')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!doctor || doctor.role !== 'superadmin') {
    return { error: 'Forbidden: SuperAdmin access required', status: 403 }
  }

  return { superAdminId: doctor.id }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySuperAdmin()
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const supabase = await createServerClient()

    const body = await request.json()
    const { requestId } = body

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      )
    }

    // Get the request details
    const { data: accountRequest, error: requestError } = await supabase
      .from('doc_account_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (requestError || !accountRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    if (accountRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'This request has already been processed' },
        { status: 400 }
      )
    }

    // Check if doctor with this email already exists
    const { data: existingDoctor } = await supabaseAdmin
      .from('doc_doctors')
      .select('id')
      .eq('email', accountRequest.email)
      .single()

    if (existingDoctor) {
      return NextResponse.json(
        { error: 'A doctor with this email already exists' },
        { status: 400 }
      )
    }

    // Generate password
    const password = generatePassword()

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: accountRequest.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: accountRequest.full_name,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Create doctor profile
    const bookingSlug = generateBookingSlug(accountRequest.full_name)

    const { error: profileError } = await supabaseAdmin
      .from('doc_doctors')
      .insert({
        user_id: authData.user.id,
        email: accountRequest.email,
        full_name: accountRequest.full_name,
        phone: accountRequest.phone,
        specialization: accountRequest.specialization,
        qualification: accountRequest.qualification,
        experience_years: accountRequest.experience_years,
        clinic_name: accountRequest.clinic_name,
        clinic_address: accountRequest.clinic_address,
        booking_slug: bookingSlug,
        is_verified: true,
        must_change_password: true,
        created_by: authResult.superAdminId,
        role: 'doctor',
        is_active: true,
      })

    if (profileError) {
      console.error('Profile error:', profileError)
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Update the request status
    await supabaseAdmin
      .from('doc_account_requests')
      .update({
        status: 'approved',
        reviewed_by: authResult.superAdminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    // Send credentials via email
    try {
      await sendCredentialsEmail({
        email: accountRequest.email,
        fullName: accountRequest.full_name,
        password,
        loginUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://aisurgeonpilot.com',
      })
    } catch (emailError) {
      console.error('Email send error:', emailError)
    }

    // Send via WhatsApp if phone exists
    if (accountRequest.phone) {
      try {
        await sendCredentialsWhatsApp({
          phone: accountRequest.phone,
          fullName: accountRequest.full_name,
          email: accountRequest.email,
          password,
        })
      } catch (whatsappError) {
        console.error('WhatsApp send error:', whatsappError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Request approved and doctor account created',
    })
  } catch (error) {
    console.error('Approve request error:', error)
    return NextResponse.json(
      { error: 'Failed to approve request' },
      { status: 500 }
    )
  }
}

// Helper function to send credentials via email
async function sendCredentialsEmail({
  email,
  fullName,
  password,
  loginUrl,
}: {
  email: string
  fullName: string
  password: string
  loginUrl: string
}) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.log('Resend API key not configured, skipping email')
    return
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'AiSurgeonPilot <noreply@aisurgeonpilot.com>',
      to: email,
      subject: 'Your AiSurgeonPilot Account Has Been Approved!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Account Approved!</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p>Dear Dr. ${fullName},</p>

            <p>Great news! Your account request has been approved. Welcome to AiSurgeonPilot!</p>

            <p>Below are your login credentials:</p>

            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 0 0 10px 0;"><strong>Temporary Password:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${password}</code></p>
              <p style="margin: 0;"><strong>Login URL:</strong> <a href="${loginUrl}/login" style="color: #16a34a;">${loginUrl}/login</a></p>
            </div>

            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400E;"><strong>Important:</strong> For security, you will be required to change your password on first login.</p>
            </div>

            <p>If you have any questions, please contact support.</p>

            <p>Best regards,<br>AiSurgeonPilot Team</p>
          </div>
        </body>
        </html>
      `,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to send email')
  }
}

// Helper function to send credentials via WhatsApp
async function sendCredentialsWhatsApp({
  phone,
  fullName,
  email,
  password,
}: {
  phone: string
  fullName: string
  email: string
  password: string
}) {
  const doubleTickApiKey = process.env.DOUBLETICK_API_KEY
  if (!doubleTickApiKey) {
    console.log('DoubleTick API key not configured, skipping WhatsApp')
    return
  }

  let formattedPhone = phone.replace(/[\s-]/g, '')
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+91' + formattedPhone
  }

  const message = `Congratulations Dr. ${fullName}!

Your AiSurgeonPilot account has been approved.

Login credentials:
Email: ${email}
Password: ${password}

Login at: https://aisurgeonpilot.com/login

Please change your password after first login.

- AiSurgeonPilot Team`

  const response = await fetch('https://public.doubletick.io/whatsapp/message/text', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${doubleTickApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: formattedPhone,
      content: {
        text: message,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to send WhatsApp message')
  }
}
