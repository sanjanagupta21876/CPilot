# CityPilot Weighted Ranking & What-If Methodology

This document provides the definitive specification of CityPilot's deterministic What-If weighted ranking engine, missing data handling, deterministic tie-breaking, driver attribution rules, and a fully verified, reproducible hand-calculation example using actual criteria and real benchmark indicator data.

---

## 1. Actual Factor Keys and Default Weights

CityPilot evaluates city expansion feasibility across five standard criteria. Default weights reflect baseline strategic priorities for Indian market startup expansion:

| Factor Key | Default Weight | Directionality | Data Status | Description |
|---|---|---|---|---|
| **Demand Fit** | 25 | Higher is better | Estimate | Evaluates urban consumer density (MoHUA) and per capita disposable income (State Economic Surveys). |
| **Competitive Opportunity** | 20 | Lower is better (inverted) | Estimate | Assesses startup density (DPIIT Startup India). Higher incumbent saturation implies higher CAC. |
| **Distribution Feasibility** | 20 | Higher is better | Estimate | Evaluates modern trade and organized retail density (Retailers Association of India). |
| **Entry Cost & Unit Economics** | 20 | Lower is better (inverted) | Estimate | Evaluates commercial real estate overhead (JLL, Knight Frank, CBRE). Lower rent preserves runway. |
| **Operational Feasibility & Talent** | 15 | Higher is better | Estimate | Assesses digital commerce velocity via UPI transactions per capita (NPCI). |

**Total Baseline Weight**: $25 + 20 + 20 + 20 + 15 = 100$

All five criteria carry the baseline data status `Estimate`, sourced from statutory economic surveys and verified industry trade associations.

---

## 2. Scoring & Missingness Behavior

### Mathematical Formula
For any candidate city with eligible criteria set $E$:

$$\text{total\_score} = \left( \frac{\sum_{i \in E} (\text{score}_i \times \text{weight}_i)}{\sum_{i \in E} \text{weight}_i} \right) \times 10$$

Where:
- $\text{score}_i \in [0, 10]$ is the deterministically evaluated criterion score.
- $\text{weight}_i \in [0, 100]$ is the priority weight assigned to criterion $i$.
- Final $\text{total\_score}$ is rounded to 2 decimal places.

### Per-City Missing Data Handling
1. **Exclusion from Denominator**: Missing criteria (`is_available = false` or `score = null`) are **strictly excluded from both numerator and denominator**. They are never silently treated as zero or imputed as the average.
2. **Per-City Evaluation**: Missingness is determined per city. If City A is missing "Entry Cost" but City B has verified data for "Entry Cost", City A excludes it while City B retains it. The factor remains active and adjustable globally.
3. **Weight Invariance**: Changing the priority weight of a missing factor has **zero effect** on the score of a city where that factor is missing.
4. **Minimum Evidence Guardrail**:
   - A city must have **at least 3 eligible criteria**.
   - The sum of eligible weights must be **at least 50%** of total possible weight.
   - If either condition fails, the city is flagged with `insufficient_data = true` and `total_score = null`.
5. **No Fake Ranks or Zero Scores**: Cities with insufficient data are marked as `Unranked`. They are **never** assigned a fake rank (e.g. 0, 99) or a fake score of 0. Their excluded/missing factors are explicitly listed.

---

## 3. Deterministic Tie-Breaking Rule

When ranking eligible candidate cities, ties are resolved deterministically in three sequential tiers:
1. **Primary**: Score descending (`total_score_B - total_score_A`).
2. **Secondary**: Baseline default rank preserved first (`baseline_rank_A < baseline_rank_B`).
3. **Tertiary**: Stable alphabetical city name (`city_A.localeCompare(city_B)`).

This guarantees identical inputs produce identical ranks across any execution environment.

---

## 4. Deterministic Driver Rule (Counterfactual Sensitivity Analysis)

### Driver Definition
When a scenario causes a city's rank to change, users need to understand which priority change caused the shift. CityPilot defines the driver strictly via the existing deterministic scorer through a **counterfactual baseline reset test**:

