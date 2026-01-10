-- Create doc_patient_reports table
CREATE TABLE IF NOT EXISTS doc_patient_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doc_doctors(id) ON DELETE CASCADE,
  patient_id UUID,
  appointment_id UUID REFERENCES doc_appointments(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  description TEXT,
  uploaded_by TEXT NOT NULL CHECK (uploaded_by IN ('doctor', 'patient')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_doc_patient_reports_doctor_id ON doc_patient_reports(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doc_patient_reports_patient_id ON doc_patient_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_doc_patient_reports_appointment_id ON doc_patient_reports(appointment_id);

-- Enable Row Level Security
ALTER TABLE doc_patient_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Doctors can view reports for their patients
CREATE POLICY "Doctors can view patient reports" ON doc_patient_reports
  FOR SELECT USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

-- Policy: Doctors can upload reports
CREATE POLICY "Doctors can upload reports" ON doc_patient_reports
  FOR INSERT WITH CHECK (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
    OR uploaded_by = 'patient'
  );

-- Policy: Doctors can delete reports
CREATE POLICY "Doctors can delete reports" ON doc_patient_reports
  FOR DELETE USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

-- Policy: Patients can view their own reports
CREATE POLICY "Patients can view own reports" ON doc_patient_reports
  FOR SELECT USING (patient_id = auth.uid());

-- Policy: Patients can upload their own reports
CREATE POLICY "Patients can upload own reports" ON doc_patient_reports
  FOR INSERT WITH CHECK (patient_id = auth.uid() AND uploaded_by = 'patient');

-- Create storage bucket for reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-reports', 'patient-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Doctors can upload to patient-reports" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'patient-reports' AND
    auth.uid() IN (SELECT user_id FROM doc_doctors)
  );

CREATE POLICY "Doctors can view patient-reports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'patient-reports' AND
    auth.uid() IN (SELECT user_id FROM doc_doctors)
  );

CREATE POLICY "Patients can upload own reports" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'patient-reports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Patients can view own reports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'patient-reports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
