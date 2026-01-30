-- Migration: Add account requests table
-- Date: 2026-01-29
-- Description: Table for doctors to request account access

-- Create account requests table
CREATE TABLE IF NOT EXISTS doc_account_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  specialization TEXT,
  qualification TEXT,
  experience_years INTEGER,
  clinic_name TEXT,
  clinic_address TEXT,
  license_number TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES doc_doctors(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_doc_account_requests_status ON doc_account_requests(status);
CREATE INDEX IF NOT EXISTS idx_doc_account_requests_email ON doc_account_requests(email);

-- Enable RLS
ALTER TABLE doc_account_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for public request form)
DROP POLICY IF EXISTS "Anyone can submit account request" ON doc_account_requests;
CREATE POLICY "Anyone can submit account request"
ON doc_account_requests FOR INSERT
WITH CHECK (true);

-- Only superadmin can view requests (using security definer function to avoid RLS recursion)
DROP POLICY IF EXISTS "Superadmin can view requests" ON doc_account_requests;
CREATE POLICY "Superadmin can view requests"
ON doc_account_requests FOR SELECT
USING (is_superadmin());

-- Only superadmin can update requests (using security definer function to avoid RLS recursion)
DROP POLICY IF EXISTS "Superadmin can update requests" ON doc_account_requests;
CREATE POLICY "Superadmin can update requests"
ON doc_account_requests FOR UPDATE
USING (is_superadmin());

-- Comments
COMMENT ON TABLE doc_account_requests IS 'Requests from doctors wanting to create an account';
COMMENT ON COLUMN doc_account_requests.status IS 'Request status: pending, approved, rejected';
COMMENT ON COLUMN doc_account_requests.reviewed_by IS 'SuperAdmin who reviewed the request';
