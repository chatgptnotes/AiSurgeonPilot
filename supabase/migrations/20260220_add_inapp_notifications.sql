-- Add in-app notification support to doc_notifications table

-- Drop and recreate the type check constraint to include 'in_app'
ALTER TABLE doc_notifications DROP CONSTRAINT IF EXISTS doc_notifications_type_check;
ALTER TABLE doc_notifications ADD CONSTRAINT doc_notifications_type_check
  CHECK (type IN ('email', 'whatsapp', 'sms', 'in_app'));

-- Add new columns for in-app notifications
ALTER TABLE doc_notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE doc_notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE doc_notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE doc_notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Index for fetching unread in-app notifications (doctor)
CREATE INDEX IF NOT EXISTS idx_doc_notifications_inapp
  ON doc_notifications(doctor_id, type, is_read)
  WHERE type = 'in_app';

-- Index for fetching patient in-app notifications
CREATE INDEX IF NOT EXISTS idx_doc_notifications_patient_inapp
  ON doc_notifications(patient_id, type, is_read)
  WHERE type = 'in_app' AND patient_id IS NOT NULL;

-- Policy: Patients can view their own notifications
CREATE POLICY "Patients can view own notifications" ON doc_notifications
  FOR SELECT USING (
    patient_id IS NOT NULL AND
    patient_id IN (SELECT id FROM doc_patients WHERE user_id = auth.uid())
  );

-- Policy: Patients can update their own notifications (mark as read)
CREATE POLICY "Patients can update own notifications" ON doc_notifications
  FOR UPDATE USING (
    patient_id IS NOT NULL AND
    patient_id IN (SELECT id FROM doc_patients WHERE user_id = auth.uid())
  );
