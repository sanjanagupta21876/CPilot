import type {
  StartupProfile,
  CityComparison,
  Contact,
  IntroductionStatus,
  ExperimentStatus,
  AssumptionStatus,
  Hypothesis,
  Experiment,
  ExperimentResponse,
  ThresholdHistory,
  SignalTier,
} from '@/types/database'

export interface DemoCityAssessment {
  id: string
  cityName: string
  state: string
  tier: string
  fitScore: number
  evidenceCoverage: number // 0-100% separate from fit score
  status: 'recommended' | 'promising' | 'exploratory' | 'challenging'
  keyDriver: string
  topRisk: string
  isBaseCity?: boolean
}

export interface DemoIntroRequest {
  id: string
  contactName: string
  organization: string
  category: 'retailer' | 'distributor' | 'mentor' | 'institution' | 'supplier' | 'pilot-customer'
  city: string
  status: IntroductionStatus
  purpose: string
  requestedAt: string
  notes?: string
}

export interface DemoValidationExperiment {
  id: string
  title: string
  city: string
  method: 'interview' | 'survey' | 'retailer-outreach' | 'landing-page' | 'pilot'
  status: ExperimentStatus
  hypothesis: string
  metricTarget: string
  metricActual?: string
  outcomeSummary?: string
  nextAction: string
  updatedAt: string
}

export interface DemoProofAssumption {
  id: string
  statement: string
  category: 'market-demand' | 'pricing' | 'distribution' | 'regulatory'
  status: AssumptionStatus
  evidenceSummary: string
  confidence: 'high' | 'medium' | 'low' | 'unverified'
  linkedModule: 'city-intelligence' | 'local-connect' | 'market-validation'
}

// ─────────────────────────────────────────────────────────────
// Demo Startup Profile: Kavach AgriTech
// ─────────────────────────────────────────────────────────────
export const DEMO_PROFILE: StartupProfile & {
  operatingCity: string
  expansionCities: string[]
  shortDescription: string
} = {
  id: 'demo-profile-001',
  user_id: 'demo-user-001',
  name: 'Kavach AgriTech',
  industry: 'AgriTech & Cold Chain IoT',
  stage: 'seed',
  target_customer: 'Tier-2/3 Farmer Producer Organisations (FPOs) and fresh produce aggregators',
  product_desc: 'Solar-powered IoT micro-cold storage pods and remote temperature/humidity sensors designed to reduce post-harvest horticultural losses from 35% to under 6%.',
  business_description: 'Decentralized farm-gate cold chain infrastructure for high-value horticulture in India.',
  current_city: 'Pune',
  expansion_cities: ['Bengaluru', 'Mumbai', 'Hyderabad'],
  primary_channel: 'B2B Direct Field Sales & FPO Partnerships',
  price_min: 75000,
  price_max: 250000,
  website_url: 'https://kavachagri.in',
  product_category: 'Cold Chain IoT Hardware & SaaS',
  target_geography: 'Western & Southern India',
  traction_summary: '14 micro-pods deployed with 3 FPOs in Maharashtra, generating ₹42L ARR.',
  expansion_context: 'Scaling into Karnataka and Madhya Pradesh horticulture corridors.',
  operatingCity: 'Pune, Maharashtra',
  expansionCities: ['Bengaluru, Karnataka', 'Ahmedabad, Gujarat', 'Indore, Madhya Pradesh'],
  shortDescription: 'Decentralized farm-gate cold chain infrastructure for high-value horticulture in India.',
  created_at: '2026-08-15T10:00:00Z',
  updated_at: '2026-10-17T14:30:00Z',
}

// ─────────────────────────────────────────────────────────────
// Demo City Assessments (Fit Score + Separate Evidence Coverage)
// ─────────────────────────────────────────────────────────────
export const DEMO_CITY_ASSESSMENTS: DemoCityAssessment[] = [
  {
    id: 'city-pune',
    cityName: 'Pune',
    state: 'Maharashtra',
    tier: 'Tier 1',
    fitScore: 86,
    evidenceCoverage: 92,
    status: 'recommended',
    keyDriver: 'Base headquarters with established FPO network across western Maharashtra grape & onion belt.',
    topRisk: 'Intense regional competition in farm-gate telemetry providers.',
    isBaseCity: true,
  },
  {
    id: 'city-bengaluru',
    cityName: 'Bengaluru',
    state: 'Karnataka',
    tier: 'Tier 1',
    fitScore: 81,
    evidenceCoverage: 84,
    status: 'recommended',
    keyDriver: 'Dense agri-logistics aggregators (WayCool, Ninjacart) and high institutional capital density.',
    topRisk: 'High pilot deployment real estate and talent acquisition overheads.',
  },
  {
    id: 'city-ahmedabad',
    cityName: 'Ahmedabad',
    state: 'Gujarat',
    tier: 'Tier 1',
    fitScore: 74,
    evidenceCoverage: 76,
    status: 'promising',
    keyDriver: 'Extensive co-operative federation cold corridor and proactive dairy/agro-processing clusters.',
    topRisk: 'Cooperative procurement cycles require 90+ day pilot sign-off.',
  },
  {
    id: 'city-indore',
    cityName: 'Indore',
    state: 'Madhya Pradesh',
    tier: 'Tier 2',
    fitScore: 69,
    evidenceCoverage: 62,
    status: 'exploratory',
    keyDriver: 'Hub of Malwa agricultural trade with dense mandis and soybean/potato production.',
    topRisk: 'Variable 3-phase rural power reliability requiring larger battery backups.',
  },
]

