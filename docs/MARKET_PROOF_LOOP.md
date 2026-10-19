# Market Proof Loop — Phase 8

## Overview

The Market Proof Loop is the integration layer that connects City Launchpad's three core modules into a traceable evidence chain:

```
City Intelligence → Local Connect → Market Validation
      ↓                  ↓                ↓
  Assessment         Intro Requests    Experiments
  & Fit Score        & Contacts        & Results
      └──────────────────┴────────────────┘
                         ↓
               Market Proof View
              (Hypothesis Evidence Card)
```

**Purpose:** Help founders inspect which market assumptions are supported, challenged, or still untested — using only recorded, traceable evidence.

---

## Data Relationships

### Entity Connections

```
startup_profiles
  └── city_comparisons      (comparison_id on hypotheses)
        └── fit_scores       (comparison_id + city)
        └── market_indicators

  └── hypotheses             (startup_id, comparison_id)
        └── experiments      (hypothesis_id)
              └── experiment_responses
              └── threshold_history

  └── introduction_requests  (startup_id)
        └── contacts

hypothesis_intro_links       (hypothesis_id ↔ intro_request_id)
proof_events                 (immutable timeline)
```

### New Tables (Migration 0005)

#### `hypothesis_intro_links`
Many-to-many join table associating intro requests with hypotheses.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `hypothesis_id` | uuid | FK → hypotheses.id (cascade delete) |
| `intro_request_id` | uuid | FK → introduction_requests.id (cascade delete) |
| `user_id` | uuid | FK → auth.users.id (cascade delete) |
| `created_at` | timestamptz | Defaults to now() |

Unique constraint on `(hypothesis_id, intro_request_id)`.

#### `proof_events`
Append-only event log for the evidence timeline.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → auth.users.id (cascade delete) |
| `hypothesis_id` | uuid | FK → hypotheses.id, nullable |
| `startup_id` | uuid | FK → startup_profiles.id, nullable |
| `city` | text | nullable |
| `event_type` | text | Constrained to known event types |
| `event_label` | text | Human-readable description |
| `related_record_type` | text | 'hypothesis' | 'experiment' | etc. |
| `related_record_id` | uuid | nullable |
| `metadata` | jsonb | Supplementary data |
| `occurred_at` | timestamptz | Defaults to now() |

No UPDATE or DELETE policies — events are immutable to preserve history.

---

## Hypothesis States and Definitions

| Status | Definition |
|--------|------------|
| `untested` | No experiments linked, or all experiments are planned/draft with no recorded responses. |
| `testing` | One or more experiments are active but no observations have been recorded yet. |
| `supported` | ≥60% of completed experiments met their predefined success threshold with sufficient sample size. |
| `challenged` | ≥60% of completed experiments did NOT meet their predefined success threshold with sufficient sample size. |
| `inconclusive` | Evidence is mixed, insufficient sample size across all experiments, or conflicting results exist. |

### Notes
- `supported` does **not** mean the market or business model is validated.
- `challenged` does **not** mean the business is unviable — it means this specific hypothesis assumption needs revision.
- States are computed deterministically each time the page is loaded. The DB status may lag the computed status.

---

## Classification Rules (in priority order)

**Source:** `src/lib/scoring/marketProofClassifier.ts`

### Rule 1 — No experiments
If no experiments are linked → `untested`

### Rule 2 — All experiments planned/draft, no responses
If all experiments are in `planned` or `draft` status and no responses recorded → `untested`

### Rule 3 — Active experiments, no responses
If at least one experiment is `active` or `running` but no responses have been recorded → `testing`

### Rule 4 — Insufficient sample
If total valid responses across all experiments < `MIN_VALID_RESPONSES_FOR_CONCLUSION` (currently **3**) → `inconclusive`

Rationale: Below this threshold, results are purely exploratory and cannot support a defensible conclusion.

### Rule 5 — Conflicting results
If any experiment has closely split positive and negative outcomes (within 30% of each other, n≥4) → `inconclusive`

Rationale: Contradictory evidence requires a follow-up experiment before classification.

### Rule 6 — Supported
If ≥60% of completed experiments with evaluable thresholds met their predefined success threshold → `supported`

### Rule 7 — Challenged
If ≥60% of completed experiments with evaluable thresholds did NOT meet their predefined success threshold → `challenged`

### Rule 8 — Default / Mixed
If none of the above rules apply → `inconclusive`

---

## Minimum Evidence Requirements

| Requirement | Value | Source |
|-------------|-------|--------|
| Min valid responses for conclusion | 3 | `MIN_VALID_RESPONSES_FOR_CONCLUSION` |
| Supported threshold rate | 60% | `SUPPORTED_THRESHOLD_RATE` |
| Challenged threshold rate | 60% | `CHALLENGED_THRESHOLD_RATE` |
| Min sample per experiment | Configurable per experiment | `threshold_min_sample` field |

---

## Evidence Types and Provenance

### Signal Tiers (ranked weakest → strongest)

