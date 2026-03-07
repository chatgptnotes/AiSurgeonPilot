-- Create storage bucket for doctor prescriptions (public access for patients)
INSERT INTO storage.buckets (id, name, public)
VALUES ('doctor-prescriptions', 'doctor-prescriptions', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Doctors can upload prescriptions
CREATE POLICY "Doctors can upload prescriptions" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'doctor-prescriptions' AND
    auth.uid() IN (SELECT user_id FROM doc_doctors)
  );

-- Storage policy: Doctors can update their prescriptions
CREATE POLICY "Doctors can update prescriptions" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'doctor-prescriptions' AND
    auth.uid() IN (SELECT user_id FROM doc_doctors)
  );

-- Storage policy: Doctors can delete their prescriptions
CREATE POLICY "Doctors can delete prescriptions" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'doctor-prescriptions' AND
    auth.uid() IN (SELECT user_id FROM doc_doctors)
  );

-- Storage policy: Anyone can view prescriptions (public bucket)
CREATE POLICY "Public can view prescriptions" ON storage.objects
  FOR SELECT USING (bucket_id = 'doctor-prescriptions');

-- Also ensure patient-documents bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-documents', 'patient-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Patient documents storage policies
CREATE POLICY "Patients can upload to patient-documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'patient-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Patients can view own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'patient-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Doctors can view patient documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'patient-documents' AND
    auth.uid() IN (SELECT user_id FROM doc_doctors)
  );

-- Add doc_patient_id column to doc_patient_reports if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'doc_patient_reports' AND column_name = 'doc_patient_id'
  ) THEN
    ALTER TABLE doc_patient_reports ADD COLUMN doc_patient_id UUID;
  END IF;
END $$;

-- Update RLS policy for patients to view reports using doc_patient_id
DROP POLICY IF EXISTS "Patients can view own reports" ON doc_patient_reports;

CREATE POLICY "Patients can view own reports" ON doc_patient_reports
  FOR SELECT USING (
    patient_id IN (SELECT id FROM doc_patients WHERE user_id = auth.uid())
    OR doc_patient_id IN (SELECT id FROM doc_patients WHERE user_id = auth.uid())
  );
