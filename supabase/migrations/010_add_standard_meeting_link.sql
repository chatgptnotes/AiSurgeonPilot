-- Add standard_meeting_link column to doc_doctors table
-- This stores the doctor's default meeting link (Zoom, Google Meet, etc.)
-- that will be shared with patients for all online consultations

ALTER TABLE doc_doctors
ADD COLUMN IF NOT EXISTS standard_meeting_link TEXT;

-- Add a comment for documentation
COMMENT ON COLUMN doc_doctors.standard_meeting_link IS 'Standard meeting link (Zoom, Google Meet, etc.) shared with patients for online consultations';
