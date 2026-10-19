# City Launchpad — Deployment & Operations Manual

This guide provides a step-by-step, repeatable deployment and operational manual for **City Launchpad**, built on **Next.js 16 (App Router)** and **Supabase (PostgreSQL, Auth, RLS)**.

---

## 1. System Requirements & Stack Baseline

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **Package Manager**: `npm` v10+ (or compatible `pnpm` / `yarn`)
- **Framework**: Next.js 16.4.2 (Turbopack, App Router, React 19)
- **Database**: PostgreSQL 15+ hosted on Supabase
- **Authentication**: Supabase Auth (Cookie-based SSR via `@supabase/ssr`)
- **AI Engine (Optional)**: Google Generative AI (`gemini-1.5-flash`)

---

## 2. Environment Variables

Create `.env.local` for local development. For production (Vercel), configure these in **Project Settings → Environment Variables**.

| Variable | Environment | Scope | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Local / Preview / Prod | Client & Server | Supabase project endpoint (e.g., `https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Local / Preview / Prod | Client & Server | Supabase public/anonymous API key (scoped by RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional Admin | **Server-Only** | Bypasses RLS. Used exclusively in server-side administrative seeds or migrations. Never expose with `NEXT_PUBLIC_`. |
| `GEMINI_API_KEY` | Optional AI | **Server-Only** | Google Gemini API key for grounded assistance. If omitted, app gracefully falls back to unassisted manual mode. |

> [!WARNING]
> Never prefix `GEMINI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_`. Doing so exposes credentials in client browser bundles.

---

## 3. Local Development Setup

### 3.1 Install Dependencies
```bash
npm install
```

### 3.2 Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### 3.3 Run Quality Checks
Verify the local installation before making changes:
```bash
# 1. Type check
npm run type-check

# 2. Linting
npm run lint

# 3. Unit and integration tests
npm test

# 4. Production build
npm run build
```

### 3.4 Launch Development Server
```bash
npm run dev
# Server accessible at http://localhost:3000
```

---

## 4. Supabase Database Configuration & Migrations

All database schemas, constraints, and Row Level Security (RLS) policies are version-controlled in `supabase/migrations/`.

### 4.1 Migration Order
Apply migrations in numerical sequence:
1. `supabase/migrations/0001_initial_schema.sql`: Base tables (`startup_profiles`, `city_comparisons`, `market_indicators`, `fit_scores`, `contacts`, `introduction_requests`, `experiments`, `experiment_responses`, `assumptions`), triggers, indexes, and RLS.
2. `supabase/migrations/0002_startup_onboarding.sql`: Cities catalog, onboarding attributes (`expansion_cities`, `primary_channel`, price bounds).
3. `supabase/migrations/0003_city_intelligence_competitors.sql`: Competitors catalog, provenance attributes, and scoring versioning.
4. `supabase/migrations/0004_local_connect.sql`: Verification status hierarchy (`unverified`, `source_checked`, `directly_confirmed`), introduction request lifecycle, and seeded partner resources.
5. `supabase/migrations/0005_market_validation.sql`: `hypotheses` table, pre-registered threshold columns, and `threshold_history` immutable audit trail.
6. `supabase/migrations/0006_market_proof_loop.sql`: `hypothesis_intro_links` association table and `proof_events` timeline log.

### 4.2 Applying Migrations via Supabase CLI
```bash
# Link project
npx supabase link --project-ref your-project-id

# Push migrations
npx supabase db push
```

### 4.3 Applying Migrations via Supabase Dashboard
1. Open Supabase Dashboard → **SQL Editor**.
2. Run each migration file in sequential order (`0001` through `0006`).
3. Verify all tables in **Table Editor** have **RLS Enabled** (padlock icon).

---

## 5. Supabase Authentication Setup

Configure authentication in the Supabase Dashboard:
1. Go to **Authentication → URL Configuration**.
2. **Site URL**:
   - Local: `http://localhost:3000`
   - Production: `https://your-domain.vercel.app`
3. **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.vercel.app/auth/callback`
   - `https://*-your-team.vercel.app/auth/callback` (for Vercel preview branches)
4. **Email Auth**:
   - Go to **Authentication → Providers → Email**.
   - Enable Email provider.
   - For hackathons/prototyping, you can disable "Confirm email" to enable immediate sign-ins. For production, enforce email confirmation.

---

## 6. Vercel Production Deployment

### 6.1 Connect Repository
1. Import repository into [Vercel](https://vercel.com).
2. Framework Preset: **Next.js**.
3. Root Directory: `./` (or directory where `package.json` resides).

### 6.2 Configure Build Command
- Build Command: `next build`
- Output Directory: Next.js default (`.next`)
- Install Command: `npm install`

### 6.3 Configure Environment Variables
In Vercel **Project Settings → Environment Variables**, add:
- `NEXT_PUBLIC_SUPABASE_URL` (Production & Preview)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production & Preview)
- `GEMINI_API_KEY` (Production & Preview, Server-only)

### 6.4 Trigger Deployment
Push to `main` branch or trigger manual deployment in Vercel dashboard.

---

## 7. Post-Deployment Smoke Test Checklist

Once deployed, verify the deployment URL with the following smoke tests:

1. **Public Landing & Routing**:
   - Visit `/` and verify hero section and product description render without console errors.
   - Visit `/login` and verify form loads with clean styling.
2. **Authentication Journey**:
   - Register a new test user account (`test-founder@example.com`).
   - Confirm redirect to `/onboarding`.
   - Complete startup profile onboarding.
   - Verify redirect to `/dashboard`.
3. **City Intelligence**:
   - Open `/city-intelligence/new`.
   - Select 2 cities (e.g., Pune and Bengaluru).
   - Generate assessment.
   - Confirm Fit Score gauges render with deterministic scores, weights, and evidence coverage.
4. **Local Connect**:
   - Open `/local-connect`.
   - Filter by city and category.
   - Open a contact detail card.
   - Submit a structured introduction request.
   - Confirm request appears in "Active Requests" tab with `pending` status.
5. **Local Market Validation**:
   - Open `/market-validation/new`.
   - Create an experiment with a pre-registered success threshold (`>= 50% Willingness to Pay`).
   - Log at least one positive observation with a commercial signal tier (`paid_order` or `qualified_lead`).
   - Verify real-time metrics update deterministically.
6. **Market Proof Loop**:
   - Open `/market-proof`.
   - Confirm the created hypothesis displays its evaluated status (`testing` or `supported`).
   - Verify evidence trace links to the recorded experiment.
7. **AI Availability Check**:
   - On `/market-proof`, inspect the `AIEvidenceSummaryCard`.
   - If `GEMINI_API_KEY` is present: generate summary and verify source citations match genuine record IDs.
   - If `GEMINI_API_KEY` is absent: verify clear, non-blocking notice indicating AI is not configured.
8. **Sign Out**:
   - Click Sign Out in top navigation.
   - Confirm session cookies are cleared and redirect to `/login` occurs.
   - Try navigating back to `/dashboard`; confirm redirect back to `/login`.

---

## 8. Rollback & Incident Response

### 8.1 Application Rollback (Vercel)
1. Open Vercel Project Dashboard → **Deployments**.
2. Find the previous stable deployment.
3. Click **Instant Rollback**. Traffic is immediately routed to the prior build with zero downtime.

### 8.2 Database Migration Recovery
- All migrations in `supabase/migrations/` are written using additive, non-destructive statements (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `DO $$ BEGIN ... END $$`).
- If an errant migration is deployed, revert the migration script in a new forward-moving migration file (e.g., `0007_revert_...sql`) rather than mutating existing history.
- Always create a Supabase Database Backup before applying manual schema updates in production.

---

## 9. Known Limitations & Service Boundaries

1. **Market Intelligence Coverage**: Seeded benchmark data currently covers 6 major Tier-1 and emerging hubs (Bengaluru, Mumbai, Delhi-NCR, Hyderabad, Pune, Chennai). Expansion into Tier-2/3 cities relies on user-submitted indicators.
2. **Email Delivery**: Automated email dispatch for introduction requests requires external SMTP / transactional provider integration (e.g., Resend / SendGrid). In this release, requests are stored and audited in the database with status transitions.
3. **AI Provider Quotas**: Google Gemini Free Tier is subject to 15 RPM. The application enforces an internal sliding-window rate limit (10 req/min) to prevent quota exhaustion.
