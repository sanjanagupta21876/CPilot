-- =============================================================
-- City Launchpad — Complete Consolidated Database Schema
-- Runs migrations 0001 through 0007 in correct dependency order
-- Copy and paste this ENTIRE file into Supabase Dashboard -> SQL Editor
-- =============================================================



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- START: 0001_initial_schema.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================
-- City Launchpad — Initial Database Schema
-- Migration: 0001_initial_schema.sql
-- Run this in: Supabase Dashboard → SQL Editor, OR via Supabase CLI
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- STARTUP PROFILES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS startup_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL CHECK (char_length(name) >= 2),
  industry        text NOT NULL,
  stage           text NOT NULL CHECK (stage IN ('idea','pre-seed','seed','series-a')),
  target_customer text NOT NULL,
  product_desc    text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ─────────────────────────────────────────────────────────────
-- MODULE A: CITY INTELLIGENCE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS city_comparisons (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text NOT NULL CHECK (char_length(title) >= 3),
  cities     text[] NOT NULL,
  status     text NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','analyzing','complete','error')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cities_min_two CHECK (array_length(cities, 1) >= 2)
);

CREATE TABLE IF NOT EXISTS market_indicators (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id uuid NOT NULL REFERENCES city_comparisons(id) ON DELETE CASCADE,
  city          text NOT NULL,
  indicator     text NOT NULL,
  value         text NOT NULL,
  unit          text,
  source_name   text NOT NULL,
  source_url    text,
  collected_at  date,
  confidence    text NOT NULL DEFAULT 'medium'
                  CHECK (confidence IN ('high','medium','low','unverified')),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fit_scores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id uuid NOT NULL REFERENCES city_comparisons(id) ON DELETE CASCADE,
  city          text NOT NULL,
  criteria      jsonb NOT NULL,
  total_score   numeric(5,2) NOT NULL,
  max_score     numeric(5,2) NOT NULL DEFAULT 100,
  computed_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comparison_id, city)
);

-- ─────────────────────────────────────────────────────────────
-- MODULE B: LOCAL CONNECT
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city           text NOT NULL,
  name           text NOT NULL,
  organization   text,
  role           text,
  category       text NOT NULL
                   CHECK (category IN ('retailer','distributor','mentor','institution','supplier','pilot-customer')),
  industry_tags  text[] NOT NULL DEFAULT '{}',
  description    text,
  source_name    text NOT NULL,
  source_url     text,
  verified       boolean NOT NULL DEFAULT false,
  verified_at    timestamptz,
  is_demo        boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS introduction_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id   uuid NOT NULL REFERENCES contacts(id),
  message      text NOT NULL,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','accepted','declined','withdrawn')),
  match_reason text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- MODULE C: MARKET VALIDATION
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS experiments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comparison_id      uuid REFERENCES city_comparisons(id),
  title              text NOT NULL,
  hypothesis         text NOT NULL,
  method             text NOT NULL
                       CHECK (method IN ('interview','survey','retailer-outreach','landing-page','pilot')),
  city               text NOT NULL,
  target_metric      text NOT NULL,
  success_threshold  text NOT NULL,
  status             text NOT NULL DEFAULT 'planned'
                       CHECK (status IN ('planned','active','complete','cancelled')),
  started_at         timestamptz,
  completed_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS experiment_responses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id    uuid NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  respondent_label text NOT NULL,
  response_type    text NOT NULL
                     CHECK (response_type IN ('interview','survey-submission','observation','purchase','signup')),
  outcome          text NOT NULL
                     CHECK (outcome IN ('positive','negative','neutral','inconclusive')),
  notes            text,
  evidence_url     text,
  recorded_at      timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- MARKET PROOF LOOP
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assumptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comparison_id uuid REFERENCES city_comparisons(id),
  statement     text NOT NULL,
  source_type   text NOT NULL
                  CHECK (source_type IN ('city-intelligence','manual','llm-synthesis')),
  status        text NOT NULL DEFAULT 'untested'
                  CHECK (status IN ('untested','supported','challenged','invalidated')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assumption_evidence (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assumption_id uuid NOT NULL REFERENCES assumptions(id) ON DELETE CASCADE,
  experiment_id uuid REFERENCES experiments(id),
  indicator_id  uuid REFERENCES market_indicators(id),
  direction     text NOT NULL CHECK (direction IN ('supports','challenges','neutral')),
  notes         text,
  linked_at     timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_city_comparisons_user ON city_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_market_indicators_comparison ON market_indicators(comparison_id, city);
CREATE INDEX IF NOT EXISTS idx_contacts_city_category ON contacts(city, category);
CREATE INDEX IF NOT EXISTS idx_contacts_industry_tags ON contacts USING GIN(industry_tags);
CREATE INDEX IF NOT EXISTS idx_intro_requests_user ON introduction_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_experiments_user_status ON experiments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_experiment_responses_exp ON experiment_responses(experiment_id);
CREATE INDEX IF NOT EXISTS idx_assumptions_user_status ON assumptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_assumption_evidence_assumption ON assumption_evidence(assumption_id);

-- ─────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGERS
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_startup_profiles_updated_at
  BEFORE UPDATE ON startup_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_city_comparisons_updated_at
  BEFORE UPDATE ON city_comparisons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_intro_requests_updated_at
  BEFORE UPDATE ON introduction_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_experiments_updated_at
  BEFORE UPDATE ON experiments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_assumptions_updated_at
  BEFORE UPDATE ON assumptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE startup_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_comparisons       ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_indicators      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fit_scores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE introduction_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_responses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE assumptions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE assumption_evidence    ENABLE ROW LEVEL SECURITY;

-- startup_profiles: user-scoped CRUD
CREATE POLICY "startup_profiles_select" ON startup_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "startup_profiles_insert" ON startup_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "startup_profiles_update" ON startup_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "startup_profiles_delete" ON startup_profiles FOR DELETE USING (auth.uid() = user_id);

-- city_comparisons: user-scoped CRUD
CREATE POLICY "city_comparisons_select" ON city_comparisons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "city_comparisons_insert" ON city_comparisons FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "city_comparisons_update" ON city_comparisons FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "city_comparisons_delete" ON city_comparisons FOR DELETE USING (auth.uid() = user_id);

-- market_indicators: inherit from parent comparison ownership
CREATE POLICY "market_indicators_select" ON market_indicators FOR SELECT
  USING (EXISTS (SELECT 1 FROM city_comparisons c WHERE c.id = comparison_id AND c.user_id = auth.uid()));
CREATE POLICY "market_indicators_insert" ON market_indicators FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM city_comparisons c WHERE c.id = comparison_id AND c.user_id = auth.uid()));
CREATE POLICY "market_indicators_update" ON market_indicators FOR UPDATE
  USING (EXISTS (SELECT 1 FROM city_comparisons c WHERE c.id = comparison_id AND c.user_id = auth.uid()));
