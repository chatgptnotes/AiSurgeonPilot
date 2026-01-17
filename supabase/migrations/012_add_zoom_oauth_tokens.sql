-- Add Zoom OAuth tokens to doc_doctors table for per-doctor Zoom integration
ALTER TABLE doc_doctors
ADD COLUMN IF NOT EXISTS zoom_access_token TEXT,
ADD COLUMN IF NOT EXISTS zoom_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS zoom_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS zoom_user_id TEXT,
ADD COLUMN IF NOT EXISTS zoom_connected_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN doc_doctors.zoom_access_token IS 'Zoom OAuth access token for fetching recordings';
COMMENT ON COLUMN doc_doctors.zoom_refresh_token IS 'Zoom OAuth refresh token for token renewal';
COMMENT ON COLUMN doc_doctors.zoom_token_expires_at IS 'When the access token expires';
COMMENT ON COLUMN doc_doctors.zoom_user_id IS 'Zoom user ID for the connected account';
COMMENT ON COLUMN doc_doctors.zoom_connected_at IS 'When the doctor connected their Zoom account';
