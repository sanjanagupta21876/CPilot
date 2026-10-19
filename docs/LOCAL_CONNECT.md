# City Launchpad — Local Connect (Phase 6)

## 1. Overview & Purpose

**Local Connect** enables Indian startup founders to discover vetted local partners, suppliers, distributors, mentors, and ecosystem organizations across key urban expansion hubs. It facilitates permission-based, structured introduction requests, backed by deterministic match explanations and transparent provenance tracking.

---

## 2. Resource Categories & Field Definitions

Local resources are classified into controlled, extensible categories aligned with Indian startup market-entry needs:

| Category Value | Display Label | Target Alignment / Description |
|---|---|---|
| `retailer` | Retailers & Retail Partners | Modern trade, hypermarkets, organic food grocers, consumer retail chains. |
| `distributor` | Distributors & Wholesalers | Kirana FMCG distributors, electronics accessories wholesalers, multi-channel aggregators. |
| `logistics` | Logistics & Warehousing | Dark store operators, refrigerated cold-chain transport, parcel line-haul providers. |
| `supplier` | Suppliers & Manufacturers | OEM hardware fabrication, sheet-metal enclosures, industrial batch packaging. |
| `pilot-customer` | Potential Pilot Customers | Hospital consortiums, enterprise B2B buyers, MSME associations. |
| `mentor` | Industry Mentors & Specialists | Seasoned domain leaders, APMC/mandi advisors, enterprise sales veterans. |
| `institution` | Incubators & Ecosystem Orgs | Government nodal promotion agencies (e.g. GAIC, T-Hub), university incubators, trade bodies. |
| `service-provider` | Specialized Service Providers | Legal and IP compliance, APMC licensing consultants, state taxation advisors. |

### Core Data Fields

- `id`: UUID primary key.
- `name`: Public contact or lead partner name.
- `organization`: Registered firm or institution name.
- `role`: Functional title (e.g., "Category Manager", "Head of Procurement").
- `category`: Controlled enum value (see table above).
- `city`: Operating hub (e.g., Bengaluru, Mumbai, Pune, Hyderabad, Delhi-NCR, Chennai).
- `service_area`: Specific geographic corridor covered (e.g., "South Bengaluru", "MMR & Navi Mumbai", "Pan-Maharashtra").
- `capabilities`: Array of concrete services offered (e.g., `['Multi-temperature Fleet', 'Dark Store Warehousing', 'Real-time Telemetry API']`).
- `industry_tags`: Target domain sectors (e.g., `['AgriTech', 'Cold Storage', 'Logistics']`).
- `description`: Objective background summary of organizational capacity.
- `website_url`: Legitimately public official website.
- `source_name`: Traceable provenance record (e.g., "Karnataka Cold Storage Association Registry 2026").
- `source_url`: Optional public verification link.
- `verified`: Boolean backward-compatibility flag.
- `verification_status`: Granular verification lifecycle state.
- `verified_at`: Timestamp of last verification review.
- `is_demo`: Boolean flag denoting whether the record is simulated/sample data for evaluation.

> [!IMPORTANT]
> **Privacy Boundary:** Private personal emails and phone numbers are strictly prohibited from public directory tables. Only legitimate public corporate websites and verified organizational details are rendered.

---

## 3. Verification States & Provenance Rules

Every resource in Local Connect presents an unambiguous verification state:

| Status | Badge / Icon | Criteria & Provenance Rule |
|---|---|---|
| `directly_confirmed` | Green ShieldCheck | Directly confirmed through primary institutional records, regulatory filings, or direct signed engagement. |
| `source_checked` | Blue CheckCircle2 | Cross-referenced against authoritative third-party registries, chamber of commerce rosters, or verified directories. |
| `unverified` | Slate ShieldAlert | Public trade directory listing without secondary confirmation. Presented with explicit caveats. |

### Provenance Principles

1. Records must specify `source_name` and optional `source_url`.
2. A record is **never** marked verified simply because it contains a website or a database row.
3. Demonstration records are clearly marked `is_demo = true` with persistent banners.

---

## 4. Deterministic Matching Engine

City Launchpad relies on a **100% deterministic, explainable scoring engine** (0 to 100 points) rather than black-box AI embeddings or predictive promises.

### Scoring Formula & Weight Allocation

$$\text{Total Score} = \min(100, \text{Industry Score} + \text{Geographic Score} + \text{Category Score} + \text{Verification Score})$$

