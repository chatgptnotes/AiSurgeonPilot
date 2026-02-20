-- Add is_rescheduled flag to doc_appointments
ALTER TABLE doc_appointments ADD COLUMN IF NOT EXISTS is_rescheduled BOOLEAN DEFAULT FALSE;
