-- Migration: Add SuperAdmin fields to doc_doctors table
-- Date: 2026-01-29
-- Description: Adds role and must_change_password fields for SuperAdmin functionality

-- Create is_superadmin function (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM doc_doctors
    WHERE user_id = auth.uid() AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add role column (superadmin or doctor)
ALTER TABLE doc_doctors
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'doctor';

-- Add check constraint for role (drop first if exists)
ALTER TABLE doc_doctors DROP CONSTRAINT IF EXISTS doc_doctors_role_check;
ALTER TABLE doc_doctors ADD CONSTRAINT doc_doctors_role_check CHECK (role IN ('superadmin', 'doctor'));

-- Add must_change_password flag for first login enforcement
ALTER TABLE doc_doctors
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Add created_by column to track who created the doctor
ALTER TABLE doc_doctors
ADD COLUMN IF NOT EXISTS created_by UUID;

-- Add is_active column for soft delete/deactivation
ALTER TABLE doc_doctors
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create indexes for role-based queries
CREATE INDEX IF NOT EXISTS idx_doc_doctors_role ON doc_doctors(role);
CREATE INDEX IF NOT EXISTS idx_doc_doctors_is_active ON doc_doctors(is_active);

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Superadmin can view all doctors" ON doc_doctors;
DROP POLICY IF EXISTS "Superadmin can update all doctors" ON doc_doctors;
DROP POLICY IF EXISTS "Superadmin can insert doctors" ON doc_doctors;

-- SuperAdmin can view all doctors
CREATE POLICY "Superadmin can view all doctors"
ON doc_doctors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM doc_doctors
    WHERE user_id = auth.uid() AND role = 'superadmin'
  )
);

-- SuperAdmin can update all doctors
CREATE POLICY "Superadmin can update all doctors"
ON doc_doctors FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM doc_doctors
    WHERE user_id = auth.uid() AND role = 'superadmin'
  )
);

-- SuperAdmin can insert doctors
CREATE POLICY "Superadmin can insert doctors"
ON doc_doctors FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM doc_doctors
    WHERE user_id = auth.uid() AND role = 'superadmin'
  )
);

-- Add comments
COMMENT ON COLUMN doc_doctors.role IS 'User role: superadmin or doctor';
COMMENT ON COLUMN doc_doctors.must_change_password IS 'Flag to force password change on first login';
COMMENT ON COLUMN doc_doctors.created_by IS 'UUID of the superadmin who created this doctor';
COMMENT ON COLUMN doc_doctors.is_active IS 'Soft delete flag - false means deactivated';