| Tier | Label | Commercial Weight |
|------|-------|-------------------|
| `reported_interest` | Reported Interest (Weak) | ❌ Not commercial |
| `qualified_lead` | Qualified Lead | ❌ Not commercial |
| `signup` | Product Signup | ❌ Not commercial |
| `paid_order` | Paid Order | ✅ Commercial signal |
| `repeat_purchase` | Repeat Purchase | ✅ Commercial signal |
| `objection` | Objection / Rejection | ❌ Negative signal |

**Important distinctions:**
- An introduction request being accepted ≠ evidence of customer demand
- Reported interest in a survey ≠ willingness to pay
- A scheduled interview ≠ commercial commitment
- Only `paid_order` and `repeat_purchase` count as commercial signals

### Evidence Types

| Type | Description |
|------|-------------|
| `interview` | Customer Interview |
| `survey-submission` | Survey Response |
| `observation` | Field Observation |
| `purchase` | Purchase / Transaction |
| `signup` | Product Signup |
| `lead` | Qualified Lead |
| `inquiry` | Inbound Inquiry |

---

## Treatment of Conflicting or Missing Evidence

### Missing Evidence
- Missing evidence is **not** treated as negative evidence
- A hypothesis with no experiments is `untested`, not `challenged`
- An intro request that is pending is not counted as evidence either way

### Conflicting Evidence
- Experiments with closely split positive/negative outcomes trigger `conflictingResults = true`
- Classification defaults to `inconclusive` when conflicts are detected
- Conflicting results are **displayed** on the hypothesis card, not hidden
- The suggested next action recommends a targeted follow-up experiment

---

## Next-Step Recommendation Rules

**Source:** `suggestNextAction()` in `marketProofClassifier.ts`

| Status | Recommended Next Action |
|--------|------------------------|
| `untested` | Create and activate a field experiment |
| `testing` (pending intros) | Review pending intro requests (not claim response) |
| `testing` (no intros) | Record individual experiment observations |
| `supported` (no commercial signal) | Advance to paid pilot or purchase experiment |
| `supported` (commercial signal) | Document and prepare larger-scale pilot |
| `challenged` | Revisit hypothesis scope, pricing, or audience |
| `inconclusive` (conflicting) | Design a targeted follow-up experiment |
| `inconclusive` (low sample) | Collect more observations (shows minimum) |
| `inconclusive` (accepted intro) | Record that interaction as an experiment response |
| `inconclusive` (mixed) | Run follow-up experiment with clearer threshold |

---

## Historical Assessment Handling

- `city_comparisons` records are never overwritten; each comparison is a point-in-time snapshot
- The `scoring_model_version` field identifies which scoring model version produced the assessment
- If a newer comparison exists, the original is still linked to the hypothesis via `comparison_id`
- The Market Proof view displays the `created_at` timestamp alongside the Fit Score so founders understand it represents a historical snapshot

---

## Security

### Row Level Security
All tables enforce RLS:
- `hypotheses` — user can only access their own rows
- `experiments` — user can only access their own rows
- `experiment_responses` — user can only access their own rows
- `introduction_requests` — user can only access their own rows
- `contacts` — public read (no private details stored)
- `hypothesis_intro_links` — user can only select/insert/delete their own rows
- `proof_events` — user can only select/insert their own rows (no update/delete)

### Cross-user Data Protection
- All server actions explicitly filter by `user_id = auth.uid()` before returning data
- ID validation is done server-side — client-supplied IDs are verified for ownership before joining
- Private notes and business context in intro requests are never exposed to other users through joined queries

### Known Limitations
- `contacts` table is public-readable (no personal contact details should be stored there)
- `proof_events` is append-only — events cannot be corrected after the fact (by design)
- The classifier recomputes status on each page load; the `hypotheses.status` DB field may be stale
- Demo fallback data shows simulated experiments and is clearly labelled

---

## Files Changed in Phase 8

| File | Change |
|------|--------|
| `supabase/migrations/0006_market_proof_loop.sql` | New — adds `hypothesis_intro_links` and `proof_events` tables with RLS |
| `src/types/database.ts` | Updated — added `HypothesisIntroLink`, `ProofEvent`, `ProofEventType` types |
| `src/lib/scoring/marketProofClassifier.ts` | New — deterministic evidence classification engine |
| `src/lib/actions/marketProof.ts` | New — server actions for Market Proof data loading and linking |
| `src/app/(dashboard)/market-proof/page.tsx` | Rebuilt — full Phase 8 UI replacing Phase 2 stub |
| `src/lib/scoring/__tests__/marketProofClassifier.test.ts` | New — unit tests for classifier |
| `docs/MARKET_PROOF_LOOP.md` | New — this file |

---

## Manual Verification Checklist

1. Open a saved City Intelligence assessment → create a hypothesis linked to it
2. Go to Market Validation → create an experiment linked to the hypothesis
3. Record at least 3 responses (mix positive/negative)
4. Return to Market Proof → verify the hypothesis card shows the correct computed status
5. Submit an intro request in Local Connect → link it to the hypothesis via the actions
6. Verify the timeline shows only recorded events (no invented timestamps)
7. Check that a hypothesis with no experiments shows `untested`, not `challenged`
8. Test with a second user account to verify private joined data is inaccessible (RLS)
9. Record only 1–2 responses and verify the result is `inconclusive` (insufficient sample)
10. Record equal positive/negative responses → verify `inconclusive` (conflicting) is shown
