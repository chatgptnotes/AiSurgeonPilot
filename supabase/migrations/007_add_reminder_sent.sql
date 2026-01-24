-- Add reminder_sent column to track which appointments have received the 15-minute reminder
ALTER TABLE doc_appointments
ADD COLUMN IF NOT EXISTS reminder_sent TIMESTAMPTZ DEFAULT NULL;

-- Add index for efficient querying of appointments needing reminders
CREATE INDEX IF NOT EXISTS idx_appointments_reminder
ON doc_appointments(appointment_date, start_time, status, reminder_sent)
WHERE reminder_sent IS NULL AND status = 'confirmed';
