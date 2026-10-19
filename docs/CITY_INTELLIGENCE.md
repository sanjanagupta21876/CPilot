# City Intelligence & Fit Score System Specification

**City Launchpad — Module A: City Intelligence & Fit Score**  
**Document Version:** 1.0.0  
**Scoring Engine Version:** `v1.0.0`  

---

## 1. Product Principles & Architecture Overview

The City Intelligence module helps early-stage and growth founders evaluate new Indian expansion cities through empirical, verifiable market data.

### Core Non-Negotiables:
1. **Evidence Before Confidence:** Every factual market indicator and observed competitor price must preserve source provenance (publisher, source URL, collection date, geographic scope, and confidence classification).
2. **Deterministic & Explainable:** Scoring is executed in tested TypeScript application code (`src/lib/scoring/fitScore.ts`). AI or LLMs are never used to generate numeric scores.
3. **No Fabricated Facts:** Missing data is never silently treated as 0, average, or positive. If evidence is insufficient, the system explicitly reports **"Insufficient data"**.
4. **Separation of Score from Coverage:** A high fit score on 20% coverage is fundamentally different from a high fit score on 100% coverage. Evidence Coverage is calculated, stored, and displayed independently from the Fit Score.
5. **Preservation of History:** Assessments are versioned with their scoring model version (`v1.0.0`) and saved as immutable historical records. Recalculations create new snapshots rather than overwriting past runs.

---

## 2. Scoring Model Architecture (`v1.0.0`)

### 2.1 The Deterministic Formula

$$\text{Fit Score} = \frac{\sum_{i \in \text{Eligible}} (\text{score}_i \times \text{weight}_i)}{\sum_{i \in \text{Eligible}} \text{weight}_i} \times 10$$

Where:
- $\text{score}_i \in [0.0, 10.0]$: Normalized criterion score evaluated from raw city indicators.
- $\text{weight}_i \in [0, 100]$: User-configurable or default weight for criterion $i$.
- $\text{Eligible}$: The subset of criteria that have valid, verified indicators.
- The resulting weighted average is scaled by 10 to produce a 0–100 overall score rounded to two decimal places.

### 2.2 Default Criteria, Weights & Rationale

| Criterion | Default Weight | Directionality | Description & Rationale |
| :--- | :---: | :---: | :--- |
| **Demand Fit** | 25% | Higher is better | Evaluates total urban population scale and per capita disposable income. High consumer density and income increase the addressable market size. |
| **Competitive Opportunity** | 20% | **Inverted** (Lower saturation is better) | Evaluates DPIIT-recognized startup density and local competitors. Extreme incumbent saturation increases customer acquisition costs (CAC) and lowers opportunity unless unique moats exist. |
| **Distribution Feasibility** | 20% | Higher is better | Measures modern trade outlets per 100k population and organized retail/dark store presence for efficient logistics and distribution. |
| **Entry Cost & Unit Economics** | 20% | **Inverted** (Lower cost is better) | Evaluates commercial office and retail rent per square foot. Lower real estate overhead prolongs startup runway and lowers operational burn. |
| **Operational Feasibility & Talent** | 15% | Higher is better | Assesses digital payments velocity (UPI transactions per capita per year) and digital infrastructure adoption. |

*Total Baseline Weight = 100%.*

---

## 3. Directionality & Raw Indicator Normalization Rules

Raw indicators are converted to a normalized 0–10 scale using documented empirical benchmarks:

### 1. Demand Fit
- **Indicators:** `Metro Population` (MoHUA/Census) and `Per Capita Income` (State Economic Surveys).
- **Scale:**
  - Income > ₹4,00,000/yr: 5.0 pts; ₹3,20,000–₹4,00,000: 4.5 pts; ₹2,80,000–₹3,20,000: 3.8 pts; < ₹2,80,000: 3.0 pts.
  - Population > 25M: 5.0 pts; 15M–25M: 4.6 pts; 10M–15M: 4.0 pts; 6M–10M: 3.5 pts; < 6M: 2.8 pts.
- Combined score = $\text{Income Score} + \text{Population Score} \in [0, 10]$.

### 2. Competitive Opportunity (Inverse Directionality)
- **Indicators:** `Recognized Startups` (DPIIT) and local `competitors` records.
- **Scale:**
  - $\ge 13,000$ startups (e.g. Bengaluru, Delhi-NCR): **5.2 / 10** (Heavily saturated, elevated CAC).
  - $9,000 - 13,000$ startups (e.g. Mumbai): **5.8 / 10** (Dense commercial competition).
  - $5,000 - 9,000$ startups (e.g. Hyderabad): **7.8 / 10** (Strong momentum with significant whitespace).
  - $< 5,000$ startups (e.g. Pune, Chennai): **8.5 / 10** (Emerging hub, prime early mover opportunity).

