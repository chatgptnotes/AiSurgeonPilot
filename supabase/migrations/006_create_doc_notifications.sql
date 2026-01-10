-- Create doc_notifications table for notification logs
CREATE TABLE IF NOT EXISTS doc_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doc_doctors(id) ON DELETE CASCADE,
  patient_id UUID,
  appointment_id UUID REFERENCES doc_appointments(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'whatsapp', 'sms')),
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('sent', 'failed', 'pending')),
  sent_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_doc_notifications_doctor_id ON doc_notifications(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doc_notifications_patient_id ON doc_notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_doc_notifications_appointment_id ON doc_notifications(appointment_id);
CREATE INDEX IF NOT EXISTS idx_doc_notifications_status ON doc_notifications(status);
CREATE INDEX IF NOT EXISTS idx_doc_notifications_type ON doc_notifications(type);

-- Enable Row Level Security
ALTER TABLE doc_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Doctors can view their notifications
CREATE POLICY "Doctors can view own notifications" ON doc_notifications
  FOR SELECT USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

-- Policy: Service role can insert notifications
CREATE POLICY "Service can insert notifications" ON doc_notifications
  FOR INSERT WITH CHECK (TRUE);

-- Policy: Service role can update notifications
CREATE POLICY "Service can update notifications" ON doc_notifications
  FOR UPDATE USING (TRUE);
