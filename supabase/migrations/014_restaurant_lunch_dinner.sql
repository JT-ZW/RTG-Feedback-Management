-- ------------------------------------------------------------
-- Migration 014: Restaurant Lunch/Dinner Checklist submissions table
-- Run this in the Supabase SQL editor.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS restaurant_lunch_dinner_submissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id       uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  submission_date   date NOT NULL,
  shift             text NOT NULL CHECK (shift IN ('AM', 'PM')),
  submitter_name    text NOT NULL,
  position          text NOT NULL,          -- Restaurant Manager / Head Waiter / Supervisor
  responses         text NOT NULL DEFAULT '{}', -- JSON: { rld_1: true/false/null, ... }
  yes_count         integer NOT NULL DEFAULT 0,
  total_items       integer NOT NULL DEFAULT 29,
  compliance_score  numeric(5,2),           -- percentage YES / total_items
  status            text NOT NULL DEFAULT 'submitted'
                      CHECK (status IN ('submitted', 'reviewed')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at (function already exists from earlier migrations, just add trigger)
CREATE TRIGGER update_restaurant_lunch_dinner_submissions_updated_at
  BEFORE UPDATE ON restaurant_lunch_dinner_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE restaurant_lunch_dinner_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_ld_read_own_property"
  ON restaurant_lunch_dinner_submissions FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT property_id FROM user_property_roles
      WHERE user_id = auth.uid()
    )
  );

-- Public form — no auth needed
CREATE POLICY "restaurant_ld_anonymous_insert"
  ON restaurant_lunch_dinner_submissions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "restaurant_ld_update_own_property"
  ON restaurant_lunch_dinner_submissions FOR UPDATE
  TO authenticated
  USING (
    property_id IN (
      SELECT property_id FROM user_property_roles
      WHERE user_id = auth.uid()
    )
  );
