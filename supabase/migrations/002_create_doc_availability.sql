-- Create doc_availability table for doctor availability slots
CREATE TABLE IF NOT EXISTS doc_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doc_doctors(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration INTEGER DEFAULT 30 CHECK (slot_duration IN (15, 30, 45, 60)),
  is_active BOOLEAN DEFAULT TRUE,
  visit_type TEXT[] DEFAULT ARRAY['online', 'physical'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_doc_availability_doctor_id ON doc_availability(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doc_availability_day ON doc_availability(day_of_week);

-- Enable Row Level Security
ALTER TABLE doc_availability ENABLE ROW LEVEL SECURITY;

-- Policy: Doctors can manage their own availability
CREATE POLICY "Doctors can view own availability" ON doc_availability
  FOR SELECT USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Doctors can insert own availability" ON doc_availability
  FOR INSERT WITH CHECK (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Doctors can update own availability" ON doc_availability
  FOR UPDATE USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Doctors can delete own availability" ON doc_availability
  FOR DELETE USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

-- Policy: Public can view active availability for booking
CREATE POLICY "Public can view active availability" ON doc_availability
  FOR SELECT USING (is_active = TRUE);

-- Create doc_availability_overrides table for date-specific overrides
CREATE TABLE IF NOT EXISTS doc_availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doc_doctors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT FALSE,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  CONSTRAINT unique_doctor_date UNIQUE (doctor_id, date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_doc_availability_overrides_doctor_id ON doc_availability_overrides(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doc_availability_overrides_date ON doc_availability_overrides(date);

-- Enable Row Level Security
ALTER TABLE doc_availability_overrides ENABLE ROW LEVEL SECURITY;

-- Policies for availability overrides
CREATE POLICY "Doctors can view own overrides" ON doc_availability_overrides
  FOR SELECT USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Doctors can insert own overrides" ON doc_availability_overrides
  FOR INSERT WITH CHECK (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Doctors can update own overrides" ON doc_availability_overrides
  FOR UPDATE USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Doctors can delete own overrides" ON doc_availability_overrides
  FOR DELETE USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Public can view overrides" ON doc_availability_overrides
  FOR SELECT USING (TRUE);
