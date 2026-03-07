import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.zoho.in',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true, // SSL
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return transporter
}

interface EmailOptions {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail({ to, subject, html, from }: EmailOptions) {
  const defaultFrom = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@aisurgeonpilot.com'

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP credentials not configured (SMTP_USER / SMTP_PASS). Skipping email.')
    return null
  }

  const info = await getTransporter().sendMail({
    from: from || `AI Surgeon Pilot <${defaultFrom}>`,
    to,
    subject,
    html,
  })

  return { id: info.messageId }
}

// Email templates
export const emailTemplates = {
  appointmentConfirmation: ({
    patientName,
    doctorName,
    date,
    time,
    visitType,
    amount,
  }: {
    patientName: string
    doctorName: string
    date: string
    time: string
    visitType: string
    amount: number
  }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #16a34a; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Appointment Confirmed</h1>
        </div>
        <div class="content">
          <p>Dear ${patientName},</p>
          <p>Your appointment has been successfully booked!</p>
          <div class="details">
            <p><strong>Doctor:</strong> ${doctorName}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${time}</p>
            <p><strong>Visit Type:</strong> ${visitType}</p>
            <p><strong>Amount Paid:</strong> $${amount}</p>
          </div>
          <p>Please arrive on time for your appointment. For online consultations, you will receive the meeting link before your scheduled time.</p>
        </div>
        <div class="footer">
          <p>AI Surgeon Pilot - Digital Healthcare Platform</p>
        </div>
      </div>
    </body>
    </html>
  `,

  meetingReminder: ({
    patientName,
    doctorName,
    time,
    meetingLink,
  }: {
    patientName: string
    doctorName: string
    time: string
    meetingLink: string
  }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #16a34a; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Appointment is Starting Soon!</h1>
        </div>
        <div class="content">
          <p>Dear ${patientName},</p>
          <p>Your online consultation with <strong>${doctorName}</strong> is starting in 5 minutes at <strong>${time}</strong>.</p>
          <p><a href="${meetingLink}" class="button">Join Meeting</a></p>
          <p>Or copy this link: ${meetingLink}</p>
          <p>Please ensure you have a stable internet connection and your camera/microphone are working.</p>
        </div>
        <div class="footer">
          <p>AI Surgeon Pilot - Digital Healthcare Platform</p>
        </div>
      </div>
    </body>
    </html>
  `,

  appointmentReminder12h: ({
    patientName,
    doctorName,
    date,
    time,
  }: {
    patientName: string
    doctorName: string
    date: string
    time: string
  }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; background: #f9f9f9; }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Appointment Reminder</h1>
        </div>
        <div class="content">
          <p>Dear ${patientName},</p>
          <p>This is a friendly reminder that your online consultation is coming up.</p>
          <div class="details">
            <p><strong>Doctor:</strong> ${doctorName}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${time}</p>
            <p><strong>Visit Type:</strong> Online Video Consultation</p>
          </div>
          <p>You will receive the meeting link 30 minutes before your appointment time.</p>
          <p>If you need to reschedule or cancel, please do so at your earliest convenience.</p>
        </div>
        <div class="footer">
          <p>AI Surgeon Pilot - Digital Healthcare Platform</p>
        </div>
      </div>
    </body>
    </html>
  `,

  appointmentReminder30m: ({
    patientName,
    doctorName,
    time,
    meetingLink,
  }: {
    patientName: string
    doctorName: string
    time: string
    meetingLink: string
  }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 15px 0; font-weight: bold; }
        .meeting-link { word-break: break-all; color: #16a34a; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Appointment Starts in 30 Minutes!</h1>
        </div>
        <div class="content">
          <p>Dear ${patientName},</p>
          <p>Your online consultation with <strong>${doctorName}</strong> is starting soon at <strong>${time}</strong>.</p>
          <p style="text-align: center;">
            <a href="${meetingLink}" class="button">Join Meeting</a>
          </p>
          <p>Or copy this link: <span class="meeting-link">${meetingLink}</span></p>
          <h4>Before Your Appointment:</h4>
          <ul>
            <li>Test your camera and microphone</li>
            <li>Ensure you have a stable internet connection</li>
            <li>Find a quiet, well-lit space</li>
            <li>Have any relevant medical reports ready</li>
          </ul>
        </div>
        <div class="footer">
          <p>AI Surgeon Pilot - Digital Healthcare Platform</p>
        </div>
      </div>
    </body>
    </html>
  `,

  followUpScheduled: ({
    patientName,
    doctorName,
    date,
    time,
    visitType,
    notes,
  }: {
    patientName: string
    doctorName: string
    date: string
    time: string
    visitType: string
    notes?: string
  }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; background: #f9f9f9; }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #7c3aed; }
        .notes { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📅 Follow-up Appointment Scheduled</h1>
        </div>
        <div class="content">
          <p>Dear ${patientName},</p>
          <p><strong>Dr. ${doctorName}</strong> has scheduled a follow-up appointment for you.</p>
          <div class="details">
            <p><strong>📆 Date:</strong> ${date}</p>
            <p><strong>🕐 Time:</strong> ${time}</p>
            <p><strong>📍 Visit Type:</strong> ${visitType === 'online' ? '💻 Online Video Consultation' : '🏥 Physical Visit'}</p>
          </div>
          ${notes ? `<div class="notes"><p><strong>Doctor's Notes:</strong> ${notes}</p></div>` : ''}
          <p>Please mark this date on your calendar. ${visitType === 'online' ? 'You will receive the meeting link before your appointment.' : 'Please arrive 10 minutes before your scheduled time.'}</p>
          <p>If you need to reschedule, please contact us in advance.</p>
        </div>
        <div class="footer">
          <p>AI Surgeon Pilot - Digital Healthcare Platform</p>
        </div>
      </div>
    </body>
    </html>
  `,

  appointmentCancelled: ({
    patientName,
    doctorName,
    date,
    time,
  }: {
    patientName: string
    doctorName: string
    date: string
    time: string
  }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Appointment Cancelled</h1>
        </div>
        <div class="content">
          <p>Dear ${patientName},</p>
          <p>We regret to inform you that your appointment with <strong>${doctorName}</strong> scheduled for <strong>${date}</strong> at <strong>${time}</strong> has been cancelled.</p>
          <p>If you have any questions or would like to reschedule, please contact us.</p>
          <p>Any payments made will be refunded within 5-7 business days.</p>
        </div>
        <div class="footer">
          <p>AI Surgeon Pilot - Digital Healthcare Platform</p>
        </div>
      </div>
    </body>
    </html>
  `,
}
