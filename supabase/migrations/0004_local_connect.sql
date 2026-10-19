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
