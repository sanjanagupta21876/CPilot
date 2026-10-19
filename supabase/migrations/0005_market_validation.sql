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

