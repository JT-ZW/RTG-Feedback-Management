-- ============================================================
-- Migration 010: RTG Feedback & Operations Intelligence
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Departments
--    Reference table for hotel departments per property.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id     uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name            text NOT NULL,
  code            text NOT NULL,           -- e.g. 'FB', 'FD', 'HK'
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, code)
);

-- ------------------------------------------------------------
-- 2. User Department Assignments
--    Links users to departments without altering profiles.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_department_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department_id   uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  property_id     uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  is_primary      boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, department_id)
);

-- ------------------------------------------------------------
-- 3. Mystery Shopper Submissions
--    One row per mystery shopper visit.
--    `responses` stores the full section/item breakdown as JSON.
--    Computed totals are stored as real columns for querying.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mystery_shopper_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id     uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  submitted_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  visit_date      date NOT NULL,
  shopper_name    text NOT NULL,
  responses       text NOT NULL DEFAULT '{}',  -- JSON: sections > items > {rating, comment, possible_mark}
  total_score     integer,
  max_score       integer NOT NULL DEFAULT 240,
  percentage      numeric(5,2),
  ai_analysis     text,                        -- JSON: Groq output
  status          text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'reviewed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 4. New roles for this app (insert into existing roles table)
-- ------------------------------------------------------------
INSERT INTO roles (name, description)
VALUES
  ('group_ops_manager', 'Group Operations Manager — cross-property analytics and oversight'),
  ('general_manager',   'General Manager — single property oversight'),
  ('department_head',   'Department Head — manages team submissions and scores'),
  ('supervisor',        'Supervisor / Staff — submits forms and completes checklists')
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- 5. Register feedback modules in property_modules
--    Run per-property or use a DO block to seed all properties.
-- ------------------------------------------------------------
-- Example: enables all modules for every property in the org.
-- Adjust property_id values as needed or run via app seed logic.
DO $$
DECLARE
  prop_id uuid;
BEGIN
  FOR prop_id IN SELECT id FROM properties LOOP
    INSERT INTO property_modules (property_id, module_key, is_enabled, settings)
    VALUES
      (prop_id, 'mystery_shopper',      true, '{}'),
      (prop_id, 'restaurant_checklist', false, '{}'),
      (prop_id, 'duty_manager',         false, '{}'),
      (prop_id, 'guest_checkin',        false, '{}'),
      (prop_id, 'hicc',                 false, '{}')
    ON CONFLICT (property_id, module_key) DO NOTHING;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 6. Seed departments (common hotel departments for all properties)
-- ------------------------------------------------------------
DO $$
DECLARE
  org_id   uuid;
  prop_id  uuid;
BEGIN
  SELECT id INTO org_id FROM organizations LIMIT 1;

  FOR prop_id IN SELECT id FROM properties WHERE organization_id = org_id LOOP
    INSERT INTO departments (organization_id, property_id, name, code)
    VALUES
      (org_id, prop_id, 'Front Desk',       'FD'),
      (org_id, prop_id, 'Food & Beverage',  'FB'),
      (org_id, prop_id, 'Housekeeping',     'HK'),
      (org_id, prop_id, 'Maintenance',      'MT'),
      (org_id, prop_id, 'Management',       'MG'),
      (org_id, prop_id, 'Security',         'SC'),
      (org_id, prop_id, 'Conferencing',     'CF')
    ON CONFLICT (property_id, code) DO NOTHING;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 7. Row Level Security
-- ------------------------------------------------------------
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_department_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mystery_shopper_submissions ENABLE ROW LEVEL SECURITY;

-- Departments: org members can read; org_admin/super_admin can manage
CREATE POLICY "Org members can view departments"
  ON departments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage departments"
  ON departments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_property_roles upr
      JOIN roles r ON r.id = upr.role_id
      WHERE upr.user_id = auth.uid()
        AND r.name IN ('super_admin', 'org_admin')
    )
  );

-- User department assignments: users can view their own; admins can manage
CREATE POLICY "Users can view own department assignments"
  ON user_department_assignments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage department assignments"
  ON user_department_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_property_roles upr
      JOIN roles r ON r.id = upr.role_id
      WHERE upr.user_id = auth.uid()
        AND r.name IN ('super_admin', 'org_admin', 'property_manager', 'general_manager')
    )
  );

-- Mystery shopper: org members can read their property's submissions
CREATE POLICY "Property members can view mystery shopper submissions"
  ON mystery_shopper_submissions FOR SELECT
  USING (
    property_id IN (
      SELECT property_id FROM user_property_roles WHERE user_id = auth.uid()
    )
  );

-- Group-level roles can read across all properties in the org
CREATE POLICY "Group managers can view all org submissions"
  ON mystery_shopper_submissions FOR SELECT
  USING (
    organization_id IN (
      SELECT p.organization_id FROM profiles p
      WHERE p.id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_property_roles upr
      JOIN roles r ON r.id = upr.role_id
      WHERE upr.user_id = auth.uid()
        AND r.name IN ('super_admin', 'org_admin', 'group_ops_manager')
    )
  );

-- Authenticated users can insert (submit) their own submissions
CREATE POLICY "Authenticated users can submit mystery shopper forms"
  ON mystery_shopper_submissions FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND property_id IN (
      SELECT property_id FROM user_property_roles WHERE user_id = auth.uid()
    )
  );

-- Users can update their own draft submissions
CREATE POLICY "Users can update own draft submissions"
  ON mystery_shopper_submissions FOR UPDATE
  USING (
    submitted_by = auth.uid()
    AND status = 'draft'
  );
