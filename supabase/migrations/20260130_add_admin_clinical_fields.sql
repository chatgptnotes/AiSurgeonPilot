-- Add new fields for Admin Clinical profile
-- These fields will be used by Admin Clinical users for their organizational details

ALTER TABLE doc_doctors
ADD COLUMN IF NOT EXISTS designation VARCHAR(255),
ADD COLUMN IF NOT EXISTS department VARCHAR(255),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);

-- Add comments for documentation
COMMENT ON COLUMN doc_doctors.designation IS 'Job title/designation (e.g., Clinical Manager, Hospital Administrator)';
COMMENT ON COLUMN doc_doctors.department IS 'Department name (e.g., Administration, Operations)';
COMMENT ON COLUMN doc_doctors.city IS 'City of the organization';
COMMENT ON COLUMN doc_doctors.state IS 'State of the organization';
COMMENT ON COLUMN doc_doctors.pincode IS 'Postal/ZIP code';

-- clinic_name will be used as Organization/Hospital Name
-- clinic_address will be used as Street Address
