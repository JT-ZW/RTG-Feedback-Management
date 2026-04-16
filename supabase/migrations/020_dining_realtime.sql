-- ------------------------------------------------------------
-- Migration 020: Enable Supabase Realtime on dining survey table
--
-- This allows the live session dashboard to receive INSERT events
-- via WebSocket without polling. Combined with the existing RLS
-- policies (019_dining_survey.sql), each subscriber only receives
-- rows they are permitted to SELECT.
-- ------------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE dining_survey_submissions;
