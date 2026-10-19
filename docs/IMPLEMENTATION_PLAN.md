# City Launchpad — Implementation Plan

_Phase 1 deliverable. Do not implement these phases without explicit approval._

---

## Status

| Phase | Name | Status |
|---|---|---|
| 1 | Architecture & Repository Setup | ✅ Complete |
| 2 | UI Foundation & Dashboard Shell | ⬜ Not started |
| 3 | Database & Authentication | ⬜ Not started |
| 4 | Startup Onboarding | ⬜ Not started |
| 5 | City Intelligence & Fit Score | ⬜ Not started |
| 6 | Local Connect | ⬜ Not started |
| 7 | Local Market Validation | ⬜ Not started |
| 8 | Market Proof Loop | ⬜ Not started |
| 9 | AI Integration & Data Quality | ⬜ Not started |
| 10 | Testing, Polish & Deployment | ⬜ Not started |

---

## Phase 2 — UI Foundation & Dashboard Shell

**Goal:** Build the visual design system and a working navigation skeleton so all subsequent phases have a consistent shell to fill.

**Deliverables:**
- Finalize `globals.css` design tokens (colour palette, spacing, typography scale).
- Implement `Sidebar`, `Topbar`, and `PageShell` layout components with correct active states.
- Build the Dashboard page with placeholder summary cards for each module.
- Implement dark theme consistently across all pages.
- Verify fonts, responsive breakpoints, and basic accessibility (focus rings, semantic HTML).

**Rules:**
- No real data — use static props or mock data in RSC.
- No database calls yet.
- All navigation items must be present and route-correct even if target pages are stubs.

---

## Phase 3 — Database & Authentication

**Goal:** Connect the live Supabase project, validate the schema, and confirm end-to-end authentication flows work.

**Deliverables:**
- Run `0001_initial_schema.sql` against the Supabase project.
- Run `seed.sql` to populate demo contacts.
- Configure `.env.local` with real project credentials.
- Implement and test the login page (email/password sign-in).
- Implement and test the register page (account creation).
- Confirm middleware session refresh works.
- Confirm dashboard layout redirects unauthenticated users.
- Test RLS policies manually: confirm one user cannot read another user's data.
- Add a `type-check` npm script (`tsc --noEmit`) and confirm zero type errors.

**Rules:**
- Never commit `.env.local` or real credentials.
- Document all Supabase project settings (Auth providers, email templates) in `docs/`.

---

## Phase 4 — Startup Onboarding

**Goal:** Allow a newly registered founder to create their startup profile before accessing the dashboard.

**Deliverables:**
- Implement the `/onboarding` multi-step form using `startupProfileSchema` (Zod).
- Server Action that inserts into `startup_profiles` with full validation.
- Redirect to `/dashboard` after successful profile creation.
- Confirm the dashboard layout gate (`startup_profiles` check) works end-to-end.
- Settings page that allows editing the startup profile.

**Rules:**
- The `user_id` is always taken from the server-side session — never from the form body.
- Show meaningful Zod validation errors inline.

---

## Phase 5 — City Intelligence & Fit Score

**Goal:** Let founders create city comparisons, input sourced market indicators, and compute a transparent Fit Score.

**Deliverables:**
- `/city-intelligence` — list all comparisons for the user.
- `/city-intelligence/new` — create a comparison (2–5 cities).
- `/city-intelligence/[id]` — view indicators, add new indicators, compute Fit Score.
- Server Action: insert `market_indicators` (validate with `marketIndicatorSchema`).
- Server Action: compute and insert `fit_scores` using `lib/scoring/fitScore.ts`.
- Recharts bar/radar chart for Fit Score comparison across cities.
- Source provenance display for every indicator (source name, URL, collected date, confidence badge).
- Evidence-gap warning when indicators are missing for a city.

**Rules:**
- The numeric Fit Score is produced only by `computeFitScore()` — never by AI.
- Never auto-populate `source_url` with invented URLs.
- Missing data must be explicitly labelled as "Not available" — never default to zero.

