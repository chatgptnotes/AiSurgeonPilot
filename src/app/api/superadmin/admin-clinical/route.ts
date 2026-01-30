import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { verifySuperAdmin, isAuthError } from '@/lib/auth/verify-role'

// POST - Create new admin clinical
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySuperAdmin()
    if (isAuthError(authResult)) {
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

    const body = await request.json()
    const {
      fullName,
      email,
      phone,
      organizationName,
      designation,
      department,
      address,
      city,
      state,
      pincode,
      password,
      sendEmail,
      sendWhatsApp,
    } = body

    // Validation
    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: 'Full name, email, and password are required' },
        { status: 400 }
      )
    }

    if (!organizationName || !designation) {
      return NextResponse.json(
        { error: 'Organization name and designation are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('doc_doctors')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
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
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Create admin clinical profile
    const { data: newAdmin, error: profileError } = await supabaseAdmin
      .from('doc_doctors')
      .insert({
        user_id: authData.user.id,
        email: email.toLowerCase(),
        full_name: fullName,
        phone: phone || null,
        clinic_name: organizationName,
        designation: designation,
        department: department || null,
        clinic_address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        role: 'admin_clinical',
        is_verified: true,
        must_change_password: true,
        created_by: authResult.doctorId,
        is_active: true,
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Send credentials via email
    if (sendEmail) {
      try {
        await sendCredentialsEmail({
          email: email.toLowerCase(),
          fullName,
          password,
          loginUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://aisurgeonpilot.com',
        })
      } catch (emailError) {
        console.error('Email send error:', emailError)
      }
    }

    // Send credentials via WhatsApp
    if (sendWhatsApp && phone) {
      try {
        await sendCredentialsWhatsApp({
          phone,
          fullName,
          email: email.toLowerCase(),
          password,
        })
      } catch (whatsappError) {
        console.error('WhatsApp send error:', whatsappError)
      }
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: newAdmin.id,
        email: newAdmin.email,
        full_name: newAdmin.full_name,
      },
    })
  } catch (error) {
    console.error('Create admin clinical error:', error)
    return NextResponse.json(
      { error: 'Failed to create admin clinical' },
      { status: 500 }
    )
  }
}

// GET - List all admin clinical users
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdmin()
    if (isAuthError(authResult)) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const supabase = await createServerClient()

    const { data: admins, error } = await supabase
      .from('doc_doctors')
      .select('*')
      .eq('role', 'admin_clinical')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ admins })
  } catch (error) {
    console.error('List admin clinical error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin clinical users' },
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
      subject: 'Welcome to AiSurgeonPilot - Admin Clinical Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to AiSurgeonPilot</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p>Dear ${fullName},</p>

            <p>Your Admin Clinical account has been created on AiSurgeonPilot. As an Admin Clinical, you will be able to create and manage doctor accounts.</p>

            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 0 0 10px 0;"><strong>Temporary Password:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${password}</code></p>
              <p style="margin: 0;"><strong>Login URL:</strong> <a href="${loginUrl}/login" style="color: #4F46E5;">${loginUrl}/login</a></p>
            </div>

            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400E;"><strong>Important:</strong> For security, you will be required to change your password on first login.</p>
            </div>

            <p>If you have any questions, please contact your administrator.</p>

            <p>Best regards,<br>AiSurgeonPilot Team</p>
          </div>

          <p style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 20px;">
            This is an automated message. Please do not reply to this email.
          </p>
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

  const message = `Welcome to AiSurgeonPilot, ${fullName}!

Your Admin Clinical account has been created.

Login credentials:
Email: ${email}
Temporary Password: ${password}

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
