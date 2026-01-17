-- =====================================================
-- PATIENT TABLES FOR AI SURGEON PILOT
-- TABLES ONLY (No RLS Policies)
-- =====================================================

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1. Create doc_patients table
-- =====================================================
-- Drop existing table if it exists (to ensure correct schema)
DROP TABLE IF EXISTS doc_patient_addresses CASCADE;
DROP TABLE IF EXISTS doc_patient_insurance CASCADE;
DROP TABLE IF EXISTS doc_patient_emergency_contacts CASCADE;
DROP TABLE IF EXISTS doc_patient_medications CASCADE;
DROP TABLE IF EXISTS doc_patient_allergies CASCADE;
DROP TABLE IF EXISTS doc_patient_medical_history CASCADE;
DROP TABLE IF EXISTS doc_patient_doctor_selections CASCADE;
DROP TABLE IF EXISTS doc_patients CASCADE;

CREATE TABLE doc_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  blood_group TEXT CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
  height_cm DECIMAL(5,2),
  weight_kg DECIMAL(5,2),
  marital_status TEXT CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
  profile_image_url TEXT,
  is_profile_complete BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_patients_user_id ON doc_patients(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_patients_email ON doc_patients(email);

-- =====================================================
-- 2. Create doc_patient_doctor_selections table
-- =====================================================
CREATE TABLE doc_patient_doctor_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES doc_patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doc_doctors(id) ON DELETE CASCADE,
  is_primary_doctor BOOLEAN DEFAULT FALSE,
  selection_reason TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, doctor_id)
);

CREATE INDEX IF NOT EXISTS idx_doc_patient_doctor_selections_patient_id ON doc_patient_doctor_selections(patient_id);
CREATE INDEX IF NOT EXISTS idx_doc_patient_doctor_selections_doctor_id ON doc_patient_doctor_selections(doctor_id);

-- =====================================================
-- 3. Create doc_patient_medical_history table
-- =====================================================
CREATE TABLE doc_patient_medical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES doc_patients(id) ON DELETE CASCADE,
  condition_name TEXT NOT NULL,
  condition_type TEXT CHECK (condition_type IN ('chronic', 'past', 'ongoing', 'genetic')),
  diagnosed_date DATE,
  notes TEXT,
  is_current BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_patient_medical_history_patient_id ON doc_patient_medical_history(patient_id);

-- =====================================================
-- 4. Create doc_patient_allergies table
-- =====================================================
CREATE TABLE doc_patient_allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES doc_patients(id) ON DELETE CASCADE,
  allergy_type TEXT NOT NULL CHECK (allergy_type IN ('drug', 'food', 'environmental', 'other')),
  allergy_name TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  reaction_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_patient_allergies_patient_id ON doc_patient_allergies(patient_id);

-- =====================================================
-- 5. Create doc_patient_medications table
-- =====================================================
CREATE TABLE doc_patient_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES doc_patients(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  start_date DATE,
  end_date DATE,
  prescribing_doctor TEXT,
  is_current BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_patient_medications_patient_id ON doc_patient_medications(patient_id);

-- =====================================================
-- 6. Create doc_patient_emergency_contacts table
-- =====================================================
CREATE TABLE doc_patient_emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES doc_patients(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN ('spouse', 'parent', 'sibling', 'child', 'friend', 'other')),
  phone_number TEXT NOT NULL,
  email TEXT,
  is_primary BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_patient_emergency_contacts_patient_id ON doc_patient_emergency_contacts(patient_id);

-- =====================================================
-- 7. Create doc_patient_insurance table
-- =====================================================
CREATE TABLE doc_patient_insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES doc_patients(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  group_number TEXT,
  policy_holder_name TEXT,
  relationship_to_patient TEXT CHECK (relationship_to_patient IN ('self', 'spouse', 'parent', 'child')),
  valid_from DATE,
  valid_until DATE,
  is_primary BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_patient_insurance_patient_id ON doc_patient_insurance(patient_id);

-- =====================================================
-- 8. Create doc_patient_addresses table
-- =====================================================
CREATE TABLE doc_patient_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES doc_patients(id) ON DELETE CASCADE,
  address_type TEXT DEFAULT 'home' CHECK (address_type IN ('home', 'work', 'other')),
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  postal_code TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_patient_addresses_patient_id ON doc_patient_addresses(patient_id);

-- =====================================================
-- Trigger for updated_at on doc_patients
-- =====================================================
DROP TRIGGER IF EXISTS update_doc_patients_updated_at ON doc_patients;
CREATE TRIGGER update_doc_patients_updated_at
  BEFORE UPDATE ON doc_patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
