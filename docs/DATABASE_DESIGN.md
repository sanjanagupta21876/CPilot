# City Launchpad — Database Design

_Mirrors `supabase/migrations/0001_initial_schema.sql` and `src/types/database.ts`.  
Update this document whenever the schema changes._

---

## Design Principles

1. **Provenance on every data point** — market indicators carry `source_name`, `source_url`, `collected_at`, and `confidence`.
2. **Immutable evidence** — experiment responses and market indicators are inserted, never silently overwritten. Use soft-delete or status flags where appropriate.
3. **Ownership at row level** — every user-owned table has `user_id uuid REFERENCES auth.users(id)` and a matching RLS policy.
4. **Demo data isolation** — contacts seeded for demonstration carry `is_demo = true`; the UI must warn users clearly.
5. **Normalization** — relational model (3NF) with foreign keys; `jsonb` only where flexible structured data is required (Fit Score criteria array).

---

## Entity-Relationship Overview

```
auth.users (Supabase managed)
    │
    ├──< startup_profiles        (1 per user)
    │
    ├──< city_comparisons        (many per user)
    │       │
    │       ├──< market_indicators
    │       ├──< fit_scores       (1 per city per comparison)
    │       └──< experiments (optional link)
    │
    ├──< introduction_requests   (many per user → contacts)
    │
    ├──< experiments             (many per user)
    │       └──< experiment_responses
    │
    └──< assumptions             (many per user)
            └──< assumption_evidence  →  experiments | market_indicators

contacts  (shared catalog, no user_id — read-only to users via RLS)
```

---

## Tables

### `startup_profiles`

**Purpose:** Stores the founder's startup profile. Created during onboarding; exactly one per user.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `auth.users(id)` ON DELETE CASCADE, UNIQUE | One profile per user |
| `name` | `text` | NOT NULL, `char_length >= 2` | Startup name |
| `industry` | `text` | NOT NULL | e.g. "FMCG", "SaaS" |
| `stage` | `text` | NOT NULL, CHECK IN ('idea','pre-seed','seed','series-a') | Funding stage |
| `target_customer` | `text` | NOT NULL | Human-readable description |
| `product_desc` | `text` | NOT NULL | Product description |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Auto-updated by trigger |

**Indexes:** implicit UNIQUE on `user_id`.  
**RLS:** User-scoped CRUD (`auth.uid() = user_id`).

---

### `city_comparisons`

**Purpose:** A named comparison session grouping 2–5 Indian cities for market analysis.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `auth.users`, NOT NULL | Owner |
| `title` | `text` | NOT NULL, `char_length >= 3` | Descriptive label |
| `cities` | `text[]` | NOT NULL, `array_length >= 2` | City names |
| `status` | `text` | CHECK IN ('draft','analyzing','complete','error'), DEFAULT 'draft' | |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Auto-updated by trigger |

**Indexes:** `idx_city_comparisons_user (user_id)`.  
**RLS:** User-scoped CRUD.

---

### `market_indicators`

**Purpose:** Individual market data points attached to a comparison (e.g., "Bengaluru — Smartphone penetration: 72%").  
Each indicator **must** have a source; this table is the primary provenance store.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `comparison_id` | `uuid` | FK → `city_comparisons(id)` ON DELETE CASCADE, NOT NULL | |
| `city` | `text` | NOT NULL | Must match one of `comparison.cities` |
| `indicator` | `text` | NOT NULL | e.g. "Monthly Active Internet Users" |
| `value` | `text` | NOT NULL | Stored as text to allow "45 million" or "~72%" |
| `unit` | `text` | NULLABLE | e.g. "million", "%" |
| `source_name` | `text` | NOT NULL | e.g. "TRAI Annual Report 2024" |
| `source_url` | `text` | NULLABLE | Direct URL to source |
| `collected_at` | `date` | NULLABLE | Date data was collected / published |
| `confidence` | `text` | CHECK IN ('high','medium','low','unverified'), DEFAULT 'medium' | |
| `notes` | `text` | NULLABLE | Analyst commentary, assumptions |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Immutable; do not update |

**Indexes:** `idx_market_indicators_comparison (comparison_id, city)`.  
**RLS:** Inherit from parent comparison ownership.  
**Provenance rule:** Never update `source_name`, `source_url`, or `collected_at` after insert — create a new record instead.

