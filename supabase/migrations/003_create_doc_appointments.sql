-- Create doc_appointments table
CREATE TABLE IF NOT EXISTS doc_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doc_doctors(id) ON DELETE CASCADE,
  patient_id UUID,
  patient_name TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  patient_phone TEXT,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  visit_type TEXT NOT NULL CHECK (visit_type IN ('online', 'physical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  payment_id TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  meeting_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_doc_appointments_doctor_id ON doc_appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doc_appointments_patient_id ON doc_appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_doc_appointments_date ON doc_appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_doc_appointments_status ON doc_appointments(status);
CREATE INDEX IF NOT EXISTS idx_doc_appointments_payment_status ON doc_appointments(payment_status);

-- Enable Row Level Security
ALTER TABLE doc_appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Doctors can view their appointments
CREATE POLICY "Doctors can view own appointments" ON doc_appointments
  FOR SELECT USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

-- Policy: Doctors can update their appointments
CREATE POLICY "Doctors can update own appointments" ON doc_appointments
  FOR UPDATE USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

-- Policy: Anyone can create appointments (for booking)
CREATE POLICY "Anyone can create appointments" ON doc_appointments
  FOR INSERT WITH CHECK (TRUE);

-- Policy: Patients can view their own appointments
CREATE POLICY "Patients can view own appointments" ON doc_appointments
  FOR SELECT USING (patient_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_doc_appointments_updated_at
  BEFORE UPDATE ON doc_appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