CREATE POLICY "market_indicators_delete" ON market_indicators FOR DELETE
  USING (EXISTS (SELECT 1 FROM city_comparisons c WHERE c.id = comparison_id AND c.user_id = auth.uid()));

-- fit_scores: inherit from parent comparison ownership
CREATE POLICY "fit_scores_select" ON fit_scores FOR SELECT
  USING (EXISTS (SELECT 1 FROM city_comparisons c WHERE c.id = comparison_id AND c.user_id = auth.uid()));
CREATE POLICY "fit_scores_insert" ON fit_scores FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM city_comparisons c WHERE c.id = comparison_id AND c.user_id = auth.uid()));
CREATE POLICY "fit_scores_update" ON fit_scores FOR UPDATE
  USING (EXISTS (SELECT 1 FROM city_comparisons c WHERE c.id = comparison_id AND c.user_id = auth.uid()));
CREATE POLICY "fit_scores_delete" ON fit_scores FOR DELETE
  USING (EXISTS (SELECT 1 FROM city_comparisons c WHERE c.id = comparison_id AND c.user_id = auth.uid()));

-- contacts: publicly readable, no private data
CREATE POLICY "contacts_select_all" ON contacts FOR SELECT USING (true);
-- contacts insert/update/delete: requires service role (admin only via API)

-- introduction_requests: user-scoped
CREATE POLICY "intro_requests_select" ON introduction_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "intro_requests_insert" ON introduction_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "intro_requests_update" ON introduction_requests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "intro_requests_delete" ON introduction_requests FOR DELETE USING (auth.uid() = user_id);

-- experiments: user-scoped
CREATE POLICY "experiments_select" ON experiments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "experiments_insert" ON experiments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "experiments_update" ON experiments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "experiments_delete" ON experiments FOR DELETE USING (auth.uid() = user_id);

-- experiment_responses: inherit from parent experiment ownership
CREATE POLICY "exp_responses_select" ON experiment_responses FOR SELECT
  USING (EXISTS (SELECT 1 FROM experiments e WHERE e.id = experiment_id AND e.user_id = auth.uid()));
CREATE POLICY "exp_responses_insert" ON experiment_responses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM experiments e WHERE e.id = experiment_id AND e.user_id = auth.uid()));
CREATE POLICY "exp_responses_update" ON experiment_responses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM experiments e WHERE e.id = experiment_id AND e.user_id = auth.uid()));
CREATE POLICY "exp_responses_delete" ON experiment_responses FOR DELETE
  USING (EXISTS (SELECT 1 FROM experiments e WHERE e.id = experiment_id AND e.user_id = auth.uid()));

