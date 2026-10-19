-- =============================================================
-- City Launchpad — Migration: 0007_experiments_notes_patch.sql
-- Fixes missing columns on experiments and experiment_responses
-- Run this in Supabase Dashboard -> SQL Editor
-- =============================================================

ALTER TABLE experiments ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE experiment_responses ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
