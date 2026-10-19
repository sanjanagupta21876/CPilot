# City Launchpad — Security Plan

_Phase 1 document. Security must be implemented and tested in each subsequent phase — not merely planned here._

---

## 1. Authentication (Supabase Auth + @supabase/ssr)

### Session model

- Supabase Auth issues **JWTs stored in HTTP-only cookies** via `@supabase/ssr`.
- The `updateSession()` middleware helper refreshes the session on every request before the route handler runs.
- `auth.getUser()` (not `auth.getSession()`) is called on the server to validate the token with Supabase on every protected request — this prevents stale or tampered JWTs from being accepted.

### Protected routes

Middleware (`src/middleware.ts`) redirects unauthenticated users to `/login` for all prefixes:

```
/dashboard, /city-intelligence, /local-connect,
/market-validation, /market-proof, /settings, /onboarding
```

Authenticated users visiting `/login` or `/register` are redirected to `/dashboard`.

### Dashboard layout gate

`src/app/(dashboard)/layout.tsx` performs a **server-side double-check**:

1. Calls `supabase.auth.getUser()` — redirects to `/login` if no session.
2. Queries `startup_profiles` — redirects to `/onboarding` if no profile exists.

This prevents any dashboard route from rendering for an unauthenticated or un-onboarded user even if middleware is misconfigured.

---

## 2. PostgreSQL Row Level Security (RLS)

**All tables have RLS enabled.** No table is accessible without a matching policy.

### Ownership pattern (user-scoped tables)

Applied to: `startup_profiles`, `city_comparisons`, `introduction_requests`, `experiments`, `assumptions`

```sql
-- SELECT, UPDATE, DELETE
USING (auth.uid() = user_id)

-- INSERT
WITH CHECK (auth.uid() = user_id)
```

### Inheritance pattern (child tables)

Applied to: `market_indicators`, `fit_scores`, `experiment_responses`, `assumption_evidence`

Child rows are accessible only if the authenticated user owns the parent row:

```sql
-- Example: market_indicators
USING (
  EXISTS (
    SELECT 1 FROM city_comparisons c
    WHERE c.id = comparison_id AND c.user_id = auth.uid()
  )
)
```

### Shared read-only catalog

`contacts` is publicly readable by all authenticated users (`USING (true)`).  
INSERT / UPDATE / DELETE on `contacts` requires the **service role key** — no user-facing route should mutate contacts.

### Important: RLS is planned and the SQL is written — but policies must be tested

> **This plan does not certify that security is complete.**  
> Policies must be deployed to a live Supabase project and tested with:
> - A user attempting to read another user's data directly via the API.
> - A user attempting to insert rows with a forged `user_id`.
> - Unauthenticated API calls to every table.

---

## 3. Ownership Checks at the Application Layer

Even with RLS, application code must enforce business rules that SQL policies cannot:

| Operation | Rule |
|---|---|
| Introduction request status update | Only the requesting founder may withdraw; platform admin transitions to accepted/declined |
| Experiment status transitions | `planned → active → complete` only; no backward transitions except `→ cancelled` |
| Assumption status | Derived from evidence links; never manually set to `supported` or `challenged` without evidence |
| Fit Score insertion | `comparison_id` must belong to the requesting user (verified by RLS, confirmed in server action) |

---

## 4. Public vs. Private Fields in Contacts

The `contacts` table contains **only public professional information**:

✅ Allowed: organization name, role title, city, industry tags, public description, public source URL  
❌ Never stored: personal email addresses, phone numbers, home addresses, private messages

Contact email addresses or phone numbers should be exchanged only through the `introduction_requests` workflow — and only after the contact has accepted the request. This logic is deferred to Phase 5.

---

## 5. Server-Only Secrets & Environment Variables