-- assumptions: user-scoped
CREATE POLICY "assumptions_select" ON assumptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "assumptions_insert" ON assumptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assumptions_update" ON assumptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "assumptions_delete" ON assumptions FOR DELETE USING (auth.uid() = user_id);

-- assumption_evidence: inherit from parent assumption ownership
CREATE POLICY "assumption_evidence_select" ON assumption_evidence FOR SELECT
  USING (EXISTS (SELECT 1 FROM assumptions a WHERE a.id = assumption_id AND a.user_id = auth.uid()));
CREATE POLICY "assumption_evidence_insert" ON assumption_evidence FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM assumptions a WHERE a.id = assumption_id AND a.user_id = auth.uid()));
CREATE POLICY "assumption_evidence_delete" ON assumption_evidence FOR DELETE
  USING (EXISTS (SELECT 1 FROM assumptions a WHERE a.id = assumption_id AND a.user_id = auth.uid()));


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- START: 0002_startup_onboarding.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- START: 0003_city_intelligence_competitors.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================
-- City Launchpad — Migration: 0003_city_intelligence_competitors.sql
-- Enriches City Intelligence with:
-- 1. `competitors` catalog table with source tracking
-- 2. Enhanced provenance fields on `market_indicators`
-- 3. Scoring version, evidence coverage & startup linkage on `fit_scores` & `city_comparisons`
-- =============================================================

-- ─── 1. COMPETITORS TABLE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS competitors (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city           text NOT NULL,
  name           text NOT NULL,
  category       text NOT NULL,
  offering       text NOT NULL,
  observed_price numeric,
  price_unit     text,
  currency       text NOT NULL DEFAULT 'INR',
  source_url     text,
  observed_date  date,
  notes          text,
  is_simulated   boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'competitors' AND policyname = 'Competitors are viewable by everyone'
  ) THEN
    CREATE POLICY "Competitors are viewable by everyone"
      ON competitors FOR SELECT
      USING (true);
  END IF;
END $$;

-- Seed verified benchmark local market competitors
INSERT INTO competitors (city, name, category, offering, observed_price, price_unit, currency, source_url, observed_date, notes, is_simulated)
VALUES
  ('Bengaluru', 'Khatabook', 'SaaS / Fintech', 'Digital ledger and inventory management for MSME retailers', 1200, 'Year', 'INR', 'https://khatabook.com', '2024-03-01', 'Entry subscription price for premium inventory reconciliation features.', false),
  ('Bengaluru', 'Dunzo for Business', 'Logistics & Quick Delivery', 'On-demand B2B local courier delivery under 60 mins', 65, 'Per Order (0-3km)', 'INR', 'https://www.dunzo.com/merchant', '2024-01-15', 'Standard merchant base fare across central tech corridors.', false),
  ('Mumbai', 'JioMart Partner', 'B2B Wholesale / FMCG', 'Kirana bulk ordering and distribution network with credit line', NULL, 'Wholesale Margins (3-6%)', 'INR', 'https://www.jiomartpartner.com', '2024-02-10', 'Dominant organized supply channel in MMR with cold storage footprint.', false),
  ('Mumbai', 'Bizongo', 'Packaging & Supply Chain', 'Custom branded D2C packaging and procurement workflow', 8500, 'Minimum Batch Order', 'INR', 'https://www.bizongo.com', '2024-04-12', 'Standard MOQ starter pack for emerging consumer food brands.', false),
  ('Delhi-NCR', 'Shiprocket', 'Logistics / E-commerce', 'Pan-India automated courier aggregation and dark store fulfillment', 38, 'Per 500g Forward Air', 'INR', 'https://www.shiprocket.in/pricing', '2024-03-20', 'Volume-tiered introductory rate for Gurugram and Delhi D2C shippers.', false),
  ('Hyderabad', 'WayCool Foods', 'Agritech / Fresh B2B', 'Farm-to-fork distribution for hotels, restaurants and retailers', NULL, 'Wholesale Commission (8-12%)', 'INR', 'https://waycool.in', '2024-02-18', 'Leading fresh procurement network operating out of Shamshabad facility.', false),
  ('Pune', 'AgroStar Retail', 'Agri Inputs & Tech', 'Omnichannel farmer advisory, seeds, and micro-irrigation delivery', 450, 'Average Ticket Size', 'INR', 'https://corporate.agrostar.in', '2024-01-30', 'Direct-to-farm doorstep delivery across western Maharashtra.', false),
  ('Chennai', 'Zoho Commerce', 'SaaS / Storefront', 'Integrated e-commerce storefront, local payment gateways and inventory sync', 1999, 'Month', 'INR', 'https://www.zoho.com/commerce', '2024-03-10', 'Popular regional SaaS platform used by South Indian D2C manufacturers.', false)