---

### `fit_scores`

**Purpose:** A computed Fit Score for one city within a comparison. Stores the full criteria breakdown in JSONB for audit purposes.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `comparison_id` | `uuid` | FK → `city_comparisons(id)` ON DELETE CASCADE, NOT NULL | |
| `city` | `text` | NOT NULL | |
| `criteria` | `jsonb` | NOT NULL | Array of `{ name, weight, score, rationale }` |
| `total_score` | `numeric(5,2)` | NOT NULL | Computed by `lib/scoring/fitScore.ts`, range 0–100 |
| `max_score` | `numeric(5,2)` | NOT NULL, DEFAULT 100 | |
| `computed_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

**Constraints:** UNIQUE `(comparison_id, city)` — one score per city per comparison (re-compute replaces).  
**RLS:** Inherit from parent comparison ownership.  
**Important:** `total_score` is **never AI-generated**. It is the output of the deterministic engine in `lib/scoring/fitScore.ts`.

---

### `contacts`

**Purpose:** Shared catalog of local businesses, mentors, distributors, and institutions. Readable by all authenticated users; writable only via service role (admin import/curation). No private contact information is stored.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `city` | `text` | NOT NULL | Indian city name |
| `name` | `text` | NOT NULL | Person or organization name |
| `organization` | `text` | NULLABLE | Organization name if `name` is a person |
| `role` | `text` | NULLABLE | Job title or role |
| `category` | `text` | CHECK IN ('retailer','distributor','mentor','institution','supplier','pilot-customer') | |
| `industry_tags` | `text[]` | NOT NULL, DEFAULT '{}' | GIN-indexed for filtering |
| `description` | `text` | NULLABLE | Public-facing bio / description |
| `source_name` | `text` | NOT NULL | Where this listing came from |
| `source_url` | `text` | NULLABLE | Original listing URL |
| `verified` | `boolean` | NOT NULL, DEFAULT false | Whether the listing has been manually verified |
| `verified_at` | `timestamptz` | NULLABLE | When verified |
| `is_demo` | `boolean` | NOT NULL, DEFAULT false | Seed/demonstration data flag |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

**Indexes:** `idx_contacts_city_category (city, category)`, `idx_contacts_industry_tags USING GIN(industry_tags)`.  
**RLS:** Public SELECT for all authenticated users (`USING (true)`). INSERT/UPDATE/DELETE require service role.  
**Privacy rule:** Email addresses, phone numbers, and private contact details must **not** be stored in this table.

---

### `introduction_requests`

**Purpose:** A founder's formal request to be introduced to a contact. Tracks status through a lifecycle.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `auth.users`, NOT NULL | Requesting founder |
| `contact_id` | `uuid` | FK → `contacts(id)`, NOT NULL | Target contact |
| `message` | `text` | NOT NULL | Founder's introduction message |
| `status` | `text` | CHECK IN ('pending','accepted','declined','withdrawn'), DEFAULT 'pending' | |
| `match_reason` | `text` | NOT NULL | Why this contact is relevant (shown to contact) |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Auto-updated by trigger |

**Indexes:** `idx_intro_requests_user (user_id)`.  
**RLS:** User-scoped CRUD. Status transitions must be validated at the application layer (a founder cannot self-promote 'pending' → 'accepted').

---

### `experiments`

**Purpose:** A structured market validation experiment with a declared hypothesis and measurable success threshold.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `auth.users`, NOT NULL | |
| `comparison_id` | `uuid` | FK → `city_comparisons(id)`, NULLABLE | Optional link to a City Intelligence comparison |
| `title` | `text` | NOT NULL | Short name |
| `hypothesis` | `text` | NOT NULL | Testable statement |
| `method` | `text` | CHECK IN ('interview','survey','retailer-outreach','landing-page','pilot') | |
| `city` | `text` | NOT NULL | City where experiment runs |
| `target_metric` | `text` | NOT NULL | What is being measured |
| `success_threshold` | `text` | NOT NULL | Measurable success condition |
| `status` | `text` | CHECK IN ('planned','active','complete','cancelled'), DEFAULT 'planned' | |
| `started_at` | `timestamptz` | NULLABLE | |
| `completed_at` | `timestamptz` | NULLABLE | |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Auto-updated by trigger |

**Indexes:** `idx_experiments_user_status (user_id, status)`.  
**RLS:** User-scoped CRUD.

---

### `experiment_responses`

**Purpose:** Individual observations recorded during an experiment. Immutable after insert.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `experiment_id` | `uuid` | FK → `experiments(id)` ON DELETE CASCADE, NOT NULL | |
| `respondent_label` | `text` | NOT NULL | Anonymised label (e.g. "Retailer A") |
| `response_type` | `text` | CHECK IN ('interview','survey-submission','observation','purchase','signup') | |
| `outcome` | `text` | CHECK IN ('positive','negative','neutral','inconclusive') | |
| `notes` | `text` | NULLABLE | |
| `evidence_url` | `text` | NULLABLE | Link to supporting evidence |
| `recorded_at` | `timestamptz` | NOT NULL, DEFAULT now() | Immutable |

**Indexes:** `idx_experiment_responses_exp (experiment_id)`.  
**RLS:** Inherit from parent experiment ownership.  
**Rule:** Responses are never deleted or updated after recording — they are permanent evidence.

---

### `assumptions`

**Purpose:** A market assumption to be tested via the Market Proof Loop. Can be created manually, derived from city intelligence, or (in future) suggested by AI.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `auth.users`, NOT NULL | |
| `comparison_id` | `uuid` | FK → `city_comparisons(id)`, NULLABLE | Optional origin comparison |
| `statement` | `text` | NOT NULL | The assumption being tested |
| `source_type` | `text` | CHECK IN ('city-intelligence','manual','llm-synthesis'), DEFAULT 'manual' | |
| `status` | `text` | CHECK IN ('untested','supported','challenged','invalidated'), DEFAULT 'untested' | Derived from evidence |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Auto-updated by trigger |

**Indexes:** `idx_assumptions_user_status (user_id, status)`.  
**RLS:** User-scoped CRUD.

---

### `assumption_evidence`

**Purpose:** Links an assumption to a piece of evidence (experiment or market indicator) with a declared direction.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `assumption_id` | `uuid` | FK → `assumptions(id)` ON DELETE CASCADE, NOT NULL | |
| `experiment_id` | `uuid` | FK → `experiments(id)`, NULLABLE | One of these must be set |
| `indicator_id` | `uuid` | FK → `market_indicators(id)`, NULLABLE | |
| `direction` | `text` | CHECK IN ('supports','challenges','neutral'), NOT NULL | |
| `notes` | `text` | NULLABLE | Analyst commentary |
| `linked_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