// ─────────────────────────────────────────────────────────────
// Demo Local Connect Requests
// ─────────────────────────────────────────────────────────────
export const DEMO_INTRO_REQUESTS: DemoIntroRequest[] = [
  {
    id: 'intro-001',
    contactName: 'Suresh Patil',
    organization: 'Sahyadri Farmers Producer Co.',
    category: 'institution',
    city: 'Pune',
    status: 'accepted',
    purpose: 'Explore 30-day paid pilot for 4 micro-cold storage pods at Nashik-Pune collection center.',
    requestedAt: '2026-10-10T09:15:00Z',
    notes: 'Pilot agreement signed. Initial sensor calibration scheduled.',
  },
  {
    id: 'intro-002',
    contactName: 'Ananya Raghavan',
    organization: 'WayCool Agritech Logistics',
    category: 'distributor',
    city: 'Bengaluru',
    status: 'pending',
    purpose: 'Understand third-party telemetry integration standards for Kolar vegetable corridor.',
    requestedAt: '2026-10-14T11:45:00Z',
    notes: 'Introduction forwarded to VP of Supply Chain Ops.',
  },
  {
    id: 'intro-003',
    contactName: 'Dr. Bhavesh Shah',
    organization: 'Gujarat Agro Industries Corp (GAIC)',
    category: 'institution',
    city: 'Ahmedabad',
    status: 'pending',
    purpose: 'Application for state cold-chain subsidy alignment and empanelment under PMKSY.',
    requestedAt: '2026-10-15T16:20:00Z',
    notes: 'Documentation submitted for technical committee review.',
  },
  {
    id: 'intro-004',
    contactName: 'Col. Rajesh Verma (Retd.)',
    organization: 'Malwa Agri Mentors Circle',
    category: 'mentor',
    city: 'Indore',
    status: 'accepted',
    purpose: 'Guidance on navigating Mandi board regulations and APMC market access in MP.',
    requestedAt: '2026-10-08T14:00:00Z',
    notes: 'Completed advisory call. Recommended 2 pilot contacts in Ujjain mandi.',
  },
]

// ─────────────────────────────────────────────────────────────
// Demo Market Hypotheses
// ─────────────────────────────────────────────────────────────
export const DEMO_HYPOTHESES: Hypothesis[] = [
  {
    id: 'hyp-001',
    user_id: 'demo-user-001',
    startup_id: 'demo-profile-001',
    city: 'Pune',
    statement:
      'FPO directors in Pune & Nashik peri-urban clusters will commit at least ₹450/month per storage pod for mobile temperature and spoilage alerts.',
    target_audience: 'FPO Directors & Cold Warehouse Managers (Horticulture & Vegetables)',
    problem_statement:
      'Lack of real-time temperature telemetry leads to 12-18% post-harvest spoilage in transit, causing rejection penalties from wholesale buyers.',
    expected_behavior:
      'At least 50% of surveyed FPO leaders confirm severe spoilage losses and express willingness to pilot paid sensor monitoring.',
    strategic_rationale:
      'Validates SaaS willingness-to-pay and unit economics before committing inventory to Maharashtra expansion hubs.',
    status: 'supported',
    comparison_id: 'comp-001',
    is_demo: true,
    created_at: '2026-10-01T09:00:00Z',
    updated_at: '2026-10-12T16:00:00Z',
  },
  {
    id: 'hyp-002',
    user_id: 'demo-user-001',
    startup_id: 'demo-profile-001',
    city: 'Bengaluru',
    statement:
      'Premium organic grocery chains in Bengaluru will prioritize cold-tracked leafy greens and pay a ₹2-4/kg premium for certified transit telemetry.',
    target_audience: 'Category Managers at Gourmet & Organic Supermarkets (Indiranagar, Koramangala)',
    problem_statement:
      'High ambient transit temperatures cause rapid wilting of leafy greens; retailers absorb shelf shrink without objective cold-chain accountability from farm suppliers.',
    expected_behavior:
      'At least 60% of interviewed retail category managers express active procurement interest and request pilot sample telemetry logs.',
    strategic_rationale:
      'Enables demand-pull model where retail buyers require their farmer suppliers to adopt Kavach telemetry.',
    status: 'testing',
    comparison_id: 'comp-001',
    is_demo: true,
    created_at: '2026-10-10T08:30:00Z',
    updated_at: '2026-10-16T10:30:00Z',
  },
  {
    id: 'hyp-003',
    user_id: 'demo-user-001',
    startup_id: 'demo-profile-001',
    city: 'Indore',
    statement:
      'Tier-2 APMC Mandi collection yards in Indore operate with sufficient electrical stability to maintain battery-backed cold telemetry without dedicated generators.',
    target_audience: 'APMC Mandi Commission Agents & Logistics Aggregators',
    problem_statement:
      'Frequent unannounced daytime power cuts at mandi auction sheds could drain telemetry batteries before transfer to transit trucks.',
    expected_behavior:
      'Grid uptime exceeds 20 hours/day or battery reserve sustains data logging during peak daytime auction periods.',
    strategic_rationale:
      'Determines whether field units require auxiliary solar trickle-charging or standard LiFePO4 battery modules.',
    status: 'untested',
    comparison_id: 'comp-001',
    is_demo: true,
    created_at: '2026-10-17T09:00:00Z',
    updated_at: '2026-10-17T09:00:00Z',
  },
  {
    id: 'hyp-004',
    user_id: 'demo-user-001',
    startup_id: 'demo-profile-001',
    city: 'Hyderabad',
    statement:
      'Regional farm-machinery and agri-input distributors in Telangana will sign exclusive distribution agreements with standard 15% wholesale margins.',
    target_audience: 'Agri-Input & Equipment Distributors (Secunderabad & Warangal route)',
    problem_statement:
      'Direct-to-farm hardware sales have extended sales cycles (90+ days) without existing dealer trust networks.',
    expected_behavior:
      'At least 3 distributors request regional distributorship terms without requiring consignment stock.',
    strategic_rationale:
      'Validates indirect channel distribution strategy for South Indian farming belts.',
    status: 'untested',
    comparison_id: 'comp-001',
    is_demo: true,
    created_at: '2026-10-18T04:00:00Z',
    updated_at: '2026-10-18T04:00:00Z',
  },
]