ON CONFLICT DO NOTHING;

-- ─── 2. ENHANCE MARKET INDICATORS ─────────────────────────────
ALTER TABLE market_indicators
  ADD COLUMN IF NOT EXISTS geographic_scope text DEFAULT 'metro',
  ADD COLUMN IF NOT EXISTS data_period text,
  ADD COLUMN IF NOT EXISTS is_simulated boolean DEFAULT false;

-- ─── 3. ENHANCE FIT SCORES & COMPARISONS ───────────────────────
ALTER TABLE fit_scores
  ADD COLUMN IF NOT EXISTS scoring_model_version text DEFAULT 'v1.0.0',
  ADD COLUMN IF NOT EXISTS evidence_coverage numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS missing_criteria text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS insufficient_data boolean DEFAULT false;

ALTER TABLE city_comparisons
  ADD COLUMN IF NOT EXISTS startup_id uuid REFERENCES startup_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scoring_model_version text DEFAULT 'v1.0.0';


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- START: 0004_local_connect.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================
-- City Launchpad — Migration: 0004_local_connect.sql
-- Enriches Local Connect with:
-- 1. Expanded category check constraint & capabilities on `contacts`
-- 2. Granular verification_status, service_area, website_url on `contacts`
-- 3. `local_resources` view alias for transparent querying
-- 4. Structured introduction request fields (purpose, context, outcome, startup_id)
-- 5. Updated status lifecycle ('pending','accepted','declined','withdrawn','cancelled','completed')
-- 6. High-performance indexes & RLS enforcement
-- 7. Seeded Indian startup ecosystem resources
-- =============================================================

-- ─── 1. EXTEND CONTACTS / LOCAL RESOURCES ───────────────────────
DO $$
BEGIN
  -- Update category check constraint to include logistics and service-provider
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_category_check'
  ) THEN
    ALTER TABLE contacts DROP CONSTRAINT contacts_category_check;
  END IF;

  ALTER TABLE contacts
    ADD CONSTRAINT contacts_category_check
    CHECK (category IN (
      'retailer',
      'distributor',
      'mentor',
      'institution',
      'supplier',
      'pilot-customer',
      'logistics',
      'service-provider'
    ));
END $$;

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS capabilities text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS service_area text DEFAULT 'Pan-City',
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ensure verification_status is constrained
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_verification_status_check'
  ) THEN
    ALTER TABLE contacts
      ADD CONSTRAINT contacts_verification_status_check
      CHECK (verification_status IN ('unverified', 'source_checked', 'directly_confirmed'));
  END IF;
END $$;

-- Backfill verification_status from legacy boolean verified flag where applicable
UPDATE contacts
SET verification_status = CASE
  WHEN verified = true THEN 'directly_confirmed'
  ELSE 'unverified'
END
WHERE verification_status = 'unverified' AND verified = true;

-- Indexes for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_city ON contacts(city);
CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts(category);
CREATE INDEX IF NOT EXISTS idx_contacts_verification_status ON contacts(verification_status);
CREATE INDEX IF NOT EXISTS idx_contacts_industry_tags ON contacts USING gin(industry_tags);
CREATE INDEX IF NOT EXISTS idx_contacts_capabilities ON contacts USING gin(capabilities);

-- Transparent view alias for local_resources
CREATE OR REPLACE VIEW local_resources AS
SELECT
  id,
  city,
  name,
  organization,
  role,
  category,
  industry_tags,
  capabilities,
  service_area,
  description,
  website_url,
  source_name,
  source_url,
  verified,
  verified_at,
  verification_status,
  is_demo,
  created_at,
  updated_at
FROM contacts;

-- ─── 2. ENHANCE INTRODUCTION REQUESTS ──────────────────────────
ALTER TABLE introduction_requests
  ADD COLUMN IF NOT EXISTS startup_id uuid REFERENCES startup_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS business_context text,
  ADD COLUMN IF NOT EXISTS desired_outcome text,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS response_note text,
  ADD COLUMN IF NOT EXISTS recipient_id uuid;

-- Update status constraint to include cancelled, withdrawn, completed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'introduction_requests_status_check'
  ) THEN
    ALTER TABLE introduction_requests DROP CONSTRAINT introduction_requests_status_check;
  END IF;

  ALTER TABLE introduction_requests
    ADD CONSTRAINT introduction_requests_status_check
    CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn', 'cancelled', 'completed'));
END $$;

-- Indexes for introduction_requests
CREATE INDEX IF NOT EXISTS idx_intro_requests_user_id ON introduction_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_intro_requests_contact_id ON introduction_requests(contact_id);
CREATE INDEX IF NOT EXISTS idx_intro_requests_startup_id ON introduction_requests(startup_id);
CREATE INDEX IF NOT EXISTS idx_intro_requests_status ON introduction_requests(status);

