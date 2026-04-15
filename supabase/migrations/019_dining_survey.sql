-- ------------------------------------------------------------
-- Migration 019: Guest Dining Survey
--
-- A guest-facing survey served via a property-specific QR code.
-- Completely anonymous — no auth required. Guests optionally
-- provide a name, email and/or phone number.
--
-- The meal period is determined server-side using Central Africa
-- Time (CAT / UTC+2):
--   06:00–10:30 → breakfast
--   12:00–14:30 → lunch
--   18:00–23:00 → dinner
--   all other times → manual selection by guest
--
-- Each of the 7 rated questions is stored as a small integer
-- (1-5 star rating). NULL means the question was not answered
-- (should not occur after validation, but kept nullable for
-- schema flexibility).
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dining_survey_submissions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid        NOT NULL REFERENCES organizations(id)   ON DELETE CASCADE,
  property_id           uuid        NOT NULL REFERENCES properties(id)      ON DELETE CASCADE,

  -- Meal context
  meal_period           text        NOT NULL CHECK (meal_period IN ('breakfast', 'lunch', 'dinner')),
  meal_period_auto      boolean     NOT NULL DEFAULT false,  -- true = auto-detected, false = guest-selected
  table_number          text,                               -- optional, max 20 chars

  -- 7 rated questions (1–5 stars)
  food_quality          smallint    NOT NULL CHECK (food_quality          BETWEEN 1 AND 5),
  food_temperature      smallint    NOT NULL CHECK (food_temperature      BETWEEN 1 AND 5),
  service_speed         smallint    NOT NULL CHECK (service_speed         BETWEEN 1 AND 5),
  staff_friendliness    smallint    NOT NULL CHECK (staff_friendliness    BETWEEN 1 AND 5),
  ambience              smallint    NOT NULL CHECK (ambience              BETWEEN 1 AND 5),
  value_for_money       smallint    NOT NULL CHECK (value_for_money       BETWEEN 1 AND 5),
  overall_satisfaction  smallint    NOT NULL CHECK (overall_satisfaction  BETWEEN 1 AND 5),

  -- Computed overall average (stored for fast querying)
  avg_score             numeric(4,2) GENERATED ALWAYS AS (
    ROUND(
      (food_quality + food_temperature + service_speed +
       staff_friendliness + ambience + value_for_money + overall_satisfaction)::numeric / 7,
      2
    )
  ) STORED,

  -- Optional guest info
  comments              text,
  guest_name            text,
  guest_email           text,
  guest_phone           text,

  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS dining_survey_property_idx
  ON dining_survey_submissions (property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS dining_survey_org_idx
  ON dining_survey_submissions (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS dining_survey_meal_period_idx
  ON dining_survey_submissions (meal_period, created_at DESC);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE dining_survey_submissions ENABLE ROW LEVEL SECURITY;

-- Anon guests can submit (no auth required — public QR form)
CREATE POLICY "dining_survey_anon_insert"
  ON dining_survey_submissions FOR INSERT
  TO anon
  WITH CHECK (true);

-- Property staff see submissions for their own property
CREATE POLICY "dining_survey_read_own_property"
  ON dining_survey_submissions FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT property_id FROM user_property_roles
      WHERE user_id = auth.uid()
    )
  );

-- Org-level managers/admins see all submissions across their org
CREATE POLICY "dining_survey_read_org_managers"
  ON dining_survey_submissions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_property_roles upr
      JOIN roles r ON r.id = upr.role_id
      WHERE upr.user_id = auth.uid()
        AND r.name IN ('super_admin', 'org_admin', 'group_ops_manager', 'general_manager')
    )
  );
