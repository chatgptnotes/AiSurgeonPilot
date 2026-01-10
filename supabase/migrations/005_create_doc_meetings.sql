-- Create doc_meetings table for meeting records and summaries
CREATE TABLE IF NOT EXISTS doc_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES doc_appointments(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doc_doctors(id) ON DELETE CASCADE,
  patient_id UUID,
  meeting_link TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  transcript TEXT,
  summary TEXT,
  diagnosis TEXT,
  prescription TEXT,
  follow_up_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_doc_meetings_appointment_id ON doc_meetings(appointment_id);
CREATE INDEX IF NOT EXISTS idx_doc_meetings_doctor_id ON doc_meetings(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doc_meetings_patient_id ON doc_meetings(patient_id);

-- Enable Row Level Security
ALTER TABLE doc_meetings ENABLE ROW LEVEL SECURITY;

-- Policy: Doctors can view their meetings
CREATE POLICY "Doctors can view own meetings" ON doc_meetings
  FOR SELECT USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

-- Policy: Doctors can create meetings
CREATE POLICY "Doctors can create meetings" ON doc_meetings
  FOR INSERT WITH CHECK (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

-- Policy: Doctors can update their meetings
CREATE POLICY "Doctors can update own meetings" ON doc_meetings
  FOR UPDATE USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

-- Policy: Patients can view their own meetings
CREATE POLICY "Patients can view own meetings" ON doc_meetings
  FOR SELECT USING (patient_id = auth.uid());
