# City Launchpad — Architecture

_Phase 1 document. Update as the project evolves._

---

## 1. Product Boundaries

City Launchpad is a **single Next.js application** that serves authenticated Indian startup founders.
It has exactly three feature modules plus one cross-cutting connector:

| Module | Purpose |
|---|---|
| **A — City Intelligence & Fit Score** | Compare Indian cities using sourced market indicators; produce a transparent, weighted Fit Score. |
| **B — Local Connect** | Discover curated local businesses, distributors, mentors and institutions; manage introduction requests. |
| **C — Local Market Validation** | Define hypotheses and experiments; record observations; measure outcomes against declared thresholds. |
| **Market Proof Loop** | Link city assessments → local contacts → hypotheses → experiments → evidence; surface which assumptions are supported, challenged or untested. |

**Hard data-integrity rules that apply to every module:**

- Every market data point must carry `source_name`, optional `source_url`, `collected_at`, and a `confidence` level.
- Historical records (assessments, experiment results) are **never silently overwritten** — new records are inserted.
- Simulated or demo data is always flagged `is_demo = true`.
- AI may assist with text synthesis but **never produces numeric scores or validation outcomes**.

---

## 2. Core User Journey

```
Register / Log in (Supabase Auth)
    │
    ▼
Startup Onboarding (one-time: name, industry, stage, target customer, product)
    │
    ▼
Dashboard (summary cards for each module)
    │
    ├─► City Intelligence  →  create comparison → add/import indicators
    │                         → compute Fit Score (deterministic engine)
    │                         → view sourced report with evidence gaps
    │
    ├─► Local Connect      →  browse/filter contacts by city/category/industry
    │                         → submit introduction request → track status
    │
    ├─► Market Validation  →  create experiment with hypothesis + success threshold
    │                         → record responses/observations
    │                         → view outcome summary vs. threshold
    │
    └─► Market Proof Loop  →  create / import assumptions
                              → link experiments & indicators as evidence
                              → view proof dashboard (supported / challenged / untested)
```

---

## 3. Application Architecture

### Technology Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 16 App Router** | SSR + API routes in one project; no separate backend |
| Language | **TypeScript strict mode** | Type safety across DB types, Zod schemas, and components |
| Styling | **Tailwind CSS v4** + shadcn/ui | Utility-first; shadcn components are owned source files |
| Database | **Supabase PostgreSQL** | Managed Postgres with RLS, Auth, and real-time |
| Auth | **Supabase Auth** (`@supabase/ssr`) | JWT sessions via cookies; middleware session refresh |
| Validation | **Zod v4** | Server-side and client-side schema validation |
| Charts | **Recharts v3** | Fit Score radar/bar charts; experiment outcome charts |
| Maps | Leaflet + OpenStreetMap _(optional Phase 8)_ | City map overlays |
| AI | `@google/generative-ai` _(reserved, not activated)_ | Research synthesis in a later phase |
| Deployment | **Vercel** | Zero-config Next.js hosting |

### Request / Data Flow

```
Browser (React)
  │  (RSC fetch or client fetch)
  ▼
Next.js App Router
  ├─ Server Components / Route Handlers  ←──── Supabase Server Client
  │      (auth checks, DB queries, Zod validation)          │
  │                                                          ▼
  └─ Client Components (interactivity)           Supabase PostgreSQL
         │                                          (RLS enforced)
         └─ Supabase Browser Client (auth state)
```

- **Server Components** render authenticated data; no secrets leave the server.
- **Route Handlers** (`app/**/route.ts`) provide POST/PATCH endpoints when server actions aren't appropriate.
- **Middleware** (`src/middleware.ts`) refreshes sessions and enforces protected-route redirects.
- **Client Components** handle UI state, form interactions, and real-time subscriptions.

---

## 4. Folder Structure

```
city-launchpad/
├── docs/                        # Architecture, DB design, security, roadmap
├── public/                      # Static assets
├── supabase/
│   ├── migrations/              # Versioned SQL migrations (run in order)
│   └── seed.sql                 # Demo data (flagged is_demo=true)
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout (Inter font, dark theme, metadata)
│   │   ├── page.tsx             # Redirect → /dashboard
│   │   ├── globals.css          # Tailwind base + design tokens
│   │   ├── (auth)/
│   │   │   ├── layout.tsx       # Unauthenticated shell
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx       # Auth check + onboarding gate + Sidebar + Topbar
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── city-intelligence/
│   │   │   │   ├── page.tsx     # List comparisons
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── local-connect/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── market-validation/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── market-proof/
│   │   │   │   ├── page.tsx
│   │   │   │   └── new/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── onboarding/          # Startup profile creation (post-register gate)
│   ├── components/
│   │   ├── layout/              # Sidebar, Topbar, PageShell
│   │   ├── ui/                  # shadcn-owned primitives (Button, Card, Input …)
│   │   └── shared/              # Cross-module components (SourceBadge, ConfidencePill …)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts        # Browser Supabase client
│   │   │   ├── server.ts        # Server Supabase client (cookies)
│   │   │   └── middleware.ts    # updateSession helper
│   │   ├── scoring/
│   │   │   └── fitScore.ts      # Deterministic weighted Fit Score engine
│   │   ├── data/
│   │   │   └── cityData.ts      # Curated city reference data
│   │   └── validations/
│   │       └── schemas.ts       # Zod schemas for all user inputs
│   └── types/
│       └── database.ts          # TypeScript row types mirroring the DB schema
├── .env.example                 # Placeholder env vars (no secrets)
├── next.config.ts
├── tsconfig.json                # strict: true
└── package.json
```