| Variable | Where used | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Public — safe in browser bundle |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Public — safe in browser bundle (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (Route Handlers) | **Never expose to client.** Only use for admin operations (contact import). |
| `GEMINI_API_KEY` | Server only | **Never expose to client.** Not active until Phase 8. |

### Rules

1. Variables prefixed `NEXT_PUBLIC_` are bundled into the client. Never put secrets there.
2. Server-only variables must be accessed inside Server Components, Route Handlers, or Server Actions only.
3. The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — use it only in tightly scoped admin operations with explicit input validation.
4. `.env.local` is git-ignored. `.env.example` contains placeholders only.
5. Never log environment variables or Supabase responses that contain auth tokens.

---

## 6. Input Validation with Zod

All user input is validated with Zod schemas in `src/lib/validations/schemas.ts` **before** reaching the database.

### Validation is applied:

- **Client side** — for immediate form feedback (UX).
- **Server side** — as the authoritative gate in Server Actions / Route Handlers. Client-side validation is never trusted.

### Schemas cover

| Schema | Tables / operations |
|---|---|
| `startupProfileSchema` | `startup_profiles` insert/update |
| `cityComparisonSchema` | `city_comparisons` insert |
| `marketIndicatorSchema` | `market_indicators` insert |
| `introductionRequestSchema` | `introduction_requests` insert |
| `experimentSchema` | `experiments` insert/update |
| `experimentResponseSchema` | `experiment_responses` insert |
| `assumptionSchema` | `assumptions` insert |

### Rules

- Always call `schema.safeParse()` on the server. Never use `schema.parse()` in a request handler (it throws, risking unhandled error leaks).
- Strip unknown fields (`z.object(...).strict()`) for sensitive mutation endpoints.
- UUID parameters in dynamic routes (`[id]`) must be validated before passing to the database.

---

## 7. Safe Error Handling & Logging

### Rules

- **Never expose raw database errors to the client.** Return generic messages (e.g., "Something went wrong") and log the full error server-side.
- Use `try/catch` or `safeParse` in all server actions and route handlers.
- Log errors with sufficient context (route, user ID, operation) but **never log PII, tokens, or full request bodies**.
- Supabase client errors include a `message` and `code`. Log these server-side; return a sanitized error to the client.
- During development, Next.js error overlays are acceptable. In production (`NODE_ENV=production`), stack traces must not reach the browser.

### Planned error structure for Route Handlers

```typescript
// ✅ Safe pattern
return NextResponse.json(
  { error: 'Failed to create comparison.' },
  { status: 400 }
)

// ❌ Never do this
return NextResponse.json({ error: supabaseError.message }, { status: 500 })
```

---

## 8. Authorization Checks for Status Updates

Status transitions require explicit server-side authorization checks in addition to RLS:

```
introduction_requests.status:
  pending → withdrawn   (requesting user only)
  pending → accepted    (platform admin / future Phase 5)
  pending → declined    (platform admin / future Phase 5)

experiments.status:
  planned → active      (owner only)
  active  → complete    (owner only)
  *       → cancelled   (owner only)
  complete → *          (blocked — experiments are immutable once complete)
```

These checks are enforced in Server Actions before the Supabase client call.

---

## 9. Data Provenance & Verification Status Rules

- Every `market_indicator` row must include `source_name`. `source_url` and `collected_at` are strongly recommended.
- `confidence` ('high'/'medium'/'low'/'unverified') must be set honestly — it must not be upgraded without a new source.
- AI-synthesized content (future Phase 8) must be stored with `source_type = 'llm-synthesis'` and displayed with a clear disclosure label.
- Demo data (`is_demo = true`) must always be visually flagged in the UI — it must never be presented as real market validation.
- Fit Scores are computed deterministically by `lib/scoring/fitScore.ts`. The numeric result is never modified by AI.

---

## 10. Known Gaps & Future Work

| Gap | Target phase |
|---|---|
| RLS policies not yet tested against a live Supabase project | Phase 2 |
| No CSRF protection beyond Next.js defaults | Phase 3 |
| No rate limiting on auth endpoints | Phase 3 |
| Contact write operations (admin import) not yet built | Phase 5 |
| AI content audit trail (`ai_synthesis_log` table) not yet created | Phase 8 |
| Production error monitoring (Sentry or equivalent) not yet configured | Phase 9 |
