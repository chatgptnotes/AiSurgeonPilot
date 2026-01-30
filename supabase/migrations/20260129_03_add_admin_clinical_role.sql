-- Migration: Add Admin Clinical role to doc_doctors table
-- Date: 2026-01-29
-- Description: Adds admin_clinical role for clinical administrators who manage doctors

-- Update role CHECK constraint to include admin_clinical
ALTER TABLE doc_doctors DROP CONSTRAINT IF EXISTS doc_doctors_role_check;
ALTER TABLE doc_doctors ADD CONSTRAINT doc_doctors_role_check CHECK (role IN ('superadmin', 'admin_clinical', 'doctor'));

-- Create is_admin_clinical function (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION is_admin_clinical()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM doc_doctors
    WHERE user_id = auth.uid() AND role = 'admin_clinical'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is admin (superadmin or admin_clinical)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM doc_doctors
    WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin_clinical')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing admin_clinical policies if they exist
DROP POLICY IF EXISTS "Admin Clinical can view doctors they created" ON doc_doctors;
DROP POLICY IF EXISTS "Admin Clinical can update doctors they created" ON doc_doctors;
DROP POLICY IF EXISTS "Admin Clinical can insert doctors" ON doc_doctors;

-- Admin Clinical can view doctors they created
CREATE POLICY "Admin Clinical can view doctors they created"
ON doc_doctors FOR SELECT
USING (
  created_by IN (
    SELECT id FROM doc_doctors
    WHERE user_id = auth.uid() AND role = 'admin_clinical'
  )
);

-- Admin Clinical can update doctors they created
CREATE POLICY "Admin Clinical can update doctors they created"
ON doc_doctors FOR UPDATE
USING (
  created_by IN (
    SELECT id FROM doc_doctors
    WHERE user_id = auth.uid() AND role = 'admin_clinical'
  )
);

-- Admin Clinical can insert doctors
CREATE POLICY "Admin Clinical can insert doctors"
ON doc_doctors FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM doc_doctors
    WHERE user_id = auth.uid() AND role = 'admin_clinical'
  )
);

-- Admin Clinical can view their own profile
CREATE POLICY "Admin Clinical can view own profile"
ON doc_doctors FOR SELECT
USING (
  user_id = auth.uid() AND role = 'admin_clinical'
);

-- Update comments
COMMENT ON COLUMN doc_doctors.role IS 'User role: superadmin, admin_clinical, or doctor';
