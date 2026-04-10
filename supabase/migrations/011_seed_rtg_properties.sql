-- ------------------------------------------------------------
-- Migration 011: Seed the 6 remaining RTG hotel properties
-- Victoria Falls Rainbow Hotel already exists (id: 30000000-...)
-- Run this in the Supabase SQL editor.
-- ------------------------------------------------------------

DO $$
DECLARE
  org_id uuid := '10000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO properties (organization_id, name, code)
  SELECT org_id, v.name, v.code
  FROM (VALUES
    ('Rainbow Towers Hotel',          'RTH'),
    ('New Ambassador Hotel',          'NAH'),
    ('Montclair Hotel',               'MCH'),
    ('Kadoma Rainbow Hotel',          'KRH'),
    ('Bulawayo Rainbow Hotel',        'BRH'),
    ('A''Zambezi River Lodge',        'AZL')
  ) AS v(name, code)
  WHERE NOT EXISTS (
    SELECT 1 FROM properties p
    WHERE p.organization_id = org_id AND p.name = v.name
  );
END $$;