1. If a city's rank did not change (`new_rank === prev_rank`), the driver is **`No change`** with zero impact.
2. If a city's rank changed (`new_rank !== prev_rank`):
   - Identify all factors whose weights changed from baseline ($W_{\text{new}}[f] \neq W_{\text{base}}[f]$).
   - Filter to factors that are **available for that city** (missing factors cannot drive a city's movement).
   - For each candidate factor $f$:
     - Construct counterfactual weights $W^{(f)}$ where factor $f$ is reset to its baseline weight while keeping all other new weights.
     - Recompute all candidate cities using the existing scorer `computeFitScore`.
     - Measure the **rank reversal magnitude** $\Delta R = |\text{new\_rank} - \text{cf\_rank}|$ and **score reversal impact** $\Delta S = |\text{new\_score} - \text{cf\_score}|$.
   - Select the factor that produces the largest rank reversal towards baseline, broken by largest score impact $\Delta S$.
3. **Important Labeling**: The result is labeled as the **largest modeled driver under the scenario**, not a causal market claim.

---

## 5. Preset Profiles

CityPilot provides three pre-configured priority presets. All presets validate through `weightsSchema`, use actual factor keys, and sum to 100:

| Preset Name | Demand Fit | Competitive Opportunity | Distribution Feasibility | Entry Cost | Operational Talent | Primary Focus |
|---|---|---|---|---|---|---|
| **Balanced** | 20% | 20% | 20% | 20% | 20% | Equal evaluation across all 5 dimensions. |
| **Cost-first** | 15% | 15% | 15% | 45% | 10% | Capital-efficient expansion prioritizing low burn and affordable real estate. |
| **Demand-first** | 45% | 15% | 15% | 15% | 10% | Fast top-line growth prioritizing consumer density and disposable income. |

Presets are computed in-memory and are never persisted to the database.

---

## 6. Reproducible Step-by-Step Hand-Calculation Example

This example uses the real criteria and explicit benchmark data for **Bengaluru**, **Mumbai**, a **Tier-2 City with Missing Data**, and an **Insufficient Evidence City**.

### Explicit Fixture Data

#### 1. Bengaluru (City A) — Full Verified Evidence
- Demand Fit: Population 13.6M (4.0 pts) + Income ₹3,32,000 (4.5 pts) = **8.5**
- Competitive Opportunity: 14,800 startups $\ge$ 13,000 = **5.2**
- Distribution Feasibility: 18.4 supermarket density $\ge$ 18 = **8.6**
- Entry Cost & Unit Economics: Rent ₹85–110 (avg ₹97.5/sq.ft) = **6.6**
- Operational Feasibility & Talent: UPI 842 tx/capita $\ge$ 800 = **9.6**
- *All 5 criteria available.* Eligible weight sum = 100.

#### 2. Mumbai (City B) — Full Verified Evidence
- Demand Fit: Population 21.3M (4.6 pts) + Income ₹3,85,000 (4.5 pts) = **9.1**
- Competitive Opportunity: 10,200 startups $\ge$ 9,000 = **5.8**
- Distribution Feasibility: 22.1 supermarket density $\ge$ 21 = **9.4**
- Entry Cost & Unit Economics: Rent ₹140–240 (avg ₹190/sq.ft) = **4.8**
- Operational Feasibility & Talent: UPI 795 tx/capita $\ge$ 750 = **8.9**
- *All 5 criteria available.* Eligible weight sum = 100.

#### 3. Tier-2 Hub (City C) — Partial Data (Entry Cost & Talent Missing)
- Demand Fit: **6.0**
- Competitive Opportunity: **7.5**
- Distribution Feasibility: **6.5**
- Entry Cost & Unit Economics: *Missing* (`is_available: false, score: null`)
- Operational Feasibility & Talent: *Missing* (`is_available: false, score: null`)
- *3 eligible criteria (meets $\ge 3$ threshold).* Eligible weight sum = $25 + 20 + 20 = 65$ (meets $\ge 50\%$ threshold).

#### 4. Sparse Hub (City D) — Insufficient Data
- Demand Fit: **5.0**
- Competitive Opportunity: *Missing*
- Distribution Feasibility: *Missing*
- Entry Cost & Unit Economics: *Missing*
- Operational Feasibility & Talent: *Missing*
- *1 eligible criterion (< 3 threshold).* Flagged as `insufficient_data = true`.

---

### Step 1: Baseline Scoring & Ranking ($W = [25, 20, 20, 20, 15]$)

#### Bengaluru:
$$\text{Weighted Sum} = (8.5 \times 25) + (5.2 \times 20) + (8.6 \times 20) + (6.6 \times 20) + (9.6 \times 15)$$
$$= 212.5 + 104.0 + 172.0 + 132.0 + 144.0 = 764.5$$
$$\text{Total Score} = \left(\frac{764.5}{100}\right) \times 10 = \mathbf{76.45}$$

#### Mumbai:
$$\text{Weighted Sum} = (9.1 \times 25) + (5.8 \times 20) + (9.4 \times 20) + (4.8 \times 20) + (8.9 \times 15)$$
$$= 227.5 + 116.0 + 188.0 + 96.0 + 133.5 = 761.0$$
$$\text{Total Score} = \left(\frac{761.0}{100}\right) \times 10 = \mathbf{76.10}$$

#### Tier-2 Hub (City C):
$$\text{Eligible Weight Sum} = 25 + 20 + 20 = 65$$
$$\text{Weighted Sum} = (6.0 \times 25) + (7.5 \times 20) + (6.5 \times 20) = 150.0 + 150.0 + 130.0 = 430.0$$
$$\text{Total Score} = \left(\frac{430.0}{65}\right) \times 10 = 6.61538... \times 10 = \mathbf{66.15}$$

#### Sparse Hub (City D):
- Fails minimum criteria threshold (1 < 3).
- $\text{Total Score} = \mathbf{null}$, $\text{Rank} = \mathbf{Unranked}$.

#### Baseline Ranking Table:
| Rank | City | Score | Coverage | Status |
|---|---|---|---|---|
| **#1** | Bengaluru | 76.45 | 100% | Ranked |
| **#2** | Mumbai | 76.10 | 100% | Ranked |
| **#3** | Tier-2 Hub | 66.15 | 60% | Ranked (2 criteria excluded) |
| **Unranked** | Sparse Hub | — | 20% | Insufficient Evidence |

---

### Step 2: What-If Scenario — Raising Demand Fit Weight to 50
Suppose the founder prioritizes top-line market scale and increases **Demand Fit** priority weight from **25 to 50**.
New weights: $W_{\text{new}} = [50, 20, 20, 20, 15]$. Total possible weight = 125.

#### Bengaluru New Score:
$$\text{Weighted Sum} = (8.5 \times 50) + 104.0 + 172.0 + 132.0 + 144.0 = 425.0 + 552.0 = 977.0$$
$$\text{Total Score} = \left(\frac{977.0}{125}\right) \times 10 = 7.816 \times 10 = \mathbf{78.16}$$

#### Mumbai New Score:
$$\text{Weighted Sum} = (9.1 \times 50) + 116.0 + 188.0 + 96.0 + 133.5 = 455.0 + 533.5 = 988.5$$
$$\text{Total Score} = \left(\frac{988.5}{125}\right) \times 10 = 7.908 \times 10 = \mathbf{79.08}$$

#### Tier-2 Hub (City C) New Score:
$$\text{Eligible Weight Sum} = 50 + 20 + 20 = 90$$
$$\text{Weighted Sum} = (6.0 \times 50) + 150.0 + 130.0 = 300.0 + 280.0 = 580.0$$
$$\text{Total Score} = \left(\frac{580.0}{90}\right) \times 10 = 6.4444... \times 10 = \mathbf{64.44}$$

#### What-If Scenario Results Table:
| Candidate City | Previous Rank | New Rank | Rank Movement | Previous Score | New Score | Main Factor Driver | Excluded Factors |
|---|---|---|---|---|---|---|---|
| **Mumbai** | #2 | **#1** | **+1 (Up)** | 76.10 | **79.08** | **Demand Fit** | None |
| **Bengaluru** | #1 | **#2** | **-1 (Down)** | 76.45 | **78.16** | **Demand Fit** | None |
| **Tier-2 Hub** | #3 | **#3** | **No change** | 66.15 | **64.44** | **No change** | Entry Cost, Operational Talent |
| **Sparse Hub** | Unranked | **Unranked** | **—** | — | — | **—** | Comp, Dist, Cost, Talent |

---

### Step 3: Counterfactual Driver Calculation for Mumbai

1. **Rank Movement**: Mumbai moved from Rank #2 to Rank #1 ($\text{rankMovement} = +1 \neq 0$).
2. **Changed Factors**: Only `Demand Fit` changed ($25 \to 50$).
3. **Availability**: `Demand Fit` is verified and available for Mumbai ($s = 9.1$).
4. **Counterfactual Test**: Reset `Demand Fit` weight back to baseline ($50 \to 25$):
   - Mumbai score under counterfactual: $76.10$.
   - Mumbai rank under counterfactual: Rank #2.
5. **Reversal Effect**:
   - $\text{Rank Reversal Magnitude} = |1 - 2| = 1$ (Rank restored to baseline).
   - $\text{Score Reversal Impact} = |79.08 - 76.10| = \mathbf{2.98}$ points.
6. **Conclusion**: `Demand Fit` is identified as the **largest modeled driver** under this scenario.

---

### Step 4: Missingness Invariance Proof for Tier-2 Hub

Now suppose the user changes **Entry Cost & Unit Economics** weight from 20 to 50:
- Entry Cost is missing for Tier-2 Hub (`is_available = false`).
- Eligible criteria for Tier-2 Hub: Demand Fit (25), Competitive Opportunity (20), Distribution Feasibility (20).
- Eligible weight sum: $25 + 20 + 20 = 65$.
- Weighted sum: $(6.0 \times 25) + (7.5 \times 20) + (6.5 \times 20) = 430.0$.
- Score: $(430.0 / 65) \times 10 = \mathbf{66.15}$.

Notice that changing Entry Cost weight to 50, 80, or 0 has **0 impact** on Tier-2 Hub's score ($66.15 = 66.15$). This mathematically confirms per-city missingness isolation.