// ─────────────────────────────────────────────────────────────
// Demo Market Validation Experiments
// ─────────────────────────────────────────────────────────────
export const DEMO_EXPERIMENTS: (Experiment & DemoValidationExperiment)[] = [
  {
    id: 'exp-001',
    user_id: 'demo-user-001',
    startup_id: 'demo-profile-001',
    hypothesis_id: 'hyp-001',
    comparison_id: 'comp-001',
    title: 'Pune & Nashik FPO Willingness-to-Pay Survey',
    city: 'Pune',
    method: 'survey',
    target_audience: 'FPO Directors & Cold Warehouse Managers',
    hypothesis:
      'FPO directors will commit ₹450/month per storage pod for mobile temperature alert dashboard.',
    target_metric: 'Problem confirmation & willingness to pay',
    success_threshold: '≥ 50% positive willingness to pay (n=30)',
    threshold_metric: 'problem_confirmation_rate',
    threshold_operator: '>=',
    threshold_target: 50,
    threshold_unit: '%',
    threshold_min_sample: 20,
    threshold_rationale:
      'Pre-seed validation requirement: at least half of surveyed FPOs must validate financial value before local distributor rollout.',
    sample_size_target: 30,
    status: 'complete',
    outcome_interpretation: 'threshold_met',
    metricTarget: '≥ 50% positive willingness to pay (n=30)',
    metricActual: '68.4% confirmation rate (26 of 38 FPOs surveyed, 6 paid orders)',
    outcomeSummary:
      'Strong validation among horticulture FPOs; low willingness among grain producers.',
    nextAction:
      'Finalize standard SaaS agreement terms and deploy hardware kits to 2 pilot sites.',
    notes:
      'Survey conducted across 38 FPOs in Junnar, Baramati, and Niphad clusters. 6 FPOs paid ₹5,400 annual advance subscriptions.',
    started_at: '2026-10-01T10:00:00Z',
    completed_at: '2026-10-12T16:00:00Z',
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-12T16:00:00Z',
    updatedAt: '2026-10-12T16:00:00Z',
    is_demo: true,
  },
  {
    id: 'exp-002',
    user_id: 'demo-user-001',
    startup_id: 'demo-profile-001',
    hypothesis_id: 'hyp-002',
    comparison_id: 'comp-001',
    title: 'Bengaluru Fresh Greens Retailer Outreach',
    city: 'Bengaluru',
    method: 'retailer-outreach',
    target_audience: 'Category Managers at Organic Supermarkets',
    hypothesis:
      'Premium organic grocery chains will prioritize suppliers with certified temperature-controlled transit logs.',
    target_metric: 'Qualified lead / procurement interest rate',
    success_threshold: '≥ 60% qualified lead rate (min 8 responses)',
    threshold_metric: 'qualified_lead_rate',
    threshold_operator: '>=',
    threshold_target: 60,
    threshold_unit: '%',
    threshold_min_sample: 8,
    threshold_rationale:
      'Direct B2B retailer adoption requires majority of interviewed category leads expressing active procurement intent.',
    sample_size_target: 12,
    status: 'active',
    outcome_interpretation: 'threshold_met',
    metricTarget: '≥ 60% qualified lead rate (min 8 responses)',
    metricActual: '62.5% qualified lead rate (5 of 8 completed interviews, 1 paid trial)',
    outcomeSummary:
      'Retailers confirm ₹2-4/kg premium for cold-tracked leafy greens.',
    nextAction:
      'Complete remaining 4 retailer interviews in Indiranagar and Koramangala.',
    notes:
      '8 completed interviews so far. 1 chain placed a paid pilot trial worth ₹12,000 for 3 store branches.',
    started_at: '2026-10-10T09:00:00Z',
    completed_at: null,
    created_at: '2026-10-10T09:00:00Z',
    updated_at: '2026-10-16T10:30:00Z',
    updatedAt: '2026-10-16T10:30:00Z',
    is_demo: true,
  },
  {
    id: 'exp-003',
    user_id: 'demo-user-001',
    startup_id: 'demo-profile-001',
    hypothesis_id: 'hyp-003',
    comparison_id: 'comp-001',
    title: 'Indore APMC Mandi Power Reliability Observation',
    city: 'Indore',
    method: 'pilot',
    target_audience: 'Mandi Commission Agents & Cold Hub Operators',
    hypothesis:
      'Rural mandi grid sheds power under 4 hours daily during peak daytime auction hours.',
    target_metric: 'Daily grid uptime hours',
    success_threshold: '≥ 80% problem confirmation / uptime stability',
    threshold_metric: 'problem_confirmation_rate',
    threshold_operator: '>=',
    threshold_target: 80,
    threshold_unit: '%',
    threshold_min_sample: 7,
    threshold_rationale:
      'Continuous 7-day electrical logging required before approving battery-only pod specifications.',
    sample_size_target: 7,
    status: 'planned',
    outcome_interpretation: 'not_evaluated',
    metricTarget: '≥ 80% problem confirmation / uptime stability',
    metricActual: 'Planned for next field visit (telemetry kit ready)',
    outcomeSummary:
      'Experiment planned for next field visit; telemetry data logger ready for deployment.',
    nextAction:
      'Install demo battery telemetry logger at Sanwer road collection hub.',
    notes:
      'Telemetry kit prepared. Waiting for on-site coordinator confirmation in Sanwer Mandi.',
    started_at: null,
    completed_at: null,
    created_at: '2026-10-17T09:00:00Z',
    updated_at: '2026-10-17T09:00:00Z',
    updatedAt: '2026-10-17T09:00:00Z',
    is_demo: true,
  },
]

