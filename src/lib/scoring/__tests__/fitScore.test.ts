import {
  computeFitScore,
  evaluateCityCriteria,
  computeEvidenceCoverage,
  SCORING_MODEL_VERSION,
} from '../fitScore'
import type { MarketIndicator } from '@/types/database'

/**
 * Phase 5: Deterministic Fit Score Engine Unit Tests
 */
export function runFitScoreTests() {
  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`)
      passed++
    } else {
      console.error(`  ✗ ${testName}${detail ? `: ${detail}` : ''}`)
      failed++
    }
  }

  console.log('\n--- Running Fit Score Engine Tests (Version: ' + SCORING_MODEL_VERSION + ') ---')

  // 1. Scoring model version check
  assert(SCORING_MODEL_VERSION === 'v1.0.0', 'Scoring model version is v1.0.0')

  // 2. Deterministic reproducibility
  const sampleCriteria = [
    { name: 'Demand Fit', weight: 25, score: 8.5, is_available: true },
    { name: 'Competitive Opportunity', weight: 20, score: 6.0, is_available: true },
    { name: 'Distribution Feasibility', weight: 20, score: 8.0, is_available: true },
    { name: 'Entry Cost & Unit Economics', weight: 20, score: 7.0, is_available: true },
    { name: 'Operational Feasibility & Talent', weight: 15, score: 9.0, is_available: true },
  ]
  const run1 = computeFitScore({ criteria: sampleCriteria })
  const run2 = computeFitScore({ criteria: sampleCriteria })
  assert(
    run1.total_score !== null && run1.total_score === run2.total_score,
    'Identical inputs produce identical scores (Reproducibility)',
    `Run 1: ${run1.total_score}, Run 2: ${run2.total_score}`
  )
  assert(
    run1.scoring_model_version === 'v1.0.0',
    'Returned scoring model version is v1.0.0'
  )

  // 3. Weight normalization & calculation correctness
  // Weighted sum: 8.5*25 + 6.0*20 + 8.0*20 + 7.0*20 + 9.0*15 = 212.5 + 120 + 160 + 140 + 135 = 767.5
  // Total weight: 100
  // Normalized score: (767.5 / 100) * 10 = 76.75
  assert(
    run1.total_score === 76.75,
    'Weighted score mathematically matches expected formula (76.75)',
    `Expected 76.75, got ${run1.total_score}`
  )
  assert(run1.evidence_coverage === 100, 'Full criteria set produces 100% evidence coverage')
  assert(run1.insufficient_data === false, 'Full criteria set does not flag insufficient data')

  // 4. Weight clamping (negative or >100 weights clamped safely)
  const clampedCriteria = [
    { name: 'Demand Fit', weight: -10, score: 8.0, is_available: true }, // clamps to 0
    { name: 'Competitive Opportunity', weight: 150, score: 6.0, is_available: true }, // clamps to 100
    { name: 'Distribution Feasibility', weight: 50, score: 8.0, is_available: true },
  ]
  const clampedRun = computeFitScore({ criteria: clampedCriteria })
  // Total weight: 0 + 100 + 50 = 150
  // Weighted sum: 6.0*100 + 8.0*50 = 600 + 400 = 1000
  // Score: (1000 / 150) * 10 = 66.67
  assert(
    clampedRun.total_score === 66.67,
    'Weights clamped between 0 and 100 correctly',
    `Expected 66.67, got ${clampedRun.total_score}`
  )

  // 5. Missing indicator handling: Missing criterion must NOT be treated as 0 or average
  // When a criterion is missing, it should be excluded from the denominator.
  // 4 criteria available:
  // Demand (25): 8.0 -> 200
  // Distribution (20): 8.0 -> 160
  // Entry Cost (20): 7.0 -> 140
  // Operational (15): 9.0 -> 135
  // Competitive (20): MISSING
  // Eligible weight sum: 25 + 20 + 20 + 15 = 80
  // Weighted sum: 200 + 160 + 140 + 135 = 635
  // Score: (635 / 80) * 10 = 79.38
  const missingOne = [
    { name: 'Demand Fit', weight: 25, score: 8.0, is_available: true },
    { name: 'Competitive Opportunity', weight: 20, score: null, is_available: false },
    { name: 'Distribution Feasibility', weight: 20, score: 8.0, is_available: true },
    { name: 'Entry Cost & Unit Economics', weight: 20, score: 7.0, is_available: true },
    { name: 'Operational Feasibility & Talent', weight: 15, score: 9.0, is_available: true },
  ]
  const missingRun = computeFitScore({ criteria: missingOne })
  assert(
    missingRun.total_score === 79.38,
    'Missing criterion excluded from denominator instead of treated as 0',
    `Expected 79.38, got ${missingRun.total_score}`
  )
  assert(
    missingRun.missing_criteria.includes('Competitive Opportunity'),
    'Missing criterion tracked in missing_criteria array'
  )
  assert(
    missingRun.evidence_coverage === 80.0,
    'Evidence coverage correctly reports 80% (4 of 5 criteria)',
    `Expected 80.0, got ${missingRun.evidence_coverage}`
  )
  assert(
    missingRun.insufficient_data === false,
    '4 criteria and 80% weight remains sufficient data'
  )

  // 6. Minimum evidence requirements (<50% weight or <3 criteria triggers insufficient_data)
  const sparseCriteria = [
    { name: 'Demand Fit', weight: 25, score: 8.0, is_available: true },
    { name: 'Competitive Opportunity', weight: 20, score: null, is_available: false },
    { name: 'Distribution Feasibility', weight: 20, score: null, is_available: false },
    { name: 'Entry Cost & Unit Economics', weight: 20, score: null, is_available: false },
    { name: 'Operational Feasibility & Talent', weight: 15, score: null, is_available: false },
  ]
  const sparseRun = computeFitScore({ criteria: sparseCriteria })
  assert(
    sparseRun.insufficient_data === true,
    'Triggers insufficient_data when only 1 criterion is available'
  )
  assert(
    sparseRun.total_score === null,
    'Returns null total_score when data is insufficient (no false confidence)'
  )
  assert(
    sparseRun.evidence_coverage === 20.0,
    'Evidence coverage correctly reports 20%'
  )

  // 7. Directionality: Entry Cost (lower rent produces higher score)
  const mockIndicatorsHighRent: MarketIndicator[] = [
    {
      id: '1',
      comparison_id: 'comp-1',
      city: 'Metro-Expensive',
      indicator: 'Commercial Office Rent Benchmark',
      value: '180 - 250',
      unit: 'INR / sq.ft / Month',
      source_name: 'JLL',
      source_url: 'https://jll.co.in',
      collected_at: '2024-01-01',
      confidence: 'high',
      notes: null,
      created_at: '2024-01-01',
    },
  ]
  const mockIndicatorsLowRent: MarketIndicator[] = [
    {
      id: '2',
      comparison_id: 'comp-1',
      city: 'Metro-Affordable',
      indicator: 'Commercial Office Rent Benchmark',
      value: '55 - 75',
      unit: 'INR / sq.ft / Month',
      source_name: 'CBRE',
      source_url: 'https://cbre.co.in',
      collected_at: '2024-01-01',
      confidence: 'high',
      notes: null,
      created_at: '2024-01-01',
    },
  ]
  const evalHighRent = evaluateCityCriteria('Metro-Expensive', mockIndicatorsHighRent)
  const evalLowRent = evaluateCityCriteria('Metro-Affordable', mockIndicatorsLowRent)
  const highRentScore = evalHighRent.find((c) => c.name === 'Entry Cost & Unit Economics')?.score || 0
  const lowRentScore = evalLowRent.find((c) => c.name === 'Entry Cost & Unit Economics')?.score || 0
  assert(
    lowRentScore > highRentScore,
    'Entry Cost directionality: Lower commercial rent scores higher than expensive rent',
    `Affordable rent score: ${lowRentScore}, Expensive rent score: ${highRentScore}`
  )

  // 8. Directionality: Competitive Opportunity (High startup saturation produces lower score)
  const mockIndicatorsSaturated: MarketIndicator[] = [
    {
      id: '3',
      comparison_id: 'comp-1',
      city: 'Metro-Crowded',
      indicator: 'Recognized Startups',
      value: '15,000+',
      unit: 'DPIIT Entities',
      source_name: 'DPIIT',
      source_url: 'https://startupindia.gov.in',
      collected_at: '2024-01-01',
      confidence: 'high',
      notes: null,
      created_at: '2024-01-01',
    },
  ]
  const mockIndicatorsEmerging: MarketIndicator[] = [
    {
      id: '4',
      comparison_id: 'comp-1',
      city: 'Metro-Emerging',
      indicator: 'Recognized Startups',
      value: '3,200',
      unit: 'DPIIT Entities',
      source_name: 'DPIIT',
      source_url: 'https://startupindia.gov.in',
      collected_at: '2024-01-01',
      confidence: 'high',
      notes: null,
      created_at: '2024-01-01',
    },
  ]
  const evalSaturated = evaluateCityCriteria('Metro-Crowded', mockIndicatorsSaturated)
  const evalEmerging = evaluateCityCriteria('Metro-Emerging', mockIndicatorsEmerging)
  const saturatedScore = evalSaturated.find((c) => c.name === 'Competitive Opportunity')?.score || 0
  const emergingScore = evalEmerging.find((c) => c.name === 'Competitive Opportunity')?.score || 0
  assert(
    emergingScore > saturatedScore,
    'Competitive Opportunity directionality: Emerging market has higher opportunity score than saturated incumbent market',
    `Emerging score: ${emergingScore}, Saturated score: ${saturatedScore}`
  )

  // 9. Separate Evidence Coverage breakdown
  const coverageData = computeEvidenceCoverage(
    [
      { name: 'Demand Fit', weight: 25, score: 8.0, is_available: true },
      { name: 'Competitive Opportunity', weight: 20, score: null, is_available: false },
    ],
    [
      {
        id: '5',
        comparison_id: 'comp-1',
        city: 'Bengaluru',
        indicator: 'Metro Population',
        value: '13.6',
        unit: 'Million',
        source_name: 'MoHUA',
        source_url: 'https://mohua.gov.in',
        collected_at: '2024-01-01',
        confidence: 'high',
        is_simulated: false,
        notes: null,
        created_at: '2024-01-01',
      },
      {
        id: '6',
        comparison_id: 'comp-1',
        city: 'Bengaluru',
        indicator: 'Simulated Benchmark Indicator',
        value: '100',
        unit: 'index',
        source_name: 'Demo Benchmark',
        source_url: null,
        collected_at: '2024-01-01',
        confidence: 'medium',
        is_simulated: true,
        notes: 'Simulated benchmark for test',
        created_at: '2024-01-01',
      },
    ]
  )
  assert(coverageData.coveragePercentage === 50.0, 'Coverage percentage is 50%')
  assert(coverageData.verifiedCount === 1, 'Correct verified indicator count (1)')
  assert(coverageData.simulatedCount === 1, 'Correct simulated indicator count (1)')
  assert(
    coverageData.limitations.some((l) => l.includes('benchmark/simulated')),
    'Simulated indicators are explicitly flagged in limitations'
  )

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`)
  if (failed > 0) {
    process.exit(1)
  }
}

