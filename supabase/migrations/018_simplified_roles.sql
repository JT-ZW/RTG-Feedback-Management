-- ------------------------------------------------------------
-- Migration 018: Simplified role set for user management
-- Only two roles are active in the product for now:
--   org_admin          → "System Administrator"
--   group_ops_manager  → "Group Operations Director"
--
-- All other existing roles are left intact (not deleted) so
-- that historical data and FK references are preserved.
-- ------------------------------------------------------------

-- Ensure the two active roles exist with correct descriptions
INSERT INTO roles (name, description)
VALUES
  ('org_admin',          'System Administrator — full org access, user management'),
  ('group_ops_manager',  'Group Operations Director — cross-property analytics and oversight')
ON CONFLICT (name) DO UPDATE
  SET description = EXCLUDED.description;

-- Add a display_label column so the UI can show friendly names
-- without hard-coding the mapping in every client file.
ALTER TABLE roles ADD COLUMN IF NOT EXISTS display_label text;

UPDATE roles SET display_label = 'System Administrator'       WHERE name = 'org_admin';
UPDATE roles SET display_label = 'Group Operations Director'  WHERE name = 'group_ops_manager';
UPDATE roles SET display_label = 'General Manager'            WHERE name = 'general_manager';
UPDATE roles SET display_label = 'Department Head'            WHERE name = 'department_head';
UPDATE roles SET display_label = 'Supervisor'                 WHERE name = 'supervisor';
UPDATE roles SET display_label = 'Super Admin'                WHERE name = 'super_admin';

-- Ensure profiles has a created_at column (may already exist)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
