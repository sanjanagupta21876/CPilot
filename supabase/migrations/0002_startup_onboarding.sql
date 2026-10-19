-- =============================================================
-- City Launchpad — Migration: 0002_startup_onboarding.sql
-- Adds `cities` table for catalog-driven city selection
-- and extends `startup_profiles` with Phase 4 onboarding fields.
-- =============================================================

-- ─── 1. CITIES CATALOG ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  state       text NOT NULL,
  tier        text NOT NULL DEFAULT 'Tier 1',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated and anonymous users to view supported cities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cities' AND policyname = 'Cities are viewable by everyone'
  ) THEN
    CREATE POLICY "Cities are viewable by everyone"
      ON cities FOR SELECT
      USING (true);
  END IF;
END $$;

-- Seed core Indian startup hubs
INSERT INTO cities (name, state, tier)
VALUES
  ('Bengaluru', 'Karnataka', 'Tier 1'),
  ('Mumbai', 'Maharashtra', 'Tier 1'),
  ('Delhi-NCR', 'National Capital Region', 'Tier 1'),
  ('Hyderabad', 'Telangana', 'Tier 1'),
  ('Pune', 'Maharashtra', 'Tier 1'),
  ('Chennai', 'Tamil Nadu', 'Tier 1')
ON CONFLICT (name) DO UPDATE
  SET state = EXCLUDED.state, tier = EXCLUDED.tier;

-- ─── 2. EXTEND STARTUP PROFILES ────────────────────────────────
ALTER TABLE startup_profiles
  ADD COLUMN IF NOT EXISTS business_description text,
  ADD COLUMN IF NOT EXISTS current_city text,
  ADD COLUMN IF NOT EXISTS price_min numeric,
  ADD COLUMN IF NOT EXISTS price_max numeric,
  ADD COLUMN IF NOT EXISTS primary_channel text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS product_category text,
  ADD COLUMN IF NOT EXISTS target_geography text,
  ADD COLUMN IF NOT EXISTS expansion_cities text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS traction_summary text,
  ADD COLUMN IF NOT EXISTS expansion_context text;

-- Optional constraint to ensure price_min <= price_max when both are provided
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_price_range'
  ) THEN
    ALTER TABLE startup_profiles
      ADD CONSTRAINT check_price_range
      CHECK (price_min IS NULL OR price_max IS NULL OR price_min <= price_max);
  END IF;
END $$;