**Constraint (application-layer):** At least one of `experiment_id` or `indicator_id` must be non-null.  
**Indexes:** `idx_assumption_evidence_assumption (assumption_id)`.  
**RLS:** Inherit from parent assumption ownership.

---

## Triggers

The `update_updated_at()` function automatically sets `updated_at = now()` on:

- `startup_profiles`
- `city_comparisons`
- `introduction_requests`
- `experiments`
- `assumptions`

---

## Staged Migration Plan

| Phase | Migration | What it adds |
|---|---|---|
| 1 | `0001_initial_schema.sql` | All tables, indexes, triggers, RLS policies (complete base schema) |
| 3 | `0002_auth_callbacks.sql` _(future)_ | Supabase auth redirect URLs, email templates config |
| 8 | `0003_ai_metadata.sql` _(future)_ | `ai_synthesis_log` table for auditing LLM-generated content |

> **Rule:** Never alter existing columns in a migration. Add new columns with defaults or create new tables.

---

## Tables Not Yet Modelled (Planned for Later Phases)

These are noted in the Phase 1 document as requirements but are deferred to avoid over-engineering:

| Planned table | Likely phase | Notes |
|---|---|---|
| `data_sources` (normalized) | Phase 4 | Currently `source_name`/`source_url` are inline on `market_indicators` |
| `cities` (reference table) | Phase 4 | Currently city is a free-text field; a reference table adds validation |
| `ai_synthesis_log` | Phase 8 | Audit trail for AI-assisted content |
| `profiles` (public) | Phase 3 | Supabase `auth.users` metadata; `startup_profiles` serves this purpose for now |
