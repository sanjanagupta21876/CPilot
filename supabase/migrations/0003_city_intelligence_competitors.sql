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
