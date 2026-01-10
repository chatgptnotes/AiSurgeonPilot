interface DoubleTickMessage {
  to: string
  type: 'text' | 'template'
  text?: {
    body: string
  }
  template?: {
    name: string
    language: {
      code: string
    }
    components?: Array<{
      type: string
      parameters: Array<{
        type: string
        text?: string
      }>
    }>
  }
}

const DOUBLETICK_API_URL = 'https://public.doubletick.io/whatsapp'

export async function sendWhatsAppMessage({
  phoneNumber,
  message,
}: {
  phoneNumber: string
  message: string
}) {
  const apiKey = process.env.DOUBLETICK_API_KEY

  if (!apiKey) {
    throw new Error('DoubleTick API key not configured')
  }

  // Format phone number (remove + and spaces)
  const formattedPhone = phoneNumber.replace(/[\s+]/g, '')

  const response = await fetch(`${DOUBLETICK_API_URL}/message/text`, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: formattedPhone,
      type: 'text',
      text: {
        body: message,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to send WhatsApp message')
  }

  return response.json()
}

export async function sendWhatsAppTemplate({
  phoneNumber,
  templateName,
  languageCode = 'en',
  parameters = [],
}: {
  phoneNumber: string
  templateName: string
  languageCode?: string
  parameters?: string[]
}) {
  const apiKey = process.env.DOUBLETICK_API_KEY
  const fromNumber = process.env.DOUBLETICK_PHONE_NUMBER

  if (!apiKey) {
    throw new Error('DoubleTick API key not configured')
  }

  if (!fromNumber) {
    throw new Error('DoubleTick phone number not configured')
  }

  // Format phone number (remove + and spaces)
  const formattedPhone = phoneNumber.replace(/[\s+]/g, '')
  const formattedFrom = fromNumber.replace(/[\s+]/g, '')

  // Generate a simple messageId
  const messageId = crypto.randomUUID()

  const requestBody = {
    messages: [
      {
        content: {
          language: languageCode,
          templateName: templateName,
          templateData: {
            body: {
              placeholders: parameters,
            },
          },
        },
        from: formattedFrom,
        to: formattedPhone,
        messageId: messageId,
      },
    ],
  }

  console.log('DoubleTick request:', JSON.stringify(requestBody, null, 2))

  const response = await fetch(`${DOUBLETICK_API_URL}/message/template`, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  const responseData = await response.json()
  console.log('DoubleTick response:', JSON.stringify(responseData, null, 2))

  if (!response.ok) {
    throw new Error(responseData.message || responseData.error || 'Failed to send WhatsApp template')
  }

  return responseData
}

// Pre-defined message templates
export const messageTemplates = {
  appointmentConfirmation: (patientName: string, doctorName: string, date: string, time: string, visitType: string) =>
    `Hello ${patientName}! Your appointment with ${doctorName} has been confirmed for ${date} at ${time}. Visit type: ${visitType}. Please arrive on time.`,

  appointmentReminder: (patientName: string, doctorName: string, date: string, time: string, meetingLink?: string) =>
    `Reminder: ${patientName}, your appointment with ${doctorName} is tomorrow (${date}) at ${time}.${meetingLink ? ` Join here: ${meetingLink}` : ''}`,

  meetingLinkReminder: (patientName: string, meetingLink: string) =>
    `Hello ${patientName}! Your online consultation is starting in 5 minutes. Join here: ${meetingLink}`,

  appointmentCancelled: (patientName: string, date: string, time: string) =>
    `Hello ${patientName}, your appointment scheduled for ${date} at ${time} has been cancelled. Please contact us if you have any questions.`,
}
