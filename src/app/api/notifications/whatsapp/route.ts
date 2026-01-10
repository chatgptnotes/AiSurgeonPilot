import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/doubletick/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { phoneNumber, message } = await request.json()

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      )
    }

    // Get doctor ID
    const { data: doctor } = await supabase
      .from('doc_doctors')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    // Send WhatsApp message
    const result = await sendWhatsAppMessage({ phoneNumber, message })

    // Log notification
    await supabase
      .from('doc_notifications')
      .insert({
        doctor_id: doctor.id,
        type: 'whatsapp',
        channel: 'manual',
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: {
          phone: phoneNumber,
          message,
          response: result,
        },
      })

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('WhatsApp send error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