// ─────────────────────────────────────────────────────────────
// Demo Experiment Observations / Responses
// ─────────────────────────────────────────────────────────────
export const DEMO_EXPERIMENT_RESPONSES: ExperimentResponse[] = [
  // Pune & Nashik Survey Responses (38 entries, n=38)
  {
    id: 'resp-001',
    experiment_id: 'exp-001',
    user_id: 'demo-user-001',
    respondent_label: 'FPO-Baramati-01',
    response_type: 'survey-submission',
    outcome: 'positive',
    signal_tier: 'paid_order',
    units_count: 1,
    financial_value: 5400,
    notes: 'Paid 1-year annual subscription upfront for tomato sorting shed telemetry.',
    recorded_at: '2026-10-02T11:00:00Z',
  },
  {
    id: 'resp-002',
    experiment_id: 'exp-001',
    user_id: 'demo-user-001',
    respondent_label: 'FPO-Niphad-02',
    response_type: 'survey-submission',
    outcome: 'positive',
    signal_tier: 'paid_order',
    units_count: 2,
    financial_value: 10800,
    notes: 'Export table grape packhouse. Issued purchase order for 2 monitored transit pods.',
    recorded_at: '2026-10-02T14:30:00Z',
  },
  {
    id: 'resp-003',
    experiment_id: 'exp-001',
    user_id: 'demo-user-001',
    respondent_label: 'FPO-Junnar-03',
    response_type: 'survey-submission',
    outcome: 'positive',
    signal_tier: 'qualified_lead',
    units_count: 1,
    financial_value: null,
    notes: 'Requested on-site trial deployment during coming cabbage harvest season.',
    recorded_at: '2026-10-03T09:15:00Z',
  },
  {
    id: 'resp-004',
    experiment_id: 'exp-001',
    user_id: 'demo-user-001',
    respondent_label: 'FPO-Indapur-04',
    response_type: 'survey-submission',
    outcome: 'negative',
    signal_tier: 'objection',
    units_count: 1,
    financial_value: null,
    rejection_reason: 'Produces dry grains & pulses; cold chain monitoring not relevant.',
    notes: 'Irrelevant segment for cold storage pods.',
    recorded_at: '2026-10-03T11:45:00Z',
  },
  {
    id: 'resp-005',
    experiment_id: 'exp-001',
    user_id: 'demo-user-001',
    respondent_label: 'FPO-Daund-05',
    response_type: 'survey-submission',
    outcome: 'positive',
    signal_tier: 'signup',
    units_count: 1,
    financial_value: null,
    notes: 'Signed up for pilot waitlist. Operates 3 cold collection vans for Pune retail.',
    recorded_at: '2026-10-04T10:00:00Z',
  },
  {
    id: 'resp-006',
    experiment_id: 'exp-001',
    user_id: 'demo-user-001',
    respondent_label: 'FPO-Nashik-06',
    response_type: 'survey-submission',
    outcome: 'positive',
    signal_tier: 'paid_order',
    units_count: 1,
    financial_value: 5400,
    notes: 'Pomegranate aggregator. Confirmed 1 paid unit for Mumbai wholesale transit.',
    recorded_at: '2026-10-04T15:20:00Z',
  },
  {
    id: 'resp-007',
    experiment_id: 'exp-001',
    user_id: 'demo-user-001',
    respondent_label: 'FPO-Shirur-07',
    response_type: 'survey-submission',
    outcome: 'positive',
    signal_tier: 'reported_interest',
    units_count: 1,
    financial_value: null,
    notes: 'Agreed problem is critical; wants board approval before commercial trial.',
    recorded_at: '2026-10-05T09:30:00Z',
  },
  {
    id: 'resp-008',
    experiment_id: 'exp-001',
    user_id: 'demo-user-001',
    respondent_label: 'FPO-Khed-08',
    response_type: 'survey-submission',
    outcome: 'negative',
    signal_tier: 'objection',
    units_count: 1,
    financial_value: null,
    rejection_reason: 'Current margins too tight to add ₹450/month per pod.',
    notes: 'Stated price sensitivity; requested subsidy or co-op grant option.',
    recorded_at: '2026-10-05T13:00:00Z',
  },
  {
    id: 'resp-009',
    experiment_id: 'exp-001',
    user_id: 'demo-user-001',
    respondent_label: 'FPO-Yeola-09',
    response_type: 'survey-submission',
    outcome: 'positive',
    signal_tier: 'paid_order',
    units_count: 1,
    financial_value: 5400,
    notes: 'Onion & sweet lime cluster. Paid annual fee.',
    recorded_at: '2026-10-06T10:45:00Z',
  },
  {
    id: 'resp-010',
    experiment_id: 'exp-001',
    user_id: 'demo-user-001',
    respondent_label: 'FPO-Satana-10',
    response_type: 'survey-submission',
    outcome: 'positive',
    signal_tier: 'paid_order',
    units_count: 1,
    financial_value: 5400,
    notes: 'Vegetable collection hub. Confirmed paid pilot pod.',
    recorded_at: '2026-10-06T14:15:00Z',
  },
  {
    id: 'resp-011',
    experiment_id: 'exp-001',
    user_id: 'demo-user-001',
    respondent_label: 'FPO-Dindori-11',
    response_type: 'survey-submission',
    outcome: 'positive',
    signal_tier: 'paid_order',
    units_count: 1,
    financial_value: 5400,
    notes: 'Exotic vegetables collective. Paid annual subscription.',
    recorded_at: '2026-10-07T11:00:00Z',
  },
  {
    id: 'resp-012',
    experiment_id: 'exp-001',
    user_id: 'demo-user-001',
    respondent_label: 'FPO-Manchar-12',
    response_type: 'survey-submission',
    outcome: 'neutral',
    signal_tier: 'reported_interest',
    units_count: 1,
    financial_value: null,
    notes: 'Interested but existing cold room uses local offline data loggers.',
    recorded_at: '2026-10-07T16:00:00Z',
  },
  // Responses 13 to 38 generated to match n=38, positive=26, negative=8, neutral=4
  ...Array.from({ length: 26 }, (_, idx) => {
    const num = idx + 13
    const isPos = num <= 27 // brings positive to 26
    const isNeg = num > 27 && num <= 34 // brings negative to 8
    const outcome = isPos ? 'positive' : isNeg ? 'negative' : 'neutral'
    const tier = isPos ? (num % 2 === 0 ? 'qualified_lead' : 'reported_interest') : isNeg ? 'objection' : 'reported_interest'
    return {
      id: `resp-0${num}`,
      experiment_id: 'exp-001',
      user_id: 'demo-user-001',
      respondent_label: `FPO-Survey-Cohort-${num}`,
      response_type: 'survey-submission' as const,
      outcome: outcome as 'positive' | 'negative' | 'neutral',
      signal_tier: tier as SignalTier,
      units_count: 1,
      financial_value: null,
      notes: isPos
        ? 'Confirmed 15%+ transit spoilage; eager for automated SMS/app alerts.'
        : isNeg
          ? 'Unwilling to pay without government co-payment.'
          : 'Under review by executive committee.',
      recorded_at: `2026-10-${num < 20 ? '08' : num < 30 ? '09' : '10'}T12:00:00Z`,
    }
  }),

  // Bengaluru Retail Outreach Responses (8 entries, n=8)
  {
    id: 'resp-101',
    experiment_id: 'exp-002',
    user_id: 'demo-user-001',
    respondent_label: 'Retail-Indiranagar-Organic-01',
    response_type: 'interview',
    outcome: 'positive',
    signal_tier: 'paid_order',
    units_count: 3,
    financial_value: 12000,
    notes: 'Category head for leafy greens signed 3-month paid pilot for 3 store branches.',
    recorded_at: '2026-10-11T11:00:00Z',
  },
  {
    id: 'resp-102',
    experiment_id: 'exp-002',
    user_id: 'demo-user-001',
    respondent_label: 'Retail-Koramangala-Gourmet-02',
    response_type: 'interview',
    outcome: 'positive',
    signal_tier: 'qualified_lead',
    units_count: 1,
    financial_value: null,
    notes: 'Agreed to mandate Kavach telemetry tags for incoming hydroponic lettuce suppliers.',
    recorded_at: '2026-10-12T14:30:00Z',
  },
  {
    id: 'resp-103',
    experiment_id: 'exp-002',
    user_id: 'demo-user-001',
    respondent_label: 'Retail-Whitefield-Supermart-03',
    response_type: 'interview',
    outcome: 'positive',
    signal_tier: 'qualified_lead',
    units_count: 1,
    financial_value: null,
    notes: 'Requested API documentation to integrate cold-chain logs with their ERP system.',
    recorded_at: '2026-10-13T10:15:00Z',
  },
  {
    id: 'resp-104',
    experiment_id: 'exp-002',
    user_id: 'demo-user-001',
    respondent_label: 'Retail-HSR-FreshMarket-04',
    response_type: 'interview',
    outcome: 'positive',
    signal_tier: 'signup',
    units_count: 1,
    financial_value: null,
    notes: 'Completed onboarding questionnaire for seasonal berry shipments.',
    recorded_at: '2026-10-14T09:00:00Z',
  },
  {
    id: 'resp-105',
    experiment_id: 'exp-002',
    user_id: 'demo-user-001',
    respondent_label: 'Retail-Jayanagar-Coop-05',
    response_type: 'interview',
    outcome: 'negative',
    signal_tier: 'objection',
    units_count: 1,
    financial_value: null,
    rejection_reason: 'Legacy vendor contract prohibits third-party logistics instrumentation.',
    notes: 'Procurement policy restricts new telemetry vendors until FY27 renewal.',
    recorded_at: '2026-10-14T15:00:00Z',
  },
  {
    id: 'resp-106',
    experiment_id: 'exp-002',
    user_id: 'demo-user-001',
    respondent_label: 'Retail-Bellandur-Grocer-06',
    response_type: 'interview',
    outcome: 'positive',
    signal_tier: 'qualified_lead',
    units_count: 1,
    financial_value: null,
    notes: 'Meeting scheduled with regional supply chain director next Tuesday.',
    recorded_at: '2026-10-15T11:30:00Z',
  },
  {
    id: 'resp-107',
    experiment_id: 'exp-002',
    user_id: 'demo-user-001',
    respondent_label: 'Retail-Malleshwaram-Mart-07',
    response_type: 'interview',
    outcome: 'neutral',
    signal_tier: 'reported_interest',
    units_count: 1,
    financial_value: null,
    notes: 'Supportive in concept, but mostly procures through local APMC open auction.',
    recorded_at: '2026-10-15T16:00:00Z',
  },
  {
    id: 'resp-108',
    experiment_id: 'exp-002',
    user_id: 'demo-user-001',
    respondent_label: 'Retail-Sarjapur-Direct-08',
    response_type: 'interview',
    outcome: 'neutral',
    signal_tier: 'reported_interest',
    units_count: 1,
    financial_value: null,
    notes: 'Requested case study data from Maharashtra trials before committing shelf space.',
    recorded_at: '2026-10-16T10:00:00Z',
  },
]

