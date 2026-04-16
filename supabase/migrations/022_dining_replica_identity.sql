-- ------------------------------------------------------------
-- Migration 022: Set REPLICA IDENTITY FULL on dining survey table
--
-- Supabase Realtime requires REPLICA IDENTITY FULL to evaluate
-- RLS SELECT policies when filtering postgres_changes events
-- per-subscriber. Without it, the Realtime server cannot check
-- which rows each authenticated user is permitted to receive,
-- so no events are delivered.
--
-- This does not affect normal query or insert performance.
-- It only increases the size of WAL (write-ahead log) entries
-- for this table, which is acceptable for this use case.
-- ------------------------------------------------------------

ALTER TABLE dining_survey_submissions REPLICA IDENTITY FULL;
