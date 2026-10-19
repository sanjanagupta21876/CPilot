# CityPilot

> **Tagline:** Find the right city. Connect with the right people.  
> **Product Purpose:** CityPilot helps small businesses and startups choose a suitable city for business expansion and discover relevant local businesses in that city.

The product immediately answers two fundamental questions:
1. **Where should my business expand?**
2. **Who can I connect with in that city?**

---

## 🎯 Strict Core Product Scope

CityPilot is built around a streamlined, two-part user journey:
**Business Details → Compare Cities → Understand Recommendation → Select a City → Discover Local Businesses**

### Feature A: City Recommendation & Comparison
- **Business Input Intake:** Enter category/industry, expansion budget, target customer segments, and operating parameters.
- **Deterministic Multi-City Evaluation:** Compare candidate cities across operating costs, demand indicators, competitive saturation, and customer segment fit.
- **Explainable Recommendation:** Clear breakdown of why the top city won, with factor-by-factor transparency.
- **Data Provenance:** Strict differentiation between verified indicators, curated benchmarks, estimates, and unavailable data (zero fabricated scores or fake validation).
- **Direct Handoff:** 1-click transition to discover local partners in the winning or selected city.

### Feature B: Local Business Connectivity
- **Target City Directory:** Direct connectivity to retailers, distributors, suppliers, wholesalers, and strategic partners in the chosen market.
- **Category & Verification Filters:** Filter by business type (Retailers, Distributors, Wholesalers, Institutional) and verification status (`directly_confirmed`, `source_checked`).
- **Profile Deep-Dives:** View verified operational capabilities, distribution catchments, addresses, phone/email contacts, and fit alignment.
- **Direct Connection Requests:** Submit structured introduction proposals with clear commercial intent (pilots, retail distribution, supply chain partnerships).

---

## 🎨 CityPilot Design System

- **Primary Brand Color:** Deep Navy Blue (`#0F172A`)
- **Secondary Accent:** Teal (`#0D9488` / `#14B8A6`)
- **Surfaces:** Crisp white (`#FFFFFF`) and subtle cool-grey surfaces (`#F8FAFC`, `#F1F5F9`)
- **Typography:** Modern, legible system sans-serif hierarchy
- **Component System:** Unified cards, buttons, badges, navigation, and dialogs tailored for trust and utility

---

## 🛠️ Technology Stack

- **Framework:** Next.js 16.4.2 (App Router with React 19 and Turbopack)
- **Styling:** Tailwind CSS v4 with bespoke CityPilot design tokens
- **Icons:** Lucide React
- **Database & Auth:** Supabase (PostgreSQL with Row-Level Security, `@supabase/ssr` session management)
- **Validation:** Zod schemas
- **Testing:** Node.js native test runner (`node --test`) with 174 deterministic tests passing

---

## ⚡ Quick Start & Running Locally

### 1. Prerequisites
- Node.js 18+ (tested on Node v22)
- npm 9+

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create `.env.local` using `.env.example`:
```bash
cp .env.example .env.local
```

Required variables for Supabase integration (the application also features an instant built-in **Demo Mode** with pre-populated cities and directory listings):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key # Optional: for bounded assistance
```

### 4. Run the Quality & Verification Suite
```bash
# 1. Type check TypeScript
npm run type-check

# 2. Lint code
npm run lint

# 3. Run all unit and integration test suites (174 tests)
npm test

# 4. Production build
npm run build
```

### 5. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Security & Privacy

- All user-specific tables enforce PostgreSQL Row Level Security (RLS) with `auth.uid() = user_id`.
- Server Actions independently verify authenticated sessions and resource ownership.
- Private credentials and API keys are strictly kept server-side; zero secrets in frontend bundles.
- Transparent demo fallback cookies (`demo_mode=true`) enable instant testing without requiring active cloud infrastructure.

---

## 📄 License

Proprietary — CityPilot.
