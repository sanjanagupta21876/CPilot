# City Launchpad — Local Market Validation (Phase 7)

## 1. Overview & Purpose

**Local Market Validation** enables Indian startup founders to systematically test critical demand, willingness-to-pay, and customer behavior assumptions across potential expansion cities before committing capital to full-scale operations.

Rather than relying on vague verbal feedback or moving goalposts post-hoc, Phase 7 enforces:
1. **Falsifiable Market Hypotheses**: Explicit, testable assumptions linked to target customer segments, specific urban hubs, and observable customer actions.
2. **Pre-registered Success Thresholds**: Measurable target metrics defined *in advance* with explicit comparison operators, numerical targets, units, and minimum sample size guards.
3. **Audit Trail Integrity**: Any changes to experiment success thresholds require a mandatory documented rationale and are permanently logged to `threshold_history`.
4. **Graduated Commercial Signal Tiers**: Clear distinctions between cheap verbal interest (`reported_interest`) and actual commercial demand (`paid_order`, `repeat_purchase`, `qualified_lead`).
5. **Deterministic Metric Calculations**: Fully auditable mathematical formulas with division-by-zero guards, returning `null` / `N/A` instead of false precision or `NaN%`.

---

## 2. Hypothesis Lifecycle & Structure

A hypothesis in City Launchpad must be structured such that empirical evidence can clearly disprove or confirm it.

```
                  ┌──────────────┐
                  │   untested   │
                  └──────┬───────┘
                         │ (Experiment created)
                         ▼
                  ┌──────────────┐
                  │   testing    │
                  └──────┬───────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
  ┌──────────────┐┌──────────────┐┌──────────────┐
  │  supported   ││  challenged  ││ inconclusive │
  └──────────────┘└──────────────┘└──────────────┘
```

### Lifecycle Statuses

| Status | Definition | Criteria |
|---|---|---|
| `untested` | Initial formulation | Hypothesis documented; no live field experiment launched yet. |
| `testing` | Active data collection | One or more active field experiments linked and actively collecting responses. |
| `supported` | Validated by evidence | Defined success threshold met with statistically sufficient sample size. |
| `challenged` | Disproved by evidence | Completed experiment failed threshold or uncovered severe recurring objections. |
| `inconclusive` | Ambiguous evidence | Contradictory signals or insufficient sample size to draw a defensible conclusion. |

### Schema Fields (`hypotheses`)

- `id`: UUID primary key.
- `user_id`: UUID foreign key to `auth.users`.
- `startup_id`: Optional UUID foreign key to `startup_profiles`.
- `city`: Operating expansion hub (e.g., Pune, Bengaluru, Indore).
- `statement`: Clear, falsifiable proposition statement.
- `target_audience`: Target buyer persona or operational gatekeeper segment.
- `problem_statement`: Explicit pain point, financial loss, or friction experienced by the customer.
- `expected_behavior`: Concrete observable customer action proving demand.
- `strategic_rationale`: Business context explaining why this hypothesis is critical to expansion.
- `status`: Lifecycle enum (`untested`, `testing`, `supported`, `challenged`, `inconclusive`).
- `is_demo`: Boolean flag for sample demonstration data.

---

## 3. Experiment Testing Methods

Experiments provide structured protocols for gathering ground-truth evidence:

| Method Enum | Display Label | Recommended Use Case | Typical Minimum Sample |
|---|---|---|---|
| `survey` | Structured Survey | Quantifying problem frequency, current spend, and price willingness. | 20–50 |
| `interview` | Stakeholder Interview | In-depth qualitative discovery with department heads or business owners. | 8–15 |
| `retailer-outreach` | Retailer / Merchant Outreach | In-person store visits to pitch retail shelf placement or wholesale supply. | 10–25 |
| `distributor-outreach`| Distributor Outreach | Channel partner viability discussions and wholesale margin negotiation. | 5–10 |
| `paid-trial` | Paid Pilot / Trial Test | Highest-conviction test: customer pays an upfront fee or pilot deposit. | 3–10 |
| `pilot` | Operational Field Pilot | Hardware installation or workflow integration on-site. | 2–5 |
| `landing-page` | Landing Page Intent Test | Digital waitlist, pre-order deposit, or ad conversion smoke test. | 50–200 |

---

## 4. Structured Success Thresholds & Anti-Goalpost Integrity

To prevent founders or stakeholders from shifting goalposts after seeing unfavorable data, experiments require formal threshold criteria before launching.

### Threshold Definition Components

1. **Metric Name (`threshold_metric`)**:
   - `problem_confirmation_rate`: Percentage of respondents confirming the acute problem.
   - `paid_conversion_rate`: Percentage of respondents committing upfront capital or paid orders.
   - `qualified_lead_rate`: Percentage advancing to procurement evaluation or active trial.
   - `response_rate`: Percentage participating vs target outreach sample.
   - Custom numerical metric (e.g. daily hours of power uptime).
2. **Comparison Operator (`threshold_operator`)**:
   - Supported operators: `>=`, `>`, `<=`, `<`, `=`.
