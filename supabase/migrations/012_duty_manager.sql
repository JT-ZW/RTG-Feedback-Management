-- ------------------------------------------------------------
-- Migration 012: Duty Manager Checklist submissions table
-- Run this in the Supabase SQL editor.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS duty_manager_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id     uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  submitted_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  shift_date      date NOT NULL,
  shift           text NOT NULL CHECK (shift IN ('AM', 'PM')),
  manager_name    text NOT NULL,
  responses       text NOT NULL DEFAULT '{}',  -- JSON: section_id > item_id > {rating, comment}
  room_checks     text NOT NULL DEFAULT '[]',  -- JSON: [{roomNo, notes}, ...]
  total_score     integer,
  max_score       integer NOT NULL DEFAULT 45, -- 15 sections × 3 avg items × 3; overridden via app
  percentage      numeric(5,2),
  hod_comments    text,                        -- editable post-submission by HOD
  status          text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'reviewed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_duty_manager_submissions_updated_at
  BEFORE UPDATE ON duty_manager_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE duty_manager_submissions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read submissions for their properties
CREATE POLICY "duty_manager_read_own_property"
  ON duty_manager_submissions FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT property_id FROM user_property_roles
      WHERE user_id = auth.uid()
    )
  );

-- Allow anonymous inserts (public form — service role handles it)
CREATE POLICY "duty_manager_anonymous_insert"
  ON duty_manager_submissions FOR INSERT
  TO anon
  WITH CHECK (true);

-- Authenticated users can update hod_comments on their property submissions
CREATE POLICY "duty_manager_update_hod_comments"
  ON duty_manager_submissions FOR UPDATE
  TO authenticated
  USING (
    property_id IN (
      SELECT property_id FROM user_property_roles
      WHERE user_id = auth.uid()
    )
  );