| Component | Max Points | Evaluation Logic |
|---|---|---|
| **Industry Fit** | 35 | • Exact tag match between startup industry/product category and resource `industry_tags`: **35 pts**<br>• Overlapping domain keywords in `capabilities` or description: **25 pts** (≥2 tokens) or **15 pts** (1 token)<br>• General ecosystem relevance (`general`, `early-stage`): **10 pts**<br>• No domain overlap: **0 pts** |
| **Geographic Fit** | 35 | • Resource city is listed in founder's target `expansion_cities`: **35 pts**<br>• Resource city matches founder's `current_city` base: **25 pts**<br>• Regional corridor or Pan-India coverage in `service_area`: **18 pts**<br>• Unrelated non-target city: **0 pts** |
| **Category & Channel** | 15 | • Retail/General Trade channel alignment (`retailer`, `distributor`, `logistics`): **15 pts**<br>• B2B / Enterprise sales channel alignment (`pilot-customer`, `distributor`): **15 pts**<br>• Early-stage founder stage alignment (`mentor`, `institution`): **15 pts**<br>• Baseline category fit: **8 pts** |
| **Verification Transparency** | 15 | • `directly_confirmed`: **15 pts**<br>• `source_checked`: **10 pts**<br>• `unverified`: **5 pts** |

### Ground-Truth Explanation Generation

For each ranked contact, match explanations are synthesized strictly from database fields:
- *"Matches startup industry focus: [Matched Tag]"*
- *"Operates directly in target expansion city: [City]"*
- *"Category matches distribution channel ([Category])"*
- *"Directly confirmed ecosystem contact"* / *"Source-checked profile ([Source])"*

Missing data is never treated as a positive match. Capabilities are never hallucinated or inferred.

---

## 5. Introduction Request Lifecycle & Permissions

Founders submit structured introduction requests directly to local resources.

```
       [ Founder Submits ]
               │
               ▼
           pending
          ┌────┴──────────────────────────┐
          │ (Founder Action)              │ (Recipient / Admin Action)
          ▼                               ▼
      cancelled / withdrawn          accepted / declined
                                          │
                                          ▼ (Delivery complete)
                                      completed
```

### Supported Statuses

- `pending`: Request recorded in Supabase, awaiting recipient or administrator review.
- `accepted`: Authorized recipient or admin has reviewed and accepted the introduction.
- `declined`: Recipient or admin declined the connection (e.g. outside current procurement scope).
- `cancelled`: Founder voluntarily cancelled the pending request.
- `withdrawn`: Founder withdrew the request before formal processing.
- `completed`: Introduction completed and connection handed off.

### Authorization & State Transition Matrix

| Action | Current Status | New Status | Authorized Role | Enforced Mechanism |
|---|---|---|---|---|
| **Submit Request** | — | `pending` | Authenticated Founder | Server action checks session `user_id` and startup ownership |
| **Cancel Request** | `pending` | `cancelled` / `withdrawn` | Owning Founder | Server action verifies `request.user_id == auth.uid()` |
| **Accept Request** | `pending` | `accepted` | Recipient / Admin | Prohibited for founder; reserved for authorized admin |
| **Decline Request** | `pending` | `declined` | Recipient / Admin | Prohibited for founder; reserved for authorized admin |
| **Complete Introduction**| `accepted` | `completed` | Recipient / Admin | Prohibited for founder |
| **Re-open Cancelled** | `cancelled` | `pending` | *Disallowed* | Rejected by transition validator |

---

## 6. Security & Row Level Security (RLS)

1. **Private Request Isolation:** Row Level Security policies enforce that `introduction_requests` can only be selected, inserted, or updated by the user whose `auth.uid()` matches `user_id`.
2. **Public Directory Safety:** The `contacts` table (and `local_resources` view) is publicly readable for discovery, but write operations require administrative roles.
3. **No Private Contact Leakage:** All public contact profiles omit private phone numbers, home addresses, or personal emails.
4. **Server-Derived Identity:** All introduction submissions derive the founder's ID strictly from the verified Supabase auth session, rejecting client-tampered IDs.

---

## 7. Known Limitations & Future Roadmap

- **Recipient Portal (Phase 9):** In Phase 6, recipients without active platform accounts do not have self-service login dashboards; requests are managed via founder tracking and simulated ecosystem handling.
- **Automated Email Notifications (Future Phase):** Webhooks and transactional email dispatches (Resend/SendGrid) for pending introduction alerts will be integrated in Phase 7/8.
- **AI Query Semantic Expansion (Phase 9):** Natural language intent mapping (e.g. "find me suppliers near Electronic City") is slated for Phase 9 while retaining deterministic ranking as the ground truth.
