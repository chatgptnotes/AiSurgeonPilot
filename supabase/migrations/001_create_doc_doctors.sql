-- Create doc_doctors table for doctor/surgeon profiles
CREATE TABLE IF NOT EXISTS doc_doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  specialization TEXT,
  qualification TEXT,
  experience_years INTEGER,
  clinic_name TEXT,
  clinic_address TEXT,
  phone TEXT,
  profile_image TEXT,
  bio TEXT,
  consultation_fee DECIMAL(10, 2),
  online_fee DECIMAL(10, 2),
  booking_slug TEXT UNIQUE,
  stripe_account_id TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_doc_doctors_user_id ON doc_doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_doctors_booking_slug ON doc_doctors(booking_slug);
CREATE INDEX IF NOT EXISTS idx_doc_doctors_email ON doc_doctors(email);

-- Enable Row Level Security
ALTER TABLE doc_doctors ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own doctor profile
CREATE POLICY "Doctors can view own profile" ON doc_doctors
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own doctor profile
CREATE POLICY "Doctors can insert own profile" ON doc_doctors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own doctor profile
CREATE POLICY "Doctors can update own profile" ON doc_doctors
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Public can view verified doctors (for booking pages)
CREATE POLICY "Public can view verified doctors" ON doc_doctors
  FOR SELECT USING (is_verified = TRUE);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_doc_doctors_updated_at
  BEFORE UPDATE ON doc_doctors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
