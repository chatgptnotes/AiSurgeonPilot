-- Fix RLS policies for doc_doctors table
-- Problem: SECURITY DEFINER bypasses privilege checks but NOT RLS by default
-- Solution: Recreate functions to bypass RLS and simplify policies

-- Step 1: Recreate helper functions with SET search_path and explicit RLS bypass
-- The key is using 'postgres' role which bypasses RLS
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.doc_doctors
    WHERE user_id = auth.uid() AND role = 'superadmin'
  );
$$;

CREATE OR REPLACE FUNCTION is_admin_clinical()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.doc_doctors
    WHERE user_id = auth.uid() AND role = 'admin_clinical'
  );
$$;

CREATE OR REPLACE FUNCTION get_my_doctor_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT id FROM public.doc_doctors WHERE user_id = auth.uid();
$$;

-- Step 2: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_clinical() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_doctor_id() TO authenticated;

-- Step 3: Drop ALL existing SELECT policies on doc_doctors
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'doc_doctors'
    AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON doc_doctors', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Step 4: Create clean, non-overlapping policies
-- IMPORTANT: These are combined with OR - if ANY matches, row is visible

-- Base policy: Any authenticated user can read their own row
-- This is the MOST IMPORTANT policy for login to work
CREATE POLICY "Users can read own profile"
ON doc_doctors
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Superadmins can read all records
CREATE POLICY "Superadmins can read all users"
ON doc_doctors
FOR SELECT
TO authenticated
USING (is_superadmin());

-- Admin Clinical can read doctors they created
CREATE POLICY "Admin Clinical can read created doctors"
ON doc_doctors
FOR SELECT
TO authenticated
USING (
  is_admin_clinical() AND role = 'doctor' AND created_by = get_my_doctor_id()
);

-- Step 5: Verify policies are created correctly
SELECT schemaname, tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'doc_doctors';