### 3. Distribution Feasibility
- **Indicators:** `Modern Trade / Supermarket Density` (Outlets per 100k population, RAI).
- **Scale:**
  - $\ge 21$ outlets / 100k (e.g. Mumbai): **9.4 / 10**
  - $18 - 21$ outlets / 100k (e.g. Delhi-NCR, Bengaluru): **8.6 / 10**
  - $14 - 18$ outlets / 100k (e.g. Hyderabad): **7.6 / 10**
  - $< 14$ outlets / 100k (e.g. Pune, Chennai): **6.8 / 10**

### 4. Entry Cost & Unit Economics (Inverse Directionality)
- **Indicators:** `Commercial Office Rent Benchmark` (INR / sq.ft / Month, JLL/Knight Frank/CBRE).
- **Scale:**
  - Average rent > ₹150 / sq.ft (e.g. Mumbai BKC/Lower Parel): **4.8 / 10** (High operational burn).
  - Average rent ₹90–₹150 / sq.ft (e.g. Bengaluru ORR, Gurugram): **6.6 / 10**
  - Average rent ₹70–₹90 / sq.ft (e.g. Hyderabad Hitec City, Pune Kharadi): **8.2 / 10**
  - Average rent < ₹70 / sq.ft (e.g. Chennai Guindy/OMR): **9.0 / 10** (Capital-efficient runway).

### 5. Operational Feasibility & Digital Readiness
- **Indicators:** `UPI Digital Transaction Density` (Transactions / Capita / Yr, NPCI).
- **Scale:**
  - $\ge 800$ tx / capita / yr (e.g. Bengaluru): **9.6 / 10**
  - $750 - 800$ tx / capita / yr (e.g. Mumbai, Delhi-NCR): **8.9 / 10**
  - $680 - 750$ tx / capita / yr (e.g. Hyderabad, Pune): **8.0 / 10**
  - $< 680$ tx / capita / yr (e.g. Chennai): **7.2 / 10**

---

## 4. Missing Data & Minimum Evidence Thresholds

When an indicator is unavailable for a target city:
1. **Never Assume Zero:** Assigning score = 0 penalizes the city unfairly.
2. **Never Fabricate Values:** Synthesizing an average distorts founder risk.
3. **Exclude from Denominator:** The missing criterion is excluded from $\sum_{i \in \text{Eligible}} \text{weight}_i$ and flagged in `missing_criteria: string[]`.
4. **Minimum Evidence Guardrails:**
   - If the number of eligible criteria is **less than 3**, OR
   - If the sum of eligible criteria weights is **less than 50%** of total possible weight:
   - The engine flags `insufficient_data = true` and returns `total_score = null`.
   - The UI displays an **"Insufficient Data"** badge rather than an authoritative score.

---

## 5. Evidence Coverage Calculation

Evidence Coverage is computed deterministically as:

$$\text{Evidence Coverage} = \frac{|\text{Eligible Criteria}|}{|\text{Total Configured Criteria}|} \times 100\%$$

The panel reports:
- **Coverage Percentage:** Direct percentage of criteria with empirical indicators.
- **Data Confidence Distribution:** Count of High vs Medium vs Low confidence sources.
- **Simulated / Benchmark Count:** Clear accounting of demonstration records vs official empirical data.
- **Limitations Log:** Explicit warnings if proxy data (e.g. state-level estimates) was used.

> **Crucial Disclaimer:** Evidence coverage indicates data completeness and empirical availability. It is NOT a statistical confidence interval, nor does it guarantee startup success.

---

## 6. Sourced Local Competitor Catalog

Competitors are cataloged in the `competitors` table:
- **`name`**: Brand or company entity.
- **`city`**: Target service territory.
- **`category`**: Industry sector (e.g., SaaS, B2B Logistics, D2C FMCG).
- **`offering`**: Specific product or solution proposition.
- **`observed_price`** & **`price_unit`**: Transparent commercial price point observed on ground or public portal.
- **`source_url`** & **`observed_date`**: Verifiable citation.
- **`is_simulated`**: Boolean flag ensuring benchmark demo records are never misrepresented as audited fieldwork.

---

## 7. How to Add New City Indicators Without Fabricating Data

1. **Verify Official Provenance:** Use statutory or primary sources (RBI, NPCI, Ministry of Statistics, DPIIT, State Economic Surveys, recognized real estate market reports).
2. **Populate Provenance Columns:**
   - `geographic_scope`: Specify `'metro'`, `'district'`, or `'state'`.
   - `data_period`: Specify fiscal year or observation period (e.g. `'2023-2024'`).
   - `confidence`: Set to `'high'` for statutory portals; `'medium'` for trade association surveys; `'unverified'` for user submissions.
   - `is_simulated`: Always set to `false` for genuine records. If creating mock entries for test environments, set to `true`.
3. **Insert through Migration or Admin UI:** Never insert records with null or fabricated URLs.
