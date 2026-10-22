# CityPilot Codebase Reconnaissance

## Scoring Module

**Path**: `src/lib/scoring/fitScore.ts`

**Exports**:
- `computeFitScore(input: ScoringInput): ScoringResult` - Main scoring function
- `evaluateCityCriteria(cityName, indicators, competitors, weights): ScoringCriterionInput[]` - Maps raw indicators to criterion scores
- `computeEvidenceCoverage(criteria, indicators)` - Calculates evidence coverage percentage
- `fitScoreColor(score): string` - Returns color class for score display
- `fitScoreLabel(score, insufficientData): string` - Returns human-readable label
- `DEFAULT_CRITERIA` - Array of 5 criteria with default weights
- `SCORING_MODEL_VERSION` - Current version string ('v1.0.0')

## Scoring Factors (Criteria)

| Key | Label | Default Weight | Direction | Data Status |
|-----|-------|----------------|-----------|-------------|
| Demand Fit | Demand Fit | 25 | higher_when_better | Estimate (from MoHUA, State Economic Surveys) |
| Competitive Opportunity | Competitive Opportunity | 20 | lower_when_better (inverted) | Estimate (from DPIIT Startup India) |
| Distribution Feasibility | Distribution Feasibility | 20 | higher_when_better | Estimate (from RAI) |
| Entry Cost & Unit Economics | Entry Cost & Unit Economics | 20 | lower_when_better (inverted) | Estimate (from JLL, Knight Frank, CBRE) |
| Operational Feasibility & Talent | Operational Feasibility & Talent | 15 | higher_when_better | Estimate (from NPCI) |

**Total Default Weight**: 100

## Missing Data Handling

- **Representation**: Missing factors have `is_available: false` and `score: null` in `ScoringCriterionInput`
- **Current Behavior**: Missing factors are **excluded from the denominator** (not treated as 0 or average)
- **Minimum Evidence Threshold**: Requires at least 3 eligible criteria AND at least 50% of total possible weight
- **Per-City vs Global**: Missingness is evaluated **per city** - a factor can be missing for one city but available for another
- **Insufficient Data Flag**: When threshold not met, `total_score` returns `null` and `insufficient_data: true`

## Validation Library & Schemas

**Path**: `src/lib/validations/schemas.ts`

**Library**: Zod v4

**Existing Schemas**:
- `startupProfileSchema` - Startup profile validation
- `cityComparisonSchema` - City comparison input validation
- `marketIndicatorSchema` - Market indicator validation
- `introductionRequestSchema` - Local Connect request validation
- `localConnectFilterSchema` - Local Connect filter validation
- `hypothesisSchema` - Market validation hypothesis
- `experimentSchema` - Market validation experiment
- `thresholdUpdateSchema` - Threshold change validation
- `experimentResponseSchema` - Experiment response validation
- `assumptionSchema` - Market assumption validation

**No existing weights schema** - This needs to be added in Phase 1

## Design Tokens

**Path**: `src/app/globals.css`

**Design System**: Tailwind CSS v4 with custom CityPilot tokens

**Primary Colors**:
- Navy: `#0F172A` (primary), `#0A1628` (950)
- Teal: `#0D9488` (accent), `#14B8A6` (500)

**Surfaces**:
- Background: `#F8FAFC`
- Surface: `#FFFFFF`
- Surface Raised: `#F1F5F9`

**Component Utilities**: `.card-shadow`, `.teal-glow`, `.border-subtle`

## Comparison/Recommendation View

**Path**: `src/app/(dashboard)/city-intelligence/page.tsx` (list view)
**Path**: `src/app/(dashboard)/city-intelligence/[id]/page.tsx` (detail view)

**Current Implementation**: Server Components that fetch data via Supabase and render comparison results

## Test Framework & Command

**Framework**: Node.js native test runner (`node --test`)

**Test Command**: `npm test`

**Test Location**: `src/lib/**/__tests__/*.test.ts`

**Current Test Count**: 174 tests passing (baseline)

## Scoring Execution Location

**Server-side only** - Scoring runs in Server Components and Server Actions via `src/lib/scoring/fitScore.ts`. No client-side scoring logic exists.

## Protected Paths (Scope Guard)

**Authentication Paths**:
- `src/app/(auth)/`
- `src/app/auth/`
- `src/lib/supabase/` (auth client files)

**Database Schema/Migrations**:
- `supabase/migrations/`
- `supabase/seed.sql`

**Local Connect / Directory**:
- `src/app/(dashboard)/local-connect/`
- `src/lib/scoring/localConnectMatching.ts`

**Scope Guard Command**:
```bash
git diff round1-baseline --stat -- src/app/(auth) src/app/auth src/lib/supabase supabase/migrations supabase/seed.sql src/app/(dashboard)/local-connect src/lib/scoring/localConnectMatching.ts
```

**Expected Output**: Empty (no changes to protected paths)

## Current Scorer Behavior

**Formula**: `total_score = (sum(score_i * weight_i) / sum(weight_i for eligible criteria)) * 10`

**Weight Handling**: Weights are clamped between 0 and 100 via `Math.max(0, Math.min(100, weight))`

**Normalization**: Scores are normalized by the sum of weights of **eligible criteria only** (missing factors excluded)

**Rounding**: Final score rounded to 2 decimal places via `parseFloat(value.toFixed(2))`

**Tie-breaking**: Not currently implemented - needs to be added in Phase 1
