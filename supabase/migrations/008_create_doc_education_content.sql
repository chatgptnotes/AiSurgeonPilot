-- Create doc_education_content table for patient education materials
CREATE TABLE IF NOT EXISTS doc_education_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doc_doctors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('article', 'video', 'pdf')),
  file_url TEXT,
  category TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_doc_education_content_doctor_id ON doc_education_content(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doc_education_content_category ON doc_education_content(category);
CREATE INDEX IF NOT EXISTS idx_doc_education_content_published ON doc_education_content(is_published);

-- Enable Row Level Security
ALTER TABLE doc_education_content ENABLE ROW LEVEL SECURITY;

-- Policy: Doctors can view their education content
CREATE POLICY "Doctors can view own education content" ON doc_education_content
  FOR SELECT USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

-- Policy: Doctors can create education content
CREATE POLICY "Doctors can create education content" ON doc_education_content
  FOR INSERT WITH CHECK (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

-- Policy: Doctors can update their education content
CREATE POLICY "Doctors can update own education content" ON doc_education_content
  FOR UPDATE USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

-- Policy: Doctors can delete their education content
CREATE POLICY "Doctors can delete own education content" ON doc_education_content
  FOR DELETE USING (
    doctor_id IN (SELECT id FROM doc_doctors WHERE user_id = auth.uid())
  );

-- Policy: Public can view published content
CREATE POLICY "Public can view published content" ON doc_education_content
  FOR SELECT USING (is_published = TRUE);

-- Create storage bucket for education content
INSERT INTO storage.buckets (id, name, public)
VALUES ('education-content', 'education-content', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for education content
CREATE POLICY "Doctors can upload education content" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'education-content' AND
    auth.uid() IN (SELECT user_id FROM doc_doctors)
  );

CREATE POLICY "Anyone can view education content" ON storage.objects
  FOR SELECT USING (bucket_id = 'education-content');

CREATE POLICY "Doctors can delete own education content" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'education-content' AND
    auth.uid() IN (SELECT user_id FROM doc_doctors)
  );
