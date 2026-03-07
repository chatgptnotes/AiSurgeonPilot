-- Add email reminder tracking columns to doc_appointments
-- reminder_12h_email_sent: tracks when the 12-hour advance email was sent
-- reminder_30m_email_sent: tracks when the 30-minute advance email (with meeting link) was sent

ALTER TABLE doc_appointments
ADD COLUMN IF NOT EXISTS reminder_12h_email_sent TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE doc_appointments
ADD COLUMN IF NOT EXISTS reminder_30m_email_sent TIMESTAMPTZ DEFAULT NULL;

-- Partial index for efficient querying of appointments needing 12h email reminders
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_12h_email
ON doc_appointments(appointment_date, start_time, status)
WHERE reminder_12h_email_sent IS NULL AND status = 'confirmed';

-- Partial index for efficient querying of appointments needing 30m email reminders
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_30m_email
ON doc_appointments(appointment_date, start_time, status)
WHERE reminder_30m_email_sent IS NULL AND status = 'confirmed';