---

## Phase 6 — Local Connect

**Goal:** Let founders browse and filter local contacts and submit introduction requests.

**Deliverables:**
- `/local-connect` — filterable contact directory (city, category, industry tags).
- `/local-connect/[id]` — contact detail with match explanation.
- Introduction request form using `introductionRequestSchema`.
- Introduction request status tracker on the dashboard.
- Demo data banner on contacts with `is_demo = true`.

**Rules:**
- No private contact information (email, phone) stored or displayed.
- Status transitions (pending → withdrawn) enforced server-side.
- The match reason shown to a contact must be set by the founder, not invented by the system.

---

## Phase 7 — Local Market Validation

**Goal:** Let founders define experiments, record responses, and measure outcomes against declared thresholds.

**Deliverables:**
- `/market-validation` — list experiments with status badges.
- `/market-validation/new` — create experiment with hypothesis + success threshold.
- `/market-validation/[id]` — view and record responses; outcome summary vs. threshold.
- Server Actions for experiment status transitions (planned → active → complete).
- Recharts outcome chart (positive / negative / neutral / inconclusive breakdown).
- Distinction between reported interest, signups, and purchases clearly labelled.

**Rules:**
- Never declare a market validated without computing against the declared threshold.
- Responses are immutable after recording — no edit or delete.
- `sample_size` awareness: warn when response count is very low.

---

## Phase 8 — Market Proof Loop

**Goal:** Connect all three modules — link assumptions to experiments and indicators; show which assumptions are supported, challenged, or untested.

**Deliverables:**
- `/market-proof` — proof dashboard grouping assumptions by status.
- `/market-proof/new` — create or import an assumption.
- Assumption → evidence linking UI (select experiment or indicator, declare direction).
- Assumption status auto-derives from evidence direction counts.
- Full traceable evidence trail: click an assumption to see all linked evidence with sources.

**Rules:**
- `status` is always derived from evidence — never manually set to 'supported'.
- LLM-synthesized assumptions (if added) must be flagged `source_type = 'llm-synthesis'`.

---

## Phase 9 — AI Integration & Data Quality

**Goal:** Add optional AI-assisted research synthesis using `@google/generative-ai`, with strict audit trails.

**Deliverables:**
- Server-side Gemini API route for generating indicator research summaries.
- All AI-generated content labelled with `[AI-assisted]` disclosure.
- `ai_synthesis_log` table (migration `0003`) recording prompt hash, model version, and output.
- AI text output is advisory only — never populates numeric scores or validation outcomes.
- Data quality dashboard: evidence coverage per city, missing indicator warnings.

**Rules:**
- `GEMINI_API_KEY` is server-only.
- AI calls are never made on the client side.
- AI cannot change `confidence`, `total_score`, or `outcome` fields.

---

## Phase 10 — Testing, Polish & Deployment

**Goal:** Ship a production-ready application to Vercel with a stable Supabase project.

**Deliverables:**
- TypeScript strict mode passes (`tsc --noEmit` = zero errors).
- ESLint passes (`eslint` = zero errors).
- Manual end-to-end test checklist (auth flow, all module CRUD, Fit Score, Proof Loop).
- Performance review: RSC vs. Client Component split, Recharts lazy loading.
- SEO: `<title>` and `<meta description>` on every page.
- Accessibility: keyboard navigation, focus management, ARIA labels on interactive elements.
- Vercel project linked to repository; production environment variables configured.
- Supabase project in production region with backups enabled.
- `README.md` updated with setup and deployment instructions.

---

## Engineering Rules (All Phases)

- Preserve working functionality — never overwrite files without reading them first.
- TypeScript strict mode must pass before merging any phase.
- Zod validation on every user-input server action.
- RLS must be verified after any schema change.
- Demo data (`is_demo = true`) must always be visually disclosed.
- No AI features active before Phase 9.
- Never commit secrets or `.env.local`.
- Stop and request approval before starting the next phase.