-- ─── 3. ROW LEVEL SECURITY ─────────────────────────────────────
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE introduction_requests ENABLE ROW LEVEL SECURITY;

-- Public contacts reading (no private personal details stored)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'contacts_select_all'
  ) THEN
    CREATE POLICY "contacts_select_all" ON contacts FOR SELECT USING (true);
  END IF;
END $$;

-- Introduction requests: strictly isolated to the owning founder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'introduction_requests' AND policyname = 'intro_requests_select'
  ) THEN
    CREATE POLICY "intro_requests_select" ON introduction_requests
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'introduction_requests' AND policyname = 'intro_requests_insert'
  ) THEN
    CREATE POLICY "intro_requests_insert" ON introduction_requests
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'introduction_requests' AND policyname = 'intro_requests_update'
  ) THEN
    CREATE POLICY "intro_requests_update" ON introduction_requests
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ─── 4. SEED EXPANDED ECOSYSTEM RESOURCES ───────────────────────
INSERT INTO contacts (
  city,
  name,
  organization,
  role,
  category,
  industry_tags,
  capabilities,
  service_area,
  description,
  website_url,
  source_name,
  source_url,
  verified,
  verification_status,
  verified_at,
  is_demo
) VALUES
  (
    'Bengaluru',
    'Ramesh Sundaram',
    'Deccan Express Cold Chains',
    'Director of Commercial Operations',
    'logistics',
    ARRAY['AgriTech', 'Cold Storage', 'Supply Chain', 'Logistics'],
    ARRAY['Multi-temperature Fleet', 'Dark Store Warehousing', 'Real-time Telemetry API', 'Last-Mile Cold Courier'],
    'South Bengaluru & Electronic City Corridor',
    'Specialized refrigerated fleet operating across Karnataka horticulture clusters. Handles pharmaceuticals and high-value produce.',
    'https://deccancoldchains.example.in',
    'Karnataka Cold Storage Association Registry 2026',
    'https://karnatakacoldchains.org/members',
    true,
    'directly_confirmed',
    '2026-09-12T10:00:00Z',
    true
  ),
  (
    'Bengaluru',
    'Ananya Raghavan',
    'WayCool Agritech Logistics',
    'Head of Cold Chain Procurement',
    'distributor',
    ARRAY['Logistics', 'Supply Chain', 'B2B Retail', 'AgriTech'],
    ARRAY['Bulk Farm Procurement', 'Kirana Store Replenishment', 'Cross-docking', 'Quality Grading'],
    'Bengaluru Urban & Rural',
    'Handles 400+ tons/day of fresh produce across South India with direct tie-ups to 12,000 retail endpoints.',
    'https://waycool.in',
    'AgriLogistics Summit 2026 Directory',
    'https://waycool.in',
    true,
    'directly_confirmed',
    '2026-09-05T11:30:00Z',
    true
  ),
  (
    'Bengaluru',
    'Kavita Menon',
    'Nature Basket Supermarkets',
    'Regional Category Manager - Fresh',
    'retailer',
    ARRAY['Premium Retail', 'Organic Produce', 'D2C', 'Consumer Goods'],
    ARRAY['Vendor Onboarding', 'Shelf-space Allocation', 'D2C Pilot Shelves', 'Weekly SKU Reconciliation'],
    'Central & East Bengaluru (Indiranagar, Koramangala, Whitefield)',
    'Sourcing organic, hydroponic, and export-grade vegetables for 32 retail stores in prime tech corridors.',
    'https://naturesbasket.co.in',
    'LinkedIn Verified Recruiter',
    NULL,
    true,
    'source_checked',
    '2026-09-20T16:00:00Z',
    true
  ),
  (
    'Pune',
    'Suresh Patil',
    'Sahyadri Farmers Producer Co.',
    'Chairman & Managing Director',
    'institution',
    ARRAY['AgriTech', 'Cold Storage', 'FPO', 'Horticulture'],
    ARRAY['FPO Aggregation', 'Farm-gate Infrastructure', 'Export Packing', 'Farmer Outreach'],
    'Pune & Nashik Belt',
    'Largest horticulture FPO network in India with 18,000+ farmer members and primary processing facilities.',
    'https://sahyadrifarms.com',
    'Sahyadri Farms Annual Report & ROC',
    'https://sahyadrifarms.com',
    true,
    'directly_confirmed',
    '2026-09-01T10:00:00Z',
    true
  ),
  (
    'Pune',
    'Deepak Deshmukh',
    'Maharashtra Precision Components',
    'VP Supply Chain',
    'supplier',
    ARRAY['Hardware', 'Manufacturing', 'IoT', 'AgriTech'],
    ARRAY['Sheet Metal Enclosures', 'IP67 Waterproof Casings', 'Rapid Prototyping', 'ISO 9001 Batch Assembly'],
    'Bhosari & Chakan Industrial Belt, Pune',
    'OEM fabrication partner specializing in ruggedized outdoor enclosures and sensor enclosures for industrial IoT.',
    'https://mahaprecision.example.com',
    'Chakan MIDC Industrial Directory 2026',
    'https://chakanmidc.org/directory',
    true,
    'directly_confirmed',
    '2026-08-25T14:30:00Z',
    true
  ),
  (
    'Pune',
    'Adv. Neha Kulkarni',
    'Apex Legal & Regulatory Advisors',
    'Managing Partner',
    'service-provider',
    ARRAY['Legal', 'Regulatory', 'AgriTech', 'Compliance'],
    ARRAY['APMC Mandi Licensing', 'FSSAI Approvals', 'Vendor Contract Drafting', 'IP Protection'],
    'Pan-Maharashtra',
    'Advises early and growth stage B2B and AgriTech startups on state-level agriculture marketing laws and compliance.',
    'https://apexlegalpune.example.com',
    'Bar Council of Maharashtra Registry',
    NULL,
    true,
    'source_checked',
    '2026-09-18T09:00:00Z',
    true
  ),
  (
    'Mumbai',
    'Vikram Singhania',
    'Apex B2B Mart & Wholesalers',
    'General Manager',
    'distributor',
    ARRAY['FMCG', 'Consumer Goods', 'Retail', 'B2B'],
    ARRAY['Kirana Network Distribution', 'Wholesale Credit Financing', 'Cash-and-Carry Distribution'],
    'Mumbai Metropolitan Region & Navi Mumbai',
    'Distribution aggregator servicing 2,500+ general trade grocery stores with daily deliveries across MMR.',
    'https://apexb2bmart.example.com',
    'Trade Directory MMR 2026',
    NULL,
    false,
    'unverified',
    NULL,
    true
  ),
  (
    'Mumbai',
    'Dr. Aruna Shenoy',
    'Metro Mumbai Healthcare Collective',
    'Chief Procurement Officer',
    'pilot-customer',
    ARRAY['HealthTech', 'Diagnostics', 'Biotech', 'Hospitality'],
    ARRAY['Hospital Pilot Trials', 'Bulk Diagnostic Supply Procurement', 'Clinical Evidence Evaluation'],
    'Greater Mumbai & Thane',
    'Network of 14 specialty hospitals and community diagnostics centers evaluating digitized medical supply solutions.',
    'https://mumbaihealthcarecol.example.org',
    'Public Hospital Consortium Listing',
    'https://mumbaihealthcarecol.example.org',
    true,
    'source_checked',
    '2026-09-28T11:00:00Z',
    true
  ),
  (
    'Hyderabad',
    'K. Tarun Reddy',
    'T-Hub Ecosystem Partnerships',
    'Director of Corporate Innovation',
    'institution',
    ARRAY['General', 'DeepTech', 'B2B', 'SaaS', 'AgriTech'],
    ARRAY['Corporate Pilot Brokering', 'State Govt Sandbox Access', 'Investor Showcases', 'Mentor Matching'],
    'Telangana & Pan-South India',
    'India''s premier innovation hub driving market-entry pilots between growth-stage startups and enterprise partners.',
    'https://t-hub.co',
    'T-Hub Official Website',
    'https://t-hub.co',
    true,
    'directly_confirmed',
    '2026-09-02T15:00:00Z',
    true
  ),
  (
    'Hyderabad',
    'Venkat Raman',
    'Deccan Agri Seed & Fertilizer Wholesale',
    'Proprietor',
    'supplier',
    ARRAY['AgriTech', 'Farming Inputs', 'Distribution'],
    ARRAY['Dealer Channel Onboarding', 'Regional Credit Network', 'Seed & Nutrient Procurement'],
    'Telangana & Rayalaseema',
    'Wholesale dealer network supplying 450+ rural retail counters with agricultural inputs and technology kits.',
    NULL,
    'Trade Directory Hyderabad',
    NULL,
    false,
    'unverified',
    NULL,
    true
  ),
  (
    'Delhi-NCR',
    'Meera Sharma',
    'Capital Distribution Co.',
    'Operations Head',
    'distributor',
    ARRAY['FMCG', 'Electronics', 'B2B', 'Consumer Goods'],
    ARRAY['Warehousing Okhla Hub', 'Regional Parcel Linehaul', 'GST B2B Invoicing', 'Consignment Storage'],
    'Delhi, Gurugram & Noida',
    'Pan-NCR distributor operating a 35,000 sq ft central hub in Okhla with 24-hour turnaround for electronics and retail.',
    'https://capitaldistro.example.com',
    'Delhi Chamber of Commerce 2026 Roster',
    NULL,
    true,
    'source_checked',
    '2026-08-30T10:00:00Z',
    true
  ),
  (
    'Delhi-NCR',
    'Gaurav Bhasin',
    'NCR Angels & Enterprise Mentors',
    'Venture Partner',
    'mentor',
    ARRAY['B2B', 'SaaS', 'Enterprise Sales', 'Fintech'],
    ARRAY['Enterprise Deal Structuring', 'Procurement Navigating', 'Pricing Strategy', 'Series-A Advisory'],
    'Gurugram & South Delhi',
    'Former VP Enterprise Sales at HCL and serial founder; advises early B2B founders on sales execution and pilot pricing.',
    'https://ncrangels.example.com',
    'NCR Angels Network',
    NULL,
    true,
    'directly_confirmed',
    '2026-09-10T12:00:00Z',
    true
  ),
  (
    'Chennai',
    'Raja Krishnan',
    'South India Retail Consortium',
    'Secretary General',
    'institution',
    ARRAY['Retail', 'FMCG', 'Consumer Brands', 'Textiles'],
    ARRAY['Retailer Collective Negotiations', 'Trade Delegation Access', 'Market Expansion Seminars'],
    'Tamil Nadu & Puducherry',
    'Apex trade body for organized and independent retail store owners across Tamil Nadu.',
    'https://sirc-retail.example.in',
    'Industry Body Website',
    'https://sirc-retail.example.in',
    true,
    'source_checked',
    '2026-09-08T14:00:00Z',
    true
  ),
  (
    'Chennai',
    'S. Murugan',
    'Coromandel Freight & Dark Stores',
    'Chief Logistics Officer',
    'logistics',
    ARRAY['Logistics', 'Warehousing', 'B2B', 'Automotive'],
    ARRAY['Dark Store Warehousing', 'Port Drayage', 'Overnight B2B Dispatch', 'Inventory Tracking'],
    'Chennai Metro & Sriperumbudur Industrial Corridor',
    'Operates 4 distribution nodes near Chennai Port and Guindy with micro-fulfillment dark stores.',
    'https://coromandelfreight.example.com',
    'Tamil Nadu Logistics Federation',
    NULL,
    false,
    'unverified',
    NULL,
    true
  )
