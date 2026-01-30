import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { verifySuperAdmin, isAuthError } from '@/lib/auth/verify-role'

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
    const supabase = await createServerClient()

    const body = await request.json()
    const { adminId } = body

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID is required' },
        { status: 400 }
      )
    }

    // Get admin clinical details
    const { data: admin, error: adminError } = await supabase
      .from('doc_doctors')
      .select('*')
      .eq('id', adminId)
      .eq('role', 'admin_clinical')
      .single()

    if (adminError || !admin) {
      return NextResponse.json(
        { error: 'Admin Clinical not found' },
        { status: 404 }
      )
    }

    // Generate new password
    const newPassword = generatePassword()

    // Update password in auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      admin.user_id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to reset password' },
        { status: 500 }
      )
    }

    // Mark as must change password
    await supabase
      .from('doc_doctors')
      .update({ must_change_password: true })
      .eq('id', adminId)

    // Send new credentials via email
    try {
      await sendCredentialsEmail({
        email: admin.email,
        fullName: admin.full_name,
        password: newPassword,
        loginUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://aisurgeonpilot.com',
      })
    } catch (emailError) {
      console.error('Email send error:', emailError)
    }

    // Send via WhatsApp if phone exists
    if (admin.phone) {
      try {
        await sendCredentialsWhatsApp({
          phone: admin.phone,
          fullName: admin.full_name,
          email: admin.email,
          password: newPassword,
        })
      } catch (whatsappError) {
        console.error('WhatsApp send error:', whatsappError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Credentials resent successfully',
    })
  } catch (error) {
    console.error('Resend credentials error:', error)
    return NextResponse.json(
      { error: 'Failed to resend credentials' },
      { status: 500 }
    )
  }
}

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
      subject: 'Your AiSurgeonPilot Password Has Been Reset',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p>Dear ${fullName},</p>

            <p>Your Admin Clinical password has been reset by an administrator. Below are your new login credentials:</p>

            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 0 0 10px 0;"><strong>New Password:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${password}</code></p>
              <p style="margin: 0;"><strong>Login URL:</strong> <a href="${loginUrl}/login" style="color: #4F46E5;">${loginUrl}/login</a></p>
            </div>

            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400E;"><strong>Important:</strong> For security, you will be required to change your password on first login.</p>
            </div>

            <p>If you did not request this password reset, please contact your administrator immediately.</p>

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

  const message = `${fullName}, your AiSurgeonPilot Admin Clinical password has been reset.

New credentials:
Email: ${email}
Password: ${password}

Login at: https://aisurgeonpilot.com/login

Please change your password after login.

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
