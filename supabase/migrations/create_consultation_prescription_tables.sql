-- Create consultation notes table
CREATE TABLE IF NOT EXISTS doc_consultation_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES doc_doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES doc_patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES doc_appointments(id) ON DELETE SET NULL,
  consultation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  chief_complaint TEXT,
  history_of_present_illness TEXT,
  examination_findings TEXT,
  diagnosis TEXT,
  treatment_plan TEXT,
  follow_up_instructions TEXT,
  additional_notes TEXT,
  vitals JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create prescriptions table
CREATE TABLE IF NOT EXISTS doc_prescriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES doc_doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES doc_patients(id) ON DELETE CASCADE,
  consultation_note_id UUID REFERENCES doc_consultation_notes(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES doc_appointments(id) ON DELETE SET NULL,
  prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
  diagnosis TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create prescription items table (individual medications)
CREATE TABLE IF NOT EXISTS doc_prescription_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID NOT NULL REFERENCES doc_prescriptions(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  instructions TEXT,
  route TEXT DEFAULT 'Oral',
  quantity TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE doc_consultation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_prescription_items ENABLE ROW LEVEL SECURITY;

-- Consultation notes: doctors can manage their own
CREATE POLICY "Doctors can view own consultation notes" ON doc_consultation_notes
  FOR SELECT USING (doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can insert own consultation notes" ON doc_consultation_notes
  FOR INSERT WITH CHECK (doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can update own consultation notes" ON doc_consultation_notes
  FOR UPDATE USING (doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can delete own consultation notes" ON doc_consultation_notes
  FOR DELETE USING (doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid()));

-- Prescriptions: doctors can manage their own
CREATE POLICY "Doctors can view own prescriptions" ON doc_prescriptions
  FOR SELECT USING (doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can insert own prescriptions" ON doc_prescriptions
  FOR INSERT WITH CHECK (doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can update own prescriptions" ON doc_prescriptions
  FOR UPDATE USING (doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can delete own prescriptions" ON doc_prescriptions
  FOR DELETE USING (doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid()));

-- Prescription items: doctors can manage items of their prescriptions
CREATE POLICY "Doctors can view own prescription items" ON doc_prescription_items
  FOR SELECT USING (prescription_id IN (
    SELECT id FROM doc_prescriptions WHERE doctor_id IN (
      SELECT id FROM doc_doctors WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Doctors can insert own prescription items" ON doc_prescription_items
  FOR INSERT WITH CHECK (prescription_id IN (
    SELECT id FROM doc_prescriptions WHERE doctor_id IN (
      SELECT id FROM doc_doctors WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Doctors can update own prescription items" ON doc_prescription_items
  FOR UPDATE USING (prescription_id IN (
    SELECT id FROM doc_prescriptions WHERE doctor_id IN (
      SELECT id FROM doc_doctors WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Doctors can delete own prescription items" ON doc_prescription_items
  FOR DELETE USING (prescription_id IN (
    SELECT id FROM doc_prescriptions WHERE doctor_id IN (
      SELECT id FROM doc_doctors WHERE user_id = auth.uid()
    )
  ));

-- Indexes
CREATE INDEX idx_consultation_notes_doctor_patient ON doc_consultation_notes(doctor_id, patient_id);
CREATE INDEX idx_prescriptions_doctor_patient ON doc_prescriptions(doctor_id, patient_id);
CREATE INDEX idx_prescription_items_prescription ON doc_prescription_items(prescription_id);
