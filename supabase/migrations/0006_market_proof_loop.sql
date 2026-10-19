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
