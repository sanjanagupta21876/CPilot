// ─────────────────────────────────────────────────────────────
// Database row types — mirrors the Supabase schema exactly.
// Keep in sync with supabase/migrations/0001_initial_schema.sql
// ─────────────────────────────────────────────────────────────

export type StartupStage = 'idea' | 'pre-seed' | 'seed' | 'series-a'
export type ComparisonStatus = 'draft' | 'analyzing' | 'complete' | 'error'
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unverified'
export type ContactCategory =
  | 'retailer'
  | 'distributor'
  | 'mentor'
  | 'institution'
  | 'supplier'
  | 'pilot-customer'
  | 'logistics'
  | 'service-provider'
export type VerificationStatus = 'unverified' | 'source_checked' | 'directly_confirmed'
export type IntroductionStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'withdrawn'
  | 'cancelled'
  | 'completed'
export type HypothesisStatus =
  | 'untested'
  | 'testing'
  | 'supported'
  | 'challenged'
  | 'inconclusive'
export type ExperimentMethod =
  | 'interview'
  | 'survey'
  | 'retailer-outreach'
  | 'distributor-outreach'
  | 'landing-page'
  | 'pilot'
  | 'paid-trial'
  | 'other'
export type ExperimentStatus =
  | 'draft'
  | 'planned'
  | 'active'
  | 'running'
  | 'complete'
  | 'completed'
  | 'cancelled'
export type ThresholdOperator = '>=' | '>' | '<=' | '<' | '='
export type ThresholdUnit = '%' | 'count' | 'INR' | 'ratio'
export type OutcomeInterpretation =
  | 'threshold_met'
  | 'threshold_not_met'
  | 'insufficient_sample'
  | 'inconclusive'
  | 'not_evaluated'
export type SignalTier =
  | 'reported_interest'
  | 'qualified_lead'
  | 'signup'
  | 'paid_order'
  | 'repeat_purchase'
  | 'objection'
export type ResponseType =
  | 'interview'
  | 'survey-submission'
  | 'observation'
  | 'purchase'
  | 'signup'
  | 'lead'
  | 'inquiry'
export type OutcomeType = 'positive' | 'negative' | 'neutral' | 'inconclusive'
export type AssumptionSourceType = 'city-intelligence' | 'manual' | 'llm-synthesis'
export type AssumptionStatus = 'untested' | 'supported' | 'challenged' | 'invalidated'
export type EvidenceDirection = 'supports' | 'challenges' | 'neutral'

// ─── Tables ───────────────────────────────────────────────────

export type CityRecord = {
  id: string
  name: string
  state: string
  tier: string
  is_active: boolean
  created_at: string
}

export type StartupProfile = {
  id: string
  user_id: string
  name: string
  industry: string
  stage: StartupStage
  target_customer: string
  product_desc: string
  business_description?: string | null
  current_city?: string | null
  price_min?: number | null
  price_max?: number | null
  primary_channel?: string | null
  website_url?: string | null
  product_category?: string | null
  target_geography?: string | null
  expansion_cities?: string[]
  traction_summary?: string | null
  expansion_context?: string | null
  created_at: string
  updated_at: string
}

export type CityComparison = {
  id: string
  user_id: string
  startup_id?: string | null
  title: string
  cities: string[]
  status: ComparisonStatus
  scoring_model_version?: string
  created_at: string
  updated_at: string
}

export type MarketIndicator = {
  id: string
  comparison_id: string
  city: string
  indicator: string
  value: string
  unit: string | null
  source_name: string
  source_url: string | null
  collected_at: string | null
  confidence: ConfidenceLevel
  notes: string | null
  geographic_scope?: string | null
  data_period?: string | null
  is_simulated?: boolean
  created_at: string
}

export type Competitor = {
  id: string
  city: string
  name: string
  category: string
  offering: string
  observed_price: number | null
  price_unit: string | null
  currency: string
  source_url: string | null
  observed_date: string | null
  notes: string | null
  is_simulated: boolean
  created_at: string
}

export type FitScoreCriterion = {
  name: string
  weight: number
  score: number
  rationale: string
}

export type FitScore = {
  id: string
  comparison_id: string
  city: string
  criteria: FitScoreCriterion[]
  total_score: number
  max_score: number
  scoring_model_version?: string
  evidence_coverage?: number
  missing_criteria?: string[]
  insufficient_data?: boolean
  computed_at: string
}

export type Contact = {
  id: string
  city: string
  name: string
  organization: string | null
  role: string | null
  category: ContactCategory
  industry_tags: string[]
  capabilities?: string[]
  service_area?: string | null
  description: string | null
  website_url?: string | null
  source_name: string
  source_url: string | null
  verified: boolean
  verified_at: string | null
  verification_status: VerificationStatus
  is_demo: boolean
  created_at: string
  updated_at?: string
}