---

## 5. Page & Route Map

| Route | Type | Auth | Purpose |
|---|---|---|---|
| `/` | Server | Any | Redirect → `/dashboard` |
| `/login` | Server+Client | Public | Email/password sign-in |
| `/register` | Server+Client | Public | Account creation |
| `/onboarding` | Server+Client | Auth | One-time startup profile setup |
| `/dashboard` | Server | Auth | Summary overview |
| `/city-intelligence` | Server | Auth | List city comparisons |
| `/city-intelligence/new` | Client | Auth | Create new comparison |
| `/city-intelligence/[id]` | Server | Auth | View comparison, indicators, Fit Score |
| `/local-connect` | Server | Auth | Browse & filter contacts |
| `/local-connect/[id]` | Server | Auth | Contact detail + introduction request |
| `/market-validation` | Server | Auth | List experiments |
| `/market-validation/new` | Client | Auth | Create experiment |
| `/market-validation/[id]` | Server | Auth | Experiment detail + responses |
| `/market-proof` | Server | Auth | Proof dashboard (assumptions × evidence) |
| `/market-proof/new` | Client | Auth | Create assumption |
| `/settings` | Server | Auth | Profile + preferences |

Future route handlers (Phase 3+): `app/api/**`

---

## 6. Reusable Component Strategy

### Layers

1. **`components/ui/`** — shadcn primitives. Owned source files; edit directly. Do not wrap unnecessarily.
2. **`components/layout/`** — Sidebar, Topbar, PageShell. Used by the dashboard layout only.
3. **`components/shared/`** — Cross-module display components:
   - `SourceBadge` — shows source name + URL + collection date
   - `ConfidencePill` — colour-coded `high | medium | low | unverified`
   - `DemoBanner` — prominent warning on demo/simulated records
   - `EmptyState` — consistent empty/loading placeholder
   - `FitScoreMeter` — reusable score bar used in City Intelligence

### Naming Convention

- PascalCase for components, camelCase for utilities.
- Co-locate feature-specific components inside the feature route folder (e.g., `city-intelligence/_components/`).
- Only components that are used in ≥ 2 feature areas live in `components/shared/`.

---

## 7. Server-Side vs. Client-Side Responsibilities

| Concern | Where |
|---|---|
| Auth session refresh | Middleware (Edge) |
| Protected-route redirect | Middleware + Server Layout |
| DB reads for page render | Server Component (RSC) |
| DB writes / mutations | Server Action or Route Handler |
| Form state, UI interactions | Client Component |
| Zod validation | Both (server is authoritative) |
| Fit Score computation | Server-side (`lib/scoring/fitScore.ts`) |
| Recharts rendering | Client Component |
| Supabase real-time subscriptions | Client Component |

**Rule:** No database credentials or service role keys ever reach the client bundle.

---

## 8. External Services & Integrations

| Service | SDK | Usage | When Active |
|---|---|---|---|
| Supabase Auth | `@supabase/ssr` | Session management, JWT | Phase 1+ |
| Supabase PostgreSQL | `@supabase/supabase-js` | All data storage | Phase 1+ |
| Google Fonts (Inter) | `next/font/google` | Typography | Phase 1+ |
| Recharts | `recharts` | Fit Score & experiment charts | Phase 4+ |
| Google Generative AI | `@google/generative-ai` | Research synthesis _(not active)_ | Phase 8 |
| Leaflet + OpenStreetMap | _(not yet installed)_ | City maps | Phase 8 (optional) |
| Vercel | CI/CD + hosting | Production deployment | Phase 9 |

---

## 9. Key Technical Decisions & Trade-offs

| Decision | Rationale | Trade-off |
|---|---|---|
| Single Next.js app (no separate API server) | Simplicity; App Router provides server actions and route handlers | Less horizontal scalability; acceptable for hackathon scale |
| Supabase over self-hosted Postgres | Managed auth + RLS + dashboard saves setup time | Vendor dependency; export path exists via `pg_dump` |
| Tailwind CSS v4 + shadcn/ui | Modern utility-first styling with owned component source | Tailwind v4 API differs from v3; turbopack loader required |
| RLS as primary authorization layer | Defense-in-depth: policies enforced at DB level regardless of app bugs | Policies must be tested; wrong policies silently deny or expose data |
| Zod v4 for all input validation | End-to-end type safety from form → API → DB | Zod v4 has breaking changes from v3 (check schema API) |
| Deterministic Fit Score engine (no AI) | Auditable, reproducible scores; builds founder trust | Requires curated indicator data; cold-start problem before data exists |
| Demo data flagged `is_demo=true` | Allows realistic demos without fabricating real market facts | Must enforce UI warnings everywhere demo data is shown |