// Golden Characterization Test - Baseline Scores for Sample Cities
export function runGoldenCharacterizationTest() {
  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`)
      passed++
    } else {
      console.error(`  ✗ ${testName}${detail ? `: ${detail}` : ''}`)
      failed++
    }
  }

  console.log('\n--- Running Golden Characterization Test (Baseline Scores) ---')

  // Test with actual benchmark data from cityData.ts for Bengaluru
  const bengaluruIndicators: MarketIndicator[] = [
    {
      id: 'blr-1',
      comparison_id: 'golden',
      city: 'Bengaluru',
      indicator: 'Metro Population',
      value: '13.6',
      unit: 'Million',
      source_name: 'MoHUA',
      source_url: 'https://mohua.gov.in',
      collected_at: '2024-01-15',
      confidence: 'high',
      notes: null,
      created_at: '2024-01-15',
    },
    {
      id: 'blr-2',
      comparison_id: 'golden',
      city: 'Bengaluru',
      indicator: 'Per Capita Income',
      value: '3,32,000',
      unit: 'INR / Year',
      source_name: 'Karnataka Economic Survey',
      source_url: 'https://des.karnataka.gov.in',
      collected_at: '2024-03-01',
      confidence: 'high',
      notes: null,
      created_at: '2024-03-01',
    },
    {
      id: 'blr-3',
      comparison_id: 'golden',
      city: 'Bengaluru',
      indicator: 'UPI Digital Transaction Density',
      value: '842',
      unit: 'Transactions / Capita / Yr',
      source_name: 'NPCI',
      source_url: 'https://npci.org.in',
      collected_at: '2024-06-30',
      confidence: 'high',
      notes: null,
      created_at: '2024-06-30',
    },
    {
      id: 'blr-4',
      comparison_id: 'golden',
      city: 'Bengaluru',
      indicator: 'Recognized Startups',
      value: '14,800+',
      unit: 'DPIIT Entities',
      source_name: 'DPIIT',
      source_url: 'https://startupindia.gov.in',
      collected_at: '2024-05-10',
      confidence: 'high',
      notes: null,
      created_at: '2024-05-10',
    },
    {
      id: 'blr-5',
      comparison_id: 'golden',
      city: 'Bengaluru',
      indicator: 'Modern Trade / Supermarket Density',
      value: '18.4',
      unit: 'Outlets per 100k Population',
      source_name: 'RAI',
      source_url: 'https://rai.net.in',
      collected_at: '2023-11-20',
      confidence: 'medium',
      notes: null,
      created_at: '2023-11-20',
    },
    {
      id: 'blr-6',
      comparison_id: 'golden',
      city: 'Bengaluru',
      indicator: 'Commercial Office Rent Benchmark',
      value: '85 - 110',
      unit: 'INR / sq.ft / Month',
      source_name: 'JLL',
      source_url: 'https://jll.co.in',
      collected_at: '2024-02-15',
      confidence: 'medium',
      notes: null,
      created_at: '2024-02-15',
    },
  ]

  const bengaluruCriteria = evaluateCityCriteria('Bengaluru', bengaluruIndicators)
  const bengaluruScore = computeFitScore({ criteria: bengaluruCriteria })

  // Golden baseline values - these must remain unchanged after refactor
  // Actual computed score from current scorer: 76.45
  // This is the authoritative baseline value to preserve

  assert(
    bengaluruScore.total_score === 76.45,
    'Bengaluru baseline score matches golden value (76.45)',
    `Got ${bengaluruScore.total_score}`
  )
  assert(
    bengaluruScore.evidence_coverage === 100,
    'Bengaluru has 100% evidence coverage'
  )
  assert(
    bengaluruScore.insufficient_data === false,
    'Bengaluru has sufficient data'
  )

  // Test tie-breaking behavior (will be implemented in refactor)
  // For now, verify that identical inputs produce identical outputs
  const duplicateRun = computeFitScore({ criteria: bengaluruCriteria })
  assert(
    duplicateRun.total_score === bengaluruScore.total_score,
    'Deterministic reproducibility maintained'
  )

  console.log(`\nGolden Characterization: ${passed} passed, ${failed} failed.\n`)
  if (failed > 0) {
    process.exit(1)
  }
}

// Run immediately if invoked as main script
runFitScoreTests()
runGoldenCharacterizationTest()
