-- Create doc_surgery_options table for surgery packages
CREATE TABLE IF NOT EXISTS doc_surgery_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doc_doctors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  estimated_cost_min DECIMAL(10, 2),
  estimated_cost_max DECIMAL(10, 2),
  recovery_time TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_doc_surgery_options_doctor_id ON doc_surgery_options(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doc_surgery_options_active ON doc_surgery_options(is_active);

-- Enable Row Level Security
ALTER TABLE doc_surgery_options ENABLE ROW LEVEL SECURITY;

-- Policy: Doctors can view their surgery options
CREATE POLICY "Doctors can view own surgery options" ON doc_surgery_options
  FOR SELECT USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

-- Policy: Doctors can create surgery options
CREATE POLICY "Doctors can create surgery options" ON doc_surgery_options
  FOR INSERT WITH CHECK (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

-- Policy: Doctors can update their surgery options
CREATE POLICY "Doctors can update own surgery options" ON doc_surgery_options
  FOR UPDATE USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

-- Policy: Doctors can delete their surgery options
CREATE POLICY "Doctors can delete own surgery options" ON doc_surgery_options
  FOR DELETE USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

-- Policy: Public can view active surgery options
CREATE POLICY "Public can view active surgery options" ON doc_surgery_options
  FOR SELECT USING (is_active = TRUE);