// ─────────────────────────────────────────────────────────────
// Demo Threshold Modification History (Audit Log)
// ─────────────────────────────────────────────────────────────
export const DEMO_THRESHOLD_HISTORY: ThresholdHistory[] = [
  {
    id: 'thresh-hist-001',
    experiment_id: 'exp-001',
    user_id: 'demo-user-001',
    previous_threshold: '≥ 40% willingness to pay (n=20)',
    new_threshold: '≥ 50% positive willingness to pay (n=30)',
    change_reason:
      'Increased threshold rigor following advisory review: expansion into Maharashtra requires stronger statistical proof of commercial demand before distributor inventory commitments.',
    changed_at: '2026-10-05T14:00:00Z',
  },
  {
    id: 'thresh-hist-002',
    experiment_id: 'exp-002',
    user_id: 'demo-user-001',
    previous_threshold: '8 out of 12 retailers request sample temperature telemetry log',
    new_threshold: '≥ 60% qualified lead rate (min 8 responses)',
    change_reason:
      'Converted qualitative outreach goal into structured quantitative percentage rate with explicit minimum sample size guard.',
    changed_at: '2026-10-11T12:00:00Z',
  },
]

// ─────────────────────────────────────────────────────────────
// Demo Market Proof Loop Assumptions
// ─────────────────────────────────────────────────────────────
export const DEMO_ASSUMPTIONS: DemoProofAssumption[] = [
  {
    id: 'assump-001',
    statement: 'FPOs will pay ₹450/month per unit for real-time mobile temperature & spoilage alerts.',
    category: 'pricing',
    status: 'supported',
    evidenceSummary: 'Validated by 26/38 FPO directors in Pune/Nashik survey (Exp #001) and 2 signed pilot letters.',
    confidence: 'high',
    linkedModule: 'market-validation',
  },
  {
    id: 'assump-002',
    statement: 'Tier-2 Mandis in Indore provide reliable 3-phase grid power for farm-gate cold units.',
    category: 'distribution',
    status: 'challenged',
    evidenceSummary: 'Initial mentor report and regional DISCOM schedules show 4–6 hour daily outages in summer.',
    confidence: 'medium',
    linkedModule: 'local-connect',
  },
  {
    id: 'assump-003',
    statement: 'Organized retailers in Bengaluru demand API integration with existing ERP / POS software.',
    category: 'market-demand',
    status: 'untested',
    evidenceSummary: 'Pending conclusion of retailer outreach interviews (Exp #002). 5 interviews logged so far.',
    confidence: 'unverified',
    linkedModule: 'market-validation',
  },
  {
    id: 'assump-004',
    statement: 'Distributor margin expectation for smart cold units is under 15% of hardware MSRP.',
    category: 'distribution',
    status: 'supported',
    evidenceSummary: 'Confirmed in introductory alignment meeting with Sahyadri Farmers Producer Co.',
    confidence: 'medium',
    linkedModule: 'local-connect',
  },
]

