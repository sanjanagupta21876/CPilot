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
