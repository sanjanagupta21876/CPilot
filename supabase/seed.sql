-- =============================================================
-- City Launchpad — Seed Data
-- Run AFTER the migration. All demo records are flagged is_demo=true.
-- NOTE: This does NOT create auth users — register through the app.
-- =============================================================

-- ─── Demo Contacts (Module B seed) ───────────────────────────
INSERT INTO contacts (city, name, organization, role, category, industry_tags, description, source_name, source_url, verified, is_demo)
VALUES
  ('Bengaluru', 'Priya Mehta', 'Metro Retail Group', 'Category Manager', 'retailer',
   ARRAY['fmcg','grocery','d2c'],
   'Manages 40+ SKU categories across 12 hypermarkets in South Bengaluru. Open to piloting D2C brands with regional traction.',
   'LinkedIn', NULL, false, true),

  ('Bengaluru', 'Rajan Iyer', 'Iyer & Sons Distribution', 'Managing Partner', 'distributor',
   ARRAY['fmcg','pharmacy','wellness'],
   'Last-mile distributor covering 600+ kirana stores in HSR Layout, Koramangala and Indiranagar. Established 2009.',
   'Trade Directory', NULL, false, true),

  ('Bengaluru', 'Dr. Kavitha Rao', 'NASSCOM CoE', 'Innovation Lead', 'mentor',
   ARRAY['saas','b2b','deep-tech'],
   'Ex-Infosys product leader. Mentors early-stage B2B SaaS startups. Focus on enterprise go-to-market strategy.',
   'NASSCOM Website', 'https://nasscom.in', true, true),

  ('Bengaluru', 'StartupIndia Bangalore Hub', NULL, 'Incubator', 'institution',
   ARRAY['general','early-stage'],
   'Government-backed incubation centre. Offers workspace, regulatory assistance and investor connects.',
   'StartupIndia Portal', 'https://startupindia.gov.in', true, true),

  ('Mumbai', 'Anand Pillai', 'Western General Traders', 'Proprietor', 'distributor',
   ARRAY['fmcg','beverages','packaged-food'],
   'Distributor with reach across 1,200 outlets in Mumbai suburban region. Handles cold-chain logistics.',
   'Trade Directory', NULL, false, true),

  ('Mumbai', 'Sunita Joshi', 'Dharavi Artisan Network', 'Co-ordinator', 'pilot-customer',
   ARRAY['handicrafts','msme','b2b'],
   'Represents 200+ artisan units. Actively seeking digital marketplace solutions for B2B exports.',
   'Field Research', NULL, false, true),

  ('Pune', 'TiE Pune Chapter', NULL, 'Entrepreneurship network', 'institution',
   ARRAY['general','series-a','fundraising'],
   'Chapter of The Indus Entrepreneurs. Monthly pitches, mentorship and angel investor access.',
   'TiE Website', 'https://tie.org', true, true),

  ('Hyderabad', 'Sai Krishna', 'T-Hub', 'Startup Relations', 'institution',
   ARRAY['deep-tech','hardware','b2b'],
   'India''s largest startup incubator. Connects startups with corporates and government contracts.',
   'T-Hub Website', 'https://t-hub.co', true, true),

  ('Delhi', 'Meera Sharma', 'Capital Distribution Co.', 'Operations Head', 'distributor',
   ARRAY['fmcg','electronics','b2b'],
   'Pan-Delhi distributor with warehouse in Okhla. Handles brands in FMCG, electronics accessories.',
   'Trade Directory', NULL, false, true),

  ('Chennai', 'Raja Krishnan', 'South India Retail Consortium', 'Secretary', 'institution',
   ARRAY['retail','fmcg'],
   'Industry body for organised retail in Tamil Nadu. Facilitates brand-to-retailer connects.',
   'Industry Body Website', NULL, false, true);
