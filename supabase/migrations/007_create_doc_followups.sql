-- Create doc_followups table for patient follow-ups
CREATE TABLE IF NOT EXISTS doc_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doc_doctors(id) ON DELETE CASCADE,
  patient_id UUID,
  appointment_id UUID REFERENCES doc_appointments(id) ON DELETE SET NULL,
  followup_date DATE NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_doc_followups_doctor_id ON doc_followups(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doc_followups_patient_id ON doc_followups(patient_id);
CREATE INDEX IF NOT EXISTS idx_doc_followups_appointment_id ON doc_followups(appointment_id);
CREATE INDEX IF NOT EXISTS idx_doc_followups_date ON doc_followups(followup_date);
CREATE INDEX IF NOT EXISTS idx_doc_followups_status ON doc_followups(status);

-- Enable Row Level Security
ALTER TABLE doc_followups ENABLE ROW LEVEL SECURITY;

-- Policy: Doctors can view their follow-ups
CREATE POLICY "Doctors can view own followups" ON doc_followups
  FOR SELECT USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

-- Policy: Doctors can create follow-ups
CREATE POLICY "Doctors can create followups" ON doc_followups
  FOR INSERT WITH CHECK (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

-- Policy: Doctors can update their follow-ups
CREATE POLICY "Doctors can update own followups" ON doc_followups
  FOR UPDATE USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

-- Policy: Doctors can delete their follow-ups
CREATE POLICY "Doctors can delete own followups" ON doc_followups
  FOR DELETE USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );
