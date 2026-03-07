-- Migration: Add dual currency pricing (INR/USD) for appointments
-- Run this in your Supabase SQL Editor

-- Add INR and USD columns for physical consultation fees
ALTER TABLE doc_doctors 
ADD COLUMN IF NOT EXISTS consultation_fee_inr DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS consultation_fee_usd DECIMAL(10,2) DEFAULT NULL;

-- Add INR and USD columns for online consultation fees
ALTER TABLE doc_doctors 
ADD COLUMN IF NOT EXISTS online_fee_inr DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS online_fee_usd DECIMAL(10,2) DEFAULT NULL;

-- Optional: Migrate existing data (assumes current fees are in INR)
-- Uncomment if you want to copy existing consultation_fee to consultation_fee_inr
-- UPDATE doc_doctors SET consultation_fee_inr = consultation_fee WHERE consultation_fee IS NOT NULL;
-- UPDATE doc_doctors SET online_fee_inr = online_fee WHERE online_fee IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN doc_doctors.consultation_fee_inr IS 'Physical consultation fee for Indian patients (INR)';
COMMENT ON COLUMN doc_doctors.consultation_fee_usd IS 'Physical consultation fee for international patients (USD)';
COMMENT ON COLUMN doc_doctors.online_fee_inr IS 'Online consultation fee for Indian patients (INR)';
COMMENT ON COLUMN doc_doctors.online_fee_usd IS 'Online consultation fee for international patients (USD)';