export type IntroductionRequest = {
  id: string
  user_id: string
  contact_id: string
  startup_id?: string | null
  purpose?: string | null
  business_context?: string | null
  desired_outcome?: string | null
  message: string
  status: IntroductionStatus
  match_reason: string
  responded_at?: string | null
  response_note?: string | null
  recipient_id?: string | null
  created_at: string
  updated_at: string
  contact?: Contact
}

export type Hypothesis = {
  id: string
  user_id: string
  startup_id?: string | null
  city: string
  statement: string
  target_audience: string
  problem_statement: string
  expected_behavior: string
  strategic_rationale?: string | null
  status: HypothesisStatus
  comparison_id?: string | null
  is_demo?: boolean
  created_at: string
  updated_at: string
}

export type Experiment = {
  id: string
  user_id: string
  startup_id?: string | null
  hypothesis_id?: string | null
  comparison_id?: string | null
  title: string
  hypothesis: string
  objective?: string | null
  method: ExperimentMethod
  city: string
  target_audience?: string | null
  sample_size_target?: number
  start_date?: string | null
  end_date?: string | null
  target_metric: string
  success_threshold: string
  threshold_metric?: string
  threshold_operator?: ThresholdOperator
  threshold_target?: number
  threshold_unit?: ThresholdUnit
  threshold_min_sample?: number
  threshold_rationale?: string | null
  status: ExperimentStatus
  outcome_interpretation?: OutcomeInterpretation
  notes?: string | null
  is_demo?: boolean
  started_at?: string | null
  completed_at?: string | null
  created_at: string
  updated_at: string
  hypothesis_rel?: Hypothesis | null
}

export type ExperimentResponse = {
  id: string
  experiment_id: string
  user_id?: string
  respondent_label: string
  response_type: ResponseType
  outcome: OutcomeType
  signal_tier?: SignalTier
  units_count?: number
  financial_value?: number | null
  notes?: string | null
  evidence_url?: string | null
  rejection_reason?: string | null
  recorded_at: string
}

export type ThresholdHistory = {
  id: string
  experiment_id: string
  user_id: string
  previous_threshold: string
  new_threshold: string
  change_reason?: string | null
  changed_at: string
}

export type Assumption = {
  id: string
  user_id: string
  comparison_id: string | null
  statement: string
  source_type: AssumptionSourceType
  status: AssumptionStatus
  created_at: string
  updated_at: string
}

export type AssumptionEvidence = {
  id: string
  assumption_id: string
  experiment_id: string | null
  indicator_id: string | null
  direction: EvidenceDirection
  notes: string | null
  linked_at: string
}

// ─── Phase 8: Market Proof Loop ───────────────────────────────

export type ProofEventType =
  | 'assessment_created'
  | 'assessment_refreshed'
  | 'hypothesis_created'
  | 'hypothesis_status_changed'
  | 'intro_request_created'
  | 'intro_request_updated'
  | 'experiment_started'
  | 'experiment_completed'
  | 'response_recorded'
  | 'evidence_linked'

export type HypothesisIntroLink = {
  id: string
  hypothesis_id: string
  intro_request_id: string
  user_id: string
  created_at: string
}

export type ProofEvent = {
  id: string
  user_id: string
  hypothesis_id: string | null
  startup_id: string | null
  city: string | null
  event_type: ProofEventType
  event_label: string
  related_record_type: string | null
  related_record_id: string | null
  metadata: Record<string, unknown>
  occurred_at: string
}

