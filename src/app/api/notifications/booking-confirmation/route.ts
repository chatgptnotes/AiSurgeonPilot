import { NextRequest, NextResponse } from 'next/server'

const DOUBLETICK_API_URL = 'https://public.doubletick.io/whatsapp/message/template'

export async function POST(request: NextRequest) {
  try {
    const {
      patientName,
      patientPhone,
      doctorName,
      appointmentDate,
      appointmentTime,
      visitType
    } = await request.json()

    if (!patientPhone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.DOUBLETICK_API_KEY
    const fromNumber = process.env.DOUBLETICK_PHONE_NUMBER

    if (!apiKey || !fromNumber) {
      console.error('DoubleTick credentials not configured')
      return NextResponse.json(
        { success: false, error: 'WhatsApp service not configured' },
        { status: 500 }
      )
    }

    // Format phone number (remove spaces, ensure country code)
    let formattedPhone = patientPhone.replace(/[\s\-()]/g, '')
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone
    }

    const formattedFrom = fromNumber.replace(/[\s\-()]/g, '')

    // Send WhatsApp template message
    const response = await fetch(DOUBLETICK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            to: formattedPhone,
            from: formattedFrom,
            content: {
              templateName: 'appointment_booked',
              language: 'en',
              templateData: {
                body: {
                  placeholders: [
                    patientName,
                    doctorName,
                    appointmentDate,
                    appointmentTime,
                    visitType
                  ]
                }
              }
            }
          }
        ]
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('DoubleTick error:', result)
      return NextResponse.json(
        { success: false, error: result.message || 'Failed to send WhatsApp message' },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Booking confirmation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send confirmation' },
      { status: 500 }
    )
  }
}
