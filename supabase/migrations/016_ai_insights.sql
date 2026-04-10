-- ------------------------------------------------------------
-- Migration 016: AI Insights table
-- Stores GROQ-generated operational intelligence reports.
-- Run this in the Supabase SQL editor.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_insights (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id     uuid REFERENCES properties(id) ON DELETE CASCADE,  -- NULL = org-wide
  insight_type    text NOT NULL DEFAULT 'weekly_summary'
                    CHECK (insight_type IN ('weekly_summary', 'property_deep_dive', 'theme_cluster')),
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  content         jsonb NOT NULL,                -- structured GROQ response
  generated_at    timestamptz NOT NULL DEFAULT now(),
  model_used      text NOT NULL DEFAULT 'llama3-70b-8192'
);

-- Index for fast lookups by org
CREATE INDEX IF NOT EXISTS ai_insights_org_idx ON ai_insights (organization_id, generated_at DESC);

-- Auto-update is not needed (generated_at is set once on insert)
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read insights for their own organisation
CREATE POLICY "ai_insights_read_own_org"
  ON ai_insights FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Authenticated users can insert insights for their own organisation
-- (the server action uses the admin client so this is a safety net)
CREATE POLICY "ai_insights_insert_own_org"
  ON ai_insights FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Authenticated users can delete old insights for their own organisation
CREATE POLICY "ai_insights_delete_own_org"
  ON ai_insights FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );
