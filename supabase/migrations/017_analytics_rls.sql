-- ------------------------------------------------------------
-- Migration 017: Org-wide read policies for analytics
--
-- Problem: analytics.ts uses createClient() (user JWT + RLS).
-- The existing "read_own_property" policies on bar, lunch/dinner,
-- breakfast, and duty_manager tables only let users see rows
-- for properties they individually have a role on.
-- org_admin / group_ops_manager must be able to read ALL submissions
-- across the organisation for the analytics dashboard to work.
--
-- mystery_shopper already had a similar org-wide policy for those
-- three roles; this migration adds parity across all tables
-- and also covers general_manager (who should see their own org data).
-- ------------------------------------------------------------

-- ── Bar Checklist ────────────────────────────────────────────
CREATE POLICY "bar_read_org_managers"
  ON bar_checklist_submissions FOR SELECT
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

-- ── Restaurant Lunch / Dinner ────────────────────────────────
CREATE POLICY "restaurant_ld_read_org_managers"
  ON restaurant_lunch_dinner_submissions FOR SELECT
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

-- ── Restaurant Breakfast ─────────────────────────────────────
CREATE POLICY "restaurant_bk_read_org_managers"
  ON restaurant_breakfast_submissions FOR SELECT
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

-- ── Duty Manager ─────────────────────────────────────────────
CREATE POLICY "duty_manager_read_org_managers"
  ON duty_manager_submissions FOR SELECT
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

-- ── Mystery Shopper — add general_manager to existing gap ────
-- The existing "Group managers can view all org submissions" policy
-- covers super_admin, org_admin, group_ops_manager.
-- This adds general_manager parity so they can see their org's
-- mystery shopper data in analytics too.
CREATE POLICY "mystery_shopper_read_general_manager"
  ON mystery_shopper_submissions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_property_roles upr
      JOIN roles r ON r.id = upr.role_id
      WHERE upr.user_id = auth.uid()
        AND r.name = 'general_manager'
    )
  );