// ─── Supabase Database type ───────────────────────────────────
// Defined as type alias so all Row types satisfy Record<string, unknown>
export type Database = {
  public: {
    Tables: {
      cities: {
        Row: CityRecord
        Insert: Omit<CityRecord, 'id' | 'created_at'> & {
          tier?: string
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Omit<CityRecord, 'id' | 'created_at'>>
        Relationships: []
      }
      startup_profiles: {
        Row: StartupProfile
        Insert: Omit<StartupProfile, 'id' | 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<StartupProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      city_comparisons: {
        Row: CityComparison
        Insert: Omit<CityComparison, 'id' | 'created_at' | 'updated_at'> & {
          startup_id?: string | null
          status?: ComparisonStatus
          scoring_model_version?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<CityComparison, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      market_indicators: {
        Row: MarketIndicator
        Insert: Omit<MarketIndicator, 'id' | 'created_at' | 'unit' | 'source_url' | 'collected_at' | 'notes'> & {
          unit?: string | null
          source_url?: string | null
          collected_at?: string | null
          confidence?: ConfidenceLevel
          notes?: string | null
          geographic_scope?: string | null
          data_period?: string | null
          is_simulated?: boolean
          created_at?: string
        }
        Update: Partial<Omit<MarketIndicator, 'id' | 'created_at'>>
        Relationships: []
      }
      competitors: {
        Row: Competitor
        Insert: Omit<Competitor, 'id' | 'created_at'> & {
          observed_price?: number | null
          price_unit?: string | null
          currency?: string
          source_url?: string | null
          observed_date?: string | null
          notes?: string | null
          is_simulated?: boolean
          created_at?: string
        }
        Update: Partial<Omit<Competitor, 'id' | 'created_at'>>
        Relationships: []
      }
      fit_scores: {
        Row: FitScore
        Insert: Omit<FitScore, 'id' | 'computed_at'> & {
          scoring_model_version?: string
          evidence_coverage?: number
          missing_criteria?: string[]
          insufficient_data?: boolean
          computed_at?: string
        }
        Update: Partial<Omit<FitScore, 'id'>>
        Relationships: []
      }
      contacts: {
        Row: Contact
        Insert: Omit<Contact, 'id' | 'created_at' | 'organization' | 'role' | 'description' | 'source_url' | 'verified_at' | 'verification_status'> & {
          organization?: string | null
          role?: string | null
          capabilities?: string[]
          service_area?: string | null
          description?: string | null
          website_url?: string | null
          source_url?: string | null
          verified?: boolean
          verified_at?: string | null
          verification_status?: VerificationStatus
          is_demo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Contact, 'id' | 'created_at'>>
        Relationships: []
      }
      local_resources: {
        Row: Contact
        Insert: never
        Update: never
        Relationships: []
      }
      introduction_requests: {
        Row: IntroductionRequest
        Insert: Omit<IntroductionRequest, 'id' | 'created_at' | 'updated_at' | 'contact' | 'status'> & {
          startup_id?: string | null
          purpose?: string | null
          business_context?: string | null
          desired_outcome?: string | null
          status?: IntroductionStatus
          responded_at?: string | null
          response_note?: string | null
          recipient_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<IntroductionRequest, 'id' | 'user_id' | 'contact'>>
        Relationships: []
      }
      hypotheses: {
        Row: Hypothesis
        Insert: Omit<Hypothesis, 'id' | 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Hypothesis, 'id' | 'user_id' | 'created_at'>>
        Relationships: []
      }
      experiments: {
        Row: Experiment
        Insert: Omit<Experiment, 'id' | 'created_at' | 'updated_at' | 'comparison_id' | 'started_at' | 'completed_at' | 'status' | 'hypothesis_rel'> & {
          comparison_id?: string | null
          status?: ExperimentStatus
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Experiment, 'id' | 'user_id' | 'created_at' | 'hypothesis_rel'>>
        Relationships: []
      }
      experiment_responses: {
        Row: ExperimentResponse
        Insert: Omit<ExperimentResponse, 'id' | 'recorded_at' | 'notes' | 'evidence_url'> & {
          notes?: string | null
          evidence_url?: string | null
          recorded_at?: string
        }
        Update: Partial<Omit<ExperimentResponse, 'id'>>
        Relationships: []
      }
      threshold_history: {
        Row: ThresholdHistory
        Insert: Omit<ThresholdHistory, 'id' | 'changed_at'> & {
          changed_at?: string
        }
        Update: Partial<Omit<ThresholdHistory, 'id' | 'experiment_id' | 'user_id' | 'changed_at'>>
        Relationships: []
      }
      assumptions: {
        Row: Assumption
        Insert: Omit<Assumption, 'id' | 'created_at' | 'updated_at' | 'comparison_id' | 'status' | 'source_type'> & {
          comparison_id?: string | null
          source_type?: AssumptionSourceType
          status?: AssumptionStatus
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Assumption, 'id' | 'user_id' | 'created_at'>>
        Relationships: []
      }
      assumption_evidence: {
        Row: AssumptionEvidence
        Insert: Omit<AssumptionEvidence, 'id' | 'linked_at' | 'experiment_id' | 'indicator_id' | 'notes'> & {
          experiment_id?: string | null
          indicator_id?: string | null
          notes?: string | null
          linked_at?: string
        }
        Update: Partial<Omit<AssumptionEvidence, 'id'>>
        Relationships: []
      }
      hypothesis_intro_links: {
        Row: HypothesisIntroLink
        Insert: Omit<HypothesisIntroLink, 'id' | 'created_at'> & {
          created_at?: string
        }
        Update: never
        Relationships: []
      }
      proof_events: {
        Row: ProofEvent
        Insert: Omit<ProofEvent, 'id' | 'occurred_at'> & {
          occurred_at?: string
        }
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
