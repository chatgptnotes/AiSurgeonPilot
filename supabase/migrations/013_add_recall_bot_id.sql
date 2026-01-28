-- Add recall_bot_id column to doc_appointments table
-- This stores the Recall.ai bot ID for scheduled meeting recordings

ALTER TABLE doc_appointments
ADD COLUMN IF NOT EXISTS recall_bot_id TEXT;

-- Add index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_doc_appointments_recall_bot_id
ON doc_appointments(recall_bot_id)
WHERE recall_bot_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN doc_appointments.recall_bot_id IS 'Recall.ai bot ID for automatic meeting recording and transcription';