3. **Target Value (`threshold_target`)**: Numerical hurdle rate (e.g., `50`).
4. **Unit (`threshold_unit`)**: `%`, `count`, `INR`, or `ratio`.
5. **Minimum Sample Guard (`threshold_min_sample`)**:
   - Prevents declaring victory on small sample sizes (e.g., 2 positive responses out of 2 cannot claim 100% threshold met if minimum sample is 10).

### Anti-Goalpost Audit History (`threshold_history`)

When a founder adjusts an experiment's success threshold:
- A documented `change_reason` of at least 5 characters is **mandatory**.
- An immutable row is inserted into `threshold_history`:
  - `experiment_id`
  - `previous_threshold`
  - `new_threshold`
  - `change_reason`
  - `changed_at`
- The audit timeline is prominently rendered on the experiment detail page for investor and team transparency.

---

## 5. Commercial Signal Tiers & Privacy Standards

Survey participants frequently offer polite verbal encouragement that fails to materialize into sales. Phase 7 categorizes all observations into explicit signal tiers:

| Signal Tier | Weight / Significance | Definition |
|---|---|---|
| `paid_order` | **Tier 1 (Highest)** | Upfront subscription payment, advance deposit, or signed purchase order with monetary value. |
| `repeat_purchase` | **Tier 1 (Highest)** | Reorder or contractual renewal showing sustained unit economics. |
| `qualified_lead` | **Tier 2 (High)** | Formal vendor evaluation, procurement committee referral, or NDA requested. |
| `signup` | **Tier 3 (Moderate)** | Waitlist registration, portal account creation, or trial agreement. |
| `reported_interest` | **Tier 4 (Low)** | Verbal agreement or survey confirmation without financial or contractual commitment. |
| `objection` | **Counter-Signal** | Explicit rejection with documented reason (pricing, budget, vendor lock-in). |

### Interviewee Privacy Standard

> [!IMPORTANT]
> **Zero PII Policy:** Private phone numbers, email addresses, and personal contact info are prohibited from observation records. Anonymised labels must be used (e.g., `"FPO-Baramati-01"` or `"Retailer-Indiranagar-02"`).

---

## 6. Deterministic Metrics Calculation Engine

All metrics are calculated via deterministic TypeScript application logic (`src/lib/scoring/marketValidationMetrics.ts`). No LLMs or approximations are used.

### Mathematical Formulas

1. **Response Rate**:
   $$\text{Response Rate} = \frac{\text{Valid Responses}}{\text{Sample Target}} \times 100$$
2. **Problem Confirmation Rate**:
   $$\text{Confirmation Rate} = \frac{\text{Positive Outcomes}}{\text{Total Valid Responses}} \times 100$$
3. **Qualified Lead Rate**:
   $$\text{Lead Rate} = \frac{\text{Qualified Leads} + \text{Signups} + \text{Paid Orders} + \text{Repeat Purchases}}{\text{Total Valid Responses}} \times 100$$
4. **Paid Conversion Rate**:
   $$\text{Paid Conversion Rate} = \frac{\text{Paid Orders} + \text{Repeat Purchases}}{\text{Total Valid Responses}} \times 100$$

### Division-by-Zero Protection

If the denominator is `0`, `null`, or undefined:
- Calculation functions return `null`.
- The UI renders `'N/A (No responses)'` or `'N/A (No target)'`.
- It never produces `NaN%`, `Infinity%`, or deceptive `0%`.

### Outcome Interpretation Logic

$$\text{Interpretation} = \begin{cases}
\text{'not\_evaluated'} & \text{if experiment status is draft or planned} \\
\text{'insufficient\_sample'} & \text{if valid responses} < \text{threshold\_min\_sample} \\
\text{'threshold\_met'} & \text{if sample sufficient and evaluateOperator(actual, op, target) is true} \\
\text{'threshold\_not\_met'} & \text{if sample sufficient and evaluateOperator(actual, op, target) is false}
\end{cases}$$

---

## 7. Supabase Database Schema & RLS

Defined in `supabase/migrations/0005_market_validation.sql`:

1. **`hypotheses` Table**:
   - Complete CRUD policies restricted to authenticated user `auth.uid() = user_id`.
   - Seeded demo hypotheses for Pune, Bengaluru, and Indore.
2. **`threshold_history` Table**:
   - Audit trail for threshold modifications.
   - Insert and select restricted to experiment owner `auth.uid() = user_id`.
3. **`experiments` Table Enhancements**:
   - Structured threshold fields: `threshold_metric`, `threshold_operator`, `threshold_target`, `threshold_unit`, `threshold_min_sample`, `threshold_rationale`, `outcome_interpretation`.
   - Linked to `hypothesis_id` foreign key.
4. **`experiment_responses` Table Enhancements**:
   - Added `signal_tier`, `units_count`, `financial_value`, `rejection_reason`.

---

## 8. Verification & Test Suite

All 115 tests in `scripts/run-tests.ts` pass cleanly:
- 38 Market Validation Metrics & Threshold tests (`src/lib/scoring/__tests__/marketValidationMetrics.test.ts`).
- 13 Market Validation Schema Validation tests (`src/lib/validations/__tests__/marketValidation.test.ts`).
- Zero TypeScript compiler errors (`tsc --noEmit`).
- Zero ESLint warnings or errors (`npm run lint`).
