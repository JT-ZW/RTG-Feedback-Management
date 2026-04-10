-- ------------------------------------------------------------
-- Migration 013: Bar Checklist submissions table
-- Run this in the Supabase SQL editor.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bar_checklist_submissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id       uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  submission_date   date NOT NULL,
  outlet            text NOT NULL,          -- which bar outlet within the property
  submitter_name    text NOT NULL,
  position          text NOT NULL,          -- e.g. Bar Manager, Bar Supervisor
  responses         text NOT NULL DEFAULT '{}', -- JSON: { bc_1: true/false/null, ... }
  yes_count         integer NOT NULL DEFAULT 0,
  total_items       integer NOT NULL DEFAULT 22,
  compliance_score  numeric(5,2),           -- percentage YES / total_items
  status            text NOT NULL DEFAULT 'submitted'
                      CHECK (status IN ('submitted', 'reviewed')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bar_checklist_submissions_updated_at
  BEFORE UPDATE ON bar_checklist_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE bar_checklist_submissions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read submissions for their properties
CREATE POLICY "bar_checklist_read_own_property"
  ON bar_checklist_submissions FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT property_id FROM user_property_roles
      WHERE user_id = auth.uid()
    )
  );

-- Allow anonymous inserts (public form — service role handles it)
CREATE POLICY "bar_checklist_anonymous_insert"
  ON bar_checklist_submissions FOR INSERT
  TO anon
  WITH CHECK (true);

-- Authenticated users can update status on their property submissions
CREATE POLICY "bar_checklist_update_own_property"
  ON bar_checklist_submissions FOR UPDATE
  TO authenticated
  USING (
    property_id IN (
      SELECT property_id FROM user_property_roles
      WHERE user_id = auth.uid()
    )
  );