// ─────────────────────────────────────────────────────────────
// Demo Comparison Object (for City Intelligence)
// ─────────────────────────────────────────────────────────────
export const DEMO_COMPARISONS: CityComparison[] = [
  {
    id: 'comp-001',
    user_id: 'demo-user-001',
    title: 'Western & Southern AgriTech Expansion Cohort',
    cities: ['Pune', 'Bengaluru', 'Ahmedabad', 'Indore'],
    status: 'complete',
    created_at: '2026-10-14T08:00:00Z',
    updated_at: '2026-10-17T11:00:00Z',
  },
  {
    id: 'comp-002',
    user_id: 'demo-user-001',
    title: 'Northern Horticulture Corridor Evaluation',
    cities: ['Delhi-NCR', 'Chandigarh', 'Jaipur'],
    status: 'draft',
    created_at: '2026-10-16T15:20:00Z',
    updated_at: '2026-10-16T15:20:00Z',
  },
]

// ─────────────────────────────────────────────────────────────
// Demo Contacts (for Local Connect)
// ─────────────────────────────────────────────────────────────
export const DEMO_CONTACTS: Contact[] = [
  {
    id: 'contact-001',
    name: 'Suresh Patil',
    organization: 'Sahyadri Farmers Producer Co.',
    role: 'Chairman & Managing Director',
    category: 'institution',
    city: 'Pune',
    industry_tags: ['AgriTech', 'Cold Storage', 'FPO', 'Horticulture'],
    capabilities: ['FPO Aggregation', 'Farm-gate Infrastructure', 'Export Packing', 'Farmer Outreach'],
    service_area: 'Pune & Nashik Corridor',
    website_url: 'https://sahyadrifarms.com',
    description: 'Largest horticulture FPO network in India (18,000+ farmer members) managing cold storage nodes.',
    source_name: 'Sahyadri Farms Annual Report & ROC',
    source_url: 'https://sahyadrifarms.com',
    verified: true,
    verification_status: 'directly_confirmed',
    verified_at: '2026-09-01T10:00:00Z',
    is_demo: true,
    created_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 'contact-002',
    name: 'Ananya Raghavan',
    organization: 'WayCool Agritech Logistics',
    role: 'Head of Cold Chain Procurement',
    category: 'distributor',
    city: 'Bengaluru',
    industry_tags: ['Logistics', 'Supply Chain', 'B2B Retail', 'AgriTech'],
    capabilities: ['Bulk Farm Procurement', 'Kirana Store Replenishment', 'Cross-docking', 'Quality Grading'],
    service_area: 'Bengaluru Urban & Rural',
    website_url: 'https://waycool.in',
    description: 'Handles 400+ tons/day of fresh produce across South India with direct tie-ups to 12,000 retail endpoints.',
    source_name: 'AgriLogistics Summit 2026 Directory',
    source_url: 'https://waycool.in',
    verified: true,
    verification_status: 'directly_confirmed',
    verified_at: '2026-09-05T11:30:00Z',
    is_demo: true,
    created_at: '2026-09-05T11:30:00Z',
  },
  {
    id: 'contact-003',
    name: 'Dr. Bhavesh Shah',
    organization: 'Gujarat Agro Industries Corp (GAIC)',
    role: 'Chief General Manager',
    category: 'institution',
    city: 'Ahmedabad',
    industry_tags: ['Govt Nodal Agency', 'Subsidies', 'PMKSY', 'AgriTech'],
    capabilities: ['Cold Storage Subsidies', 'Terminal Market Access', 'Govt Grant Facilitation'],
    service_area: 'State of Gujarat',
    website_url: 'https://gaic.gujarat.gov.in',
    description: 'Nodal agency for cold storage capital subsidies in Gujarat and modernization loans.',
    source_name: 'Govt of Gujarat Portal',
    source_url: 'https://gaic.gujarat.gov.in',
    verified: true,
    verification_status: 'directly_confirmed',
    verified_at: '2026-09-10T14:00:00Z',
    is_demo: true,
    created_at: '2026-09-10T14:00:00Z',
  },
  {
    id: 'contact-004',
    name: 'Col. Rajesh Verma (Retd.)',
    organization: 'Malwa Agri Mentors Circle',
    role: 'Founder & Senior Advisor',
    category: 'mentor',
    city: 'Indore',
    industry_tags: ['Mandi Regulations', 'APMC', 'Agri Mentorship', 'Logistics'],
    capabilities: ['Mandi Board Compliance', 'APMC License Guidance', 'Distributor Introductions'],
    service_area: 'Malwa & Central India',
    website_url: null,
    description: '20+ years leading agri-supply chains; advisor to 6 central India FPOs on post-harvest handling.',
    source_name: 'TIE MP Charter Member Roster',
    source_url: null,
    verified: false,
    verification_status: 'unverified',
    verified_at: null,
    is_demo: true,
    created_at: '2026-09-15T09:00:00Z',
  },
  {
    id: 'contact-005',
    name: 'Kavita Menon',
    organization: 'Nature Basket Supermarkets',
    role: 'Regional Category Manager - Fresh',
    category: 'retailer',
    city: 'Bengaluru',
    industry_tags: ['Premium Retail', 'Organic Produce', 'D2C', 'Consumer Goods'],
    capabilities: ['Vendor Onboarding', 'Shelf-space Allocation', 'D2C Pilot Shelves', 'Weekly SKU Reconciliation'],
    service_area: 'Central & East Bengaluru (Indiranagar, Koramangala, Whitefield)',
    website_url: 'https://naturesbasket.co.in',
    description: 'Sourcing organic and export-grade vegetables for 32 retail stores in prime tech corridors.',
    source_name: 'LinkedIn Verified Recruiter',
    source_url: null,
    verified: true,
    verification_status: 'source_checked',
    verified_at: '2026-09-20T16:00:00Z',
    is_demo: true,
    created_at: '2026-09-20T16:00:00Z',
  },
  {
    id: 'contact-006',
    name: 'Ramesh Sundaram',
    organization: 'Deccan Express Cold Chains',
    role: 'Director of Operations',
    category: 'logistics',
    city: 'Bengaluru',
    industry_tags: ['AgriTech', 'Cold Storage', 'Logistics', 'Supply Chain'],
    capabilities: ['Multi-temperature Fleet', 'Dark Store Warehousing', 'Real-time Telemetry API', 'Last-Mile Courier'],
    service_area: 'Bengaluru & Karnataka Hubs',
    website_url: 'https://deccancoldchains.example.in',
    description: 'Refrigerated transport fleet with real-time temperature logs for pharmaceuticals and fresh horticultural produce.',
    source_name: 'Karnataka Cold Storage Association Registry 2026',
    source_url: 'https://karnatakacoldchains.org/members',
    verified: true,
    verification_status: 'directly_confirmed',
    verified_at: '2026-09-12T10:00:00Z',
    is_demo: true,
    created_at: '2026-09-12T10:00:00Z',
  },
  {
    id: 'contact-007',
    name: 'Deepak Deshmukh',
    organization: 'Maharashtra Precision Components',
    role: 'VP Supply Chain',
    category: 'supplier',
    city: 'Pune',
    industry_tags: ['Hardware', 'Manufacturing', 'IoT', 'AgriTech'],
    capabilities: ['Sheet Metal Enclosures', 'IP67 Waterproof Casings', 'Rapid Prototyping', 'ISO 9001 Batch Assembly'],
    service_area: 'Bhosari & Chakan Industrial Belt, Pune',
    website_url: 'https://mahaprecision.example.com',
    description: 'OEM metal fabrication and hardware chassis provider for harsh outdoor industrial and agricultural IoT sensors.',
    source_name: 'Chakan MIDC Industrial Directory 2026',
    source_url: 'https://chakanmidc.org/directory',
    verified: true,
    verification_status: 'directly_confirmed',
    verified_at: '2026-08-25T14:30:00Z',
    is_demo: true,
    created_at: '2026-08-25T14:30:00Z',
  },
  {
    id: 'contact-008',
    name: 'Adv. Neha Kulkarni',
    organization: 'Apex Legal & Regulatory Advisors',
    role: 'Managing Partner',
    category: 'service-provider',
    city: 'Pune',
    industry_tags: ['Legal', 'Regulatory', 'AgriTech', 'Compliance'],
    capabilities: ['APMC Mandi Licensing', 'FSSAI Approvals', 'Vendor Contract Drafting', 'IP Protection'],
    service_area: 'Pan-Maharashtra',
    website_url: 'https://apexlegalpune.example.com',
    description: 'Advises early and growth stage B2B startups on state agricultural marketing laws, mandi cesses, and supplier contracts.',
    source_name: 'Bar Council of Maharashtra Registry',
    source_url: null,
    verified: true,
    verification_status: 'source_checked',
    verified_at: '2026-09-18T09:00:00Z',
    is_demo: true,
    created_at: '2026-09-18T09:00:00Z',
  },
  {
    id: 'contact-009',
    name: 'Vikram Singhania',
    organization: 'Apex B2B Mart & Wholesalers',
    role: 'General Manager',
    category: 'distributor',
    city: 'Mumbai',
    industry_tags: ['FMCG', 'Consumer Goods', 'Retail', 'B2B'],
    capabilities: ['Kirana Network Distribution', 'Wholesale Credit Financing', 'Cash-and-Carry Distribution'],
    service_area: 'Mumbai Metropolitan Region & Navi Mumbai',
    website_url: 'https://apexb2bmart.example.com',
    description: 'Wholesale aggregator supplying 2,500+ general trade grocery outlets with weekly replenishment routes.',
    source_name: 'Trade Directory MMR 2026',
    source_url: null,
    verified: false,
    verification_status: 'unverified',
    verified_at: null,
    is_demo: true,
    created_at: '2026-09-02T10:00:00Z',
  },
  {
    id: 'contact-010',
    name: 'K. Tarun Reddy',
    organization: 'T-Hub Ecosystem Partnerships',
    role: 'Director of Corporate Innovation',
    category: 'institution',
    city: 'Hyderabad',
    industry_tags: ['General', 'DeepTech', 'B2B', 'SaaS', 'AgriTech'],
    capabilities: ['Corporate Pilot Brokering', 'State Govt Sandbox Access', 'Investor Showcases', 'Mentor Matching'],
    service_area: 'Telangana & Pan-South India',
    website_url: 'https://t-hub.co',
    description: 'Connects startups with enterprise pilots, state procurement sandboxes, and corporate testing facilities.',
    source_name: 'T-Hub Official Website',
    source_url: 'https://t-hub.co',
    verified: true,
    verification_status: 'directly_confirmed',
    verified_at: '2026-09-02T15:00:00Z',
    is_demo: true,
    created_at: '2026-09-02T15:00:00Z',
  },
  {
    id: 'contact-011',
    name: 'Dr. Aruna Shenoy',
    organization: 'Metro Mumbai Healthcare Collective',
    role: 'Chief Procurement Officer',
    category: 'pilot-customer',
    city: 'Mumbai',
    industry_tags: ['HealthTech', 'Diagnostics', 'Biotech', 'Hospitality'],
    capabilities: ['Hospital Pilot Trials', 'Bulk Diagnostic Supply Procurement', 'Clinical Evidence Evaluation'],
    service_area: 'Greater Mumbai & Thane',
    website_url: 'https://mumbaihealthcarecol.example.org',
    description: 'Consortium of 14 hospitals and diagnostics centres piloting innovative health and supply chain monitoring tools.',
    source_name: 'Public Hospital Consortium Listing',
    source_url: 'https://mumbaihealthcarecol.example.org',
    verified: true,
    verification_status: 'source_checked',
    verified_at: '2026-09-28T11:00:00Z',
    is_demo: true,
    created_at: '2026-09-28T11:00:00Z',
  },
  {
    id: 'contact-012',
    name: 'Gaurav Bhasin',
    organization: 'NCR Angels & Enterprise Mentors',
    role: 'Venture Partner',
    category: 'mentor',
    city: 'Delhi-NCR',
    industry_tags: ['B2B', 'SaaS', 'Enterprise Sales', 'Fintech'],
    capabilities: ['Enterprise Deal Structuring', 'Procurement Navigating', 'Pricing Strategy', 'Series-A Advisory'],
    service_area: 'Gurugram & South Delhi',
    website_url: 'https://ncrangels.example.com',
    description: 'Advises early-stage founders on navigating corporate procurement cycles, enterprise pilot pricing, and SaaS contracts.',
    source_name: 'NCR Angels Network',
    source_url: null,
    verified: true,
    verification_status: 'directly_confirmed',
    verified_at: '2026-09-10T12:00:00Z',
    is_demo: true,
    created_at: '2026-09-10T12:00:00Z',
  },
]

// ─────────────────────────────────────────────────────────────
// Demo User Object (for Topbar & Auth fallback)
// ─────────────────────────────────────────────────────────────
export const DEMO_USER = {
  id: 'demo-user-001',
  email: 'founder@kavachagri.in',
  user_metadata: {
    name: 'Vivek Sharma',
    startup_name: 'Kavach AgriTech',
    role: 'Founder & CEO',
  },
}