ON CONFLICT DO NOTHING;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- START: 0005_market_validation.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================
-- City Launchpad — Migration: 0005_market_validation.sql
-- Phase 7: Local Market Validation
--
-- Adds:
-- 1. hypotheses table — falsifiable market hypotheses per city/startup
-- 2. threshold_history table — immutable audit log for success criteria changes
-- 3. experiments enhancements — structured threshold fields & hypothesis relation
-- 4. experiment_responses enhancements — commercial signal tiers & financial values
-- 5. indexes, triggers, and Row Level Security policies
-- =============================================================

-- ─── 1. HYPOTHESES TABLE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS hypotheses (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  startup_id          uuid REFERENCES startup_profiles(id) ON DELETE CASCADE,
  comparison_id       uuid REFERENCES city_comparisons(id) ON DELETE SET NULL,
  city                text NOT NULL,
  statement           text NOT NULL CHECK (char_length(statement) >= 10),
  target_audience     text NOT NULL,
  problem_statement   text NOT NULL,
  expected_behavior   text NOT NULL,
  strategic_rationale text,
  status              text NOT NULL DEFAULT 'untested'
                        CHECK (status IN ('untested', 'testing', 'supported', 'challenged', 'inconclusive')),
  is_demo             boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hypotheses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hypotheses_select" ON hypotheses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "hypotheses_insert" ON hypotheses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hypotheses_update" ON hypotheses
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "hypotheses_delete" ON hypotheses
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_hypotheses_user ON hypotheses(user_id);
CREATE INDEX IF NOT EXISTS idx_hypotheses_city ON hypotheses(city);
CREATE INDEX IF NOT EXISTS idx_hypotheses_status ON hypotheses(status);
CREATE INDEX IF NOT EXISTS idx_hypotheses_startup ON hypotheses(startup_id);

CREATE TRIGGER trg_hypotheses_updated_at
  BEFORE UPDATE ON hypotheses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 2. THRESHOLD AUDIT HISTORY ──────────────────────────────
CREATE TABLE IF NOT EXISTS threshold_history (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  experiment_id      uuid NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  previous_threshold text NOT NULL,
  new_threshold      text NOT NULL,
  change_reason      text NOT NULL CHECK (char_length(change_reason) >= 5),
  changed_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE threshold_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "threshold_history_select" ON threshold_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "threshold_history_insert" ON threshold_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Immutable audit log: no UPDATE or DELETE allowed

CREATE INDEX IF NOT EXISTS idx_threshold_history_experiment ON threshold_history(experiment_id);
CREATE INDEX IF NOT EXISTS idx_threshold_history_user ON threshold_history(user_id);

-- ─── 3. EXPERIMENT ENHANCEMENTS ──────────────────────────────
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS hypothesis_id uuid REFERENCES hypotheses(id) ON DELETE SET NULL;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS startup_id uuid REFERENCES startup_profiles(id) ON DELETE CASCADE;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS objective text;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS target_audience text;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS sample_size_target integer;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS threshold_metric text;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS threshold_operator text;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS threshold_target numeric;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS threshold_unit text;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS threshold_min_sample integer;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS threshold_rationale text;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS outcome_interpretation text;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS idx_experiments_hypothesis ON experiments(hypothesis_id);

-- ─── 4. EXPERIMENT RESPONSES ENHANCEMENTS ────────────────────
ALTER TABLE experiment_responses ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE experiment_responses ADD COLUMN IF NOT EXISTS signal_tier text;
ALTER TABLE experiment_responses ADD COLUMN IF NOT EXISTS units_count integer;
ALTER TABLE experiment_responses ADD COLUMN IF NOT EXISTS financial_value numeric;
ALTER TABLE experiment_responses ADD COLUMN IF NOT EXISTS rejection_reason text;



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- START: 0006_market_proof_loop.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================
-- City Launchpad — Migration: 0006_market_proof_loop.sql
-- Phase 8: Market Proof Loop
--
-- Adds:
-- 1. hypothesis_intro_links — associates intro requests with hypotheses
-- 2. proof_events — immutable evidence timeline (append-only)
-- 3. indexes + RLS for both new tables
-- =============================================================

-- ─── 1. HYPOTHESIS ↔ INTRODUCTION REQUEST LINK ───────────────
-- Many-to-many: one intro request can support multiple hypotheses,
-- one hypothesis can be supported by multiple intro requests.
CREATE TABLE IF NOT EXISTS hypothesis_intro_links (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hypothesis_id    uuid NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE,
  intro_request_id uuid NOT NULL REFERENCES introduction_requests(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hypothesis_id, intro_request_id)
);

ALTER TABLE hypothesis_intro_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hyp_intro_links_select" ON hypothesis_intro_links
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "hyp_intro_links_insert" ON hypothesis_intro_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hyp_intro_links_delete" ON hypothesis_intro_links
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_hyp_intro_links_hyp ON hypothesis_intro_links(hypothesis_id);
CREATE INDEX IF NOT EXISTS idx_hyp_intro_links_req ON hypothesis_intro_links(intro_request_id);
CREATE INDEX IF NOT EXISTS idx_hyp_intro_links_user ON hypothesis_intro_links(user_id);

-- ─── 2. PROOF EVENTS TIMELINE ────────────────────────────────
-- Immutable event log for the evidence timeline.
-- Each event records a meaningful state change across any module.
CREATE TABLE IF NOT EXISTS proof_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hypothesis_id   uuid REFERENCES hypotheses(id) ON DELETE CASCADE,
  startup_id      uuid REFERENCES startup_profiles(id) ON DELETE CASCADE,
  city            text,
  event_type      text NOT NULL CHECK (event_type IN (
    'assessment_created',
    'assessment_refreshed',
    'hypothesis_created',
    'hypothesis_status_changed',
    'intro_request_created',
    'intro_request_updated',
    'experiment_started',
    'experiment_completed',
    'response_recorded',
    'evidence_linked'
  )),
  event_label     text NOT NULL,
  related_record_type text,   -- 'hypothesis' | 'experiment' | 'intro_request' | 'comparison'
  related_record_id   uuid,
  metadata        jsonb DEFAULT '{}',
  occurred_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE proof_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proof_events_select" ON proof_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "proof_events_insert" ON proof_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- No UPDATE or DELETE: events are immutable to preserve history.

CREATE INDEX IF NOT EXISTS idx_proof_events_user ON proof_events(user_id);
CREATE INDEX IF NOT EXISTS idx_proof_events_hypothesis ON proof_events(hypothesis_id);
CREATE INDEX IF NOT EXISTS idx_proof_events_startup ON proof_events(startup_id);
CREATE INDEX IF NOT EXISTS idx_proof_events_occurred_at ON proof_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_proof_events_city ON proof_events(city);


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- START: 0007_experiments_notes_patch.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================
-- City Launchpad — Migration: 0007_experiments_notes_patch.sql
-- Fixes missing columns on experiments and experiment_responses
-- Run this in Supabase Dashboard -> SQL Editor
-- =============================================================

ALTER TABLE experiments ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE experiment_responses ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
