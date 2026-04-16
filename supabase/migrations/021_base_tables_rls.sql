-- ------------------------------------------------------------
-- Migration 021: Enable RLS on base platform tables
--
-- The Supabase security advisor flagged these public-schema tables
-- as having RLS disabled. All submission tables created in migrations
-- 010–020 already have RLS; this migration closes the gap on the
-- core reference/infrastructure tables.
--
-- NOTE: The app uses createAdminClient() (service role key) for all
-- write operations and sensitive reads — the service role bypasses
-- RLS regardless of policies. These policies cover the browser
-- Supabase client used for non-privileged reads.
-- ------------------------------------------------------------

-- ── 1. organizations ─────────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own organisation record
CREATE POLICY "organizations_read_own"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ── 2. properties ─────────────────────────────────────────────
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read properties that belong to their org
CREATE POLICY "properties_read_own_org"
  ON properties FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ── 3. roles ──────────────────────────────────────────────────
-- This is a static reference table (role names/descriptions).
-- All authenticated users need to read it for role-name lookups.
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_read_authenticated"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- ── 4. user_property_roles ────────────────────────────────────
ALTER TABLE user_property_roles ENABLE ROW LEVEL SECURITY;

-- Users can always read their own role assignments
CREATE POLICY "user_property_roles_read_own"
  ON user_property_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Org admins / super admins can read all role assignments in their org
CREATE POLICY "user_property_roles_read_org_admins"
  ON user_property_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_property_roles upr ON upr.user_id = p.id
      JOIN roles r                 ON r.id         = upr.role_id
      WHERE p.id = auth.uid()
        AND r.name IN ('super_admin', 'org_admin', 'group_ops_manager', 'general_manager')
    )
  );

-- ── 5. property_modules ───────────────────────────────────────
ALTER TABLE property_modules ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read module config for their org properties
CREATE POLICY "property_modules_read_own_org"
  ON property_modules FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
