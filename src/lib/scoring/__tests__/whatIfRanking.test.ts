import {
  computeWhatIfRanking,
  validateWeightField,
  validateWeightsObject,
  PRESET_PROFILES,
  type CityWhatIfInput,
} from '../whatIfScoring'
import { DEFAULT_WEIGHTS, evaluateCityCriteria, computeFitScore } from '../fitScore'
import { BENCHMARK_INDICATORS } from '../../data/cityData'
import type { MarketIndicator } from '@/types/database'

/**
 * Phase 2: What-If Ranking & Driver Explanation Automated Tests
 */
export function runWhatIfRankingTests() {
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

  console.log('\n--- Running What-If Ranking & Explanations Tests (Phase 2) ---')

  // Setup standard fixture using benchmark data
  const bengaluruCriteria = evaluateCityCriteria('Bengaluru', BENCHMARK_INDICATORS as unknown as MarketIndicator[], [])
  const mumbaiCriteria = evaluateCityCriteria('Mumbai', BENCHMARK_INDICATORS as unknown as MarketIndicator[], [])

  const standardFixture: CityWhatIfInput[] = [
    { city: 'Bengaluru', criteria: bengaluruCriteria },
    { city: 'Mumbai', criteria: mumbaiCriteria },
  ]

  // ─────────────────────────────────────────────────────────────
  // Test 1: (Requirement 10d) Default weights reproduce golden baseline exactly
  // ─────────────────────────────────────────────────────────────
  const baselineOutput = computeWhatIfRanking(standardFixture, DEFAULT_WEIGHTS, DEFAULT_WEIGHTS)
  const blrBase = baselineOutput.results.find((r) => r.city === 'Bengaluru')!
  const bomBase = baselineOutput.results.find((r) => r.city === 'Mumbai')!

  assert(
    blrBase.previousScore === 76.45 && blrBase.newScore === 76.45,
    'Default weights reproduce Bengaluru golden baseline exactly (76.45)',
    `Got ${blrBase.newScore}`
  )
  assert(
    bomBase.previousScore === 76.10 && bomBase.newScore === 76.10,
    'Default weights reproduce Mumbai golden baseline exactly (76.10)',
    `Got ${bomBase.newScore}`
  )
  assert(
    blrBase.newRank === 1 && bomBase.newRank === 2,
    'Baseline ranks maintain Bengaluru #1, Mumbai #2'
  )
  assert(
    blrBase.rankMovementLabel === 'No change' && bomBase.rankMovementLabel === 'No change',
    'Baseline ranks show "No change"'
  )
  assert(
    blrBase.mainDriver === 'No change' && bomBase.mainDriver === 'No change',
    'Baseline driver shows "No change" when no movement occurred'
  )

  // ─────────────────────────────────────────────────────────────
  // Test 2: (Requirement 10a) Raising Demand Fit weight causes expected rank change & matches hand-calculated scores to 2 decimals
  // Hand-calc:
  // Demand Fit weight raised to 50:
  // Total weight = 50 + 20 + 20 + 20 + 15 = 125
  // Mumbai: (9.1*50 + 5.8*20 + 9.4*20 + 4.8*20 + 8.9*15) = 455 + 116 + 188 + 96 + 133.5 = 988.5
  // Mumbai score: (988.5 / 125) * 10 = 79.08
  // Bengaluru: (8.5*50 + 5.2*20 + 8.6*20 + 6.6*20 + 9.6*15) = 425 + 104 + 172 + 132 + 144 = 977.0
  // Bengaluru score: (977.0 / 125) * 10 = 78.16
  // ─────────────────────────────────────────────────────────────
  const demandRaisedWeights = {
    ...DEFAULT_WEIGHTS,
    'Demand Fit': 50,
  }
  const demandRaisedOutput = computeWhatIfRanking(standardFixture, demandRaisedWeights, DEFAULT_WEIGHTS)
  const blrDemand = demandRaisedOutput.results.find((r) => r.city === 'Bengaluru')!
  const bomDemand = demandRaisedOutput.results.find((r) => r.city === 'Mumbai')!

  assert(
    bomDemand.newScore === 79.08,
    'Mumbai hand-calculated score matches 79.08 to 2 decimals',
    `Expected 79.08, got ${bomDemand.newScore}`
  )
  assert(
    blrDemand.newScore === 78.16,
    'Bengaluru hand-calculated score matches 78.16 to 2 decimals',
    `Expected 78.16, got ${blrDemand.newScore}`
  )
  assert(
    bomDemand.newRank === 1 && bomDemand.previousRank === 2,
    'Mumbai moved from rank #2 to rank #1'
  )
  assert(
    blrDemand.newRank === 2 && blrDemand.previousRank === 1,
    'Bengaluru moved from rank #1 to rank #2'
  )
  assert(
    bomDemand.rankMovement === 1 && bomDemand.rankMovementLabel === '+1',
    'Mumbai rank movement is +1'
  )
  assert(
    blrDemand.rankMovement === -1 && blrDemand.rankMovementLabel === '-1',
    'Bengaluru rank movement is -1'
  )
  assert(
    bomDemand.mainDriver === 'Demand Fit',
    'Deterministic driver identifies Demand Fit as main driver for Mumbai rank change',
    `Got ${bomDemand.mainDriver}`
  )
  assert(
    bomDemand.mainDriverImpact === 2.98,
    'Driver impact matches hand-calculated score reversal difference (|79.08 - 76.10| = 2.98)',
    `Got ${bomDemand.mainDriverImpact}`
  )
  assert(
    blrDemand.mainDriver === 'Demand Fit',
    'Deterministic driver identifies Demand Fit as main driver for Bengaluru rank change'
  )
  assert(
    demandRaisedOutput.hasRankChanges === true,
    'hasRankChanges flag is true when ranks swapped'
  )
  assert(
    demandRaisedOutput.liveAnnouncement.includes('Mumbai moved up to rank #1'),
    'liveAnnouncement announces rank movement for screen readers'
  )

  // ─────────────────────────────────────────────────────────────
  // Test 3: (Requirement 5) No rank movement produces "No change" driver
  // Raising Entry Cost weight from 20 to 50:
  // Bengaluru Entry Cost score = 6.6, Mumbai = 4.8. Bengaluru score increases more.
  // Ranks do not change: Bengaluru remains #1, Mumbai remains #2.
  // ─────────────────────────────────────────────────────────────
  const entryCostRaisedWeights = {
    ...DEFAULT_WEIGHTS,
    'Entry Cost & Unit Economics': 50,
  }
  const entryCostOutput = computeWhatIfRanking(standardFixture, entryCostRaisedWeights, DEFAULT_WEIGHTS)
  const blrCost = entryCostOutput.results.find((r) => r.city === 'Bengaluru')!
  const bomCost = entryCostOutput.results.find((r) => r.city === 'Mumbai')!

  assert(
    blrCost.newRank === 1 && bomCost.newRank === 2,
    'Ranks remain unchanged when raising Entry Cost'
  )
  assert(
    blrCost.mainDriver === 'No change' && bomCost.mainDriver === 'No change',
    'Driver returns "No change" when no rank movement occurred'
  )
  assert(
    blrCost.mainDriverImpact === 0 && bomCost.mainDriverImpact === 0,
    'Driver impact is 0 when no rank movement occurred'
  )

  // ─────────────────────────────────────────────────────────────
  // Test 4: (Requirement 10b) Individual zero is allowed and all-zero is rejected with no NaN
  // ─────────────────────────────────────────────────────────────
  const oneZeroWeights = {
    ...DEFAULT_WEIGHTS,
    'Demand Fit': 0, // Demand Fit disabled
  }
  const oneZeroValidation = validateWeightsObject(oneZeroWeights)
  assert(
    oneZeroValidation.success === true,
    'Individual zero weight is valid'
  )
  const oneZeroOutput = computeWhatIfRanking(standardFixture, oneZeroWeights, DEFAULT_WEIGHTS)
  const blrOneZero = oneZeroOutput.results.find((r) => r.city === 'Bengaluru')!
  assert(
    blrOneZero.newScore !== null && !Number.isNaN(blrOneZero.newScore),
    'Individual zero calculates valid numeric score without NaN',
    `Got ${blrOneZero.newScore}`
  )

  const allZeroWeights = {
    'Demand Fit': 0,
    'Competitive Opportunity': 0,
    'Distribution Feasibility': 0,
    'Entry Cost & Unit Economics': 0,
    'Operational Feasibility & Talent': 0,
  }
  const allZeroValidation = validateWeightsObject(allZeroWeights)
  assert(
    allZeroValidation.success === false,
    'All-zero weights are rejected by validation'
  )
  assert(
    allZeroValidation.error?.includes('greater than 0') === true,
    'All-zero error message explains requirement clearly'
  )

  // Direct calculation with all-zero criteria guard:
  const allZeroScorerResult = computeFitScore({
    criteria: bengaluruCriteria,
    customWeights: allZeroWeights,
  })
  assert(
    allZeroScorerResult.total_score === null && allZeroScorerResult.insufficient_data === true,
    'Scorer returns null total_score and insufficient_data for all-zero weights (never NaN)'
  )

  // ─────────────────────────────────────────────────────────────
  // Test 5: (Requirement 10c) Missing factor is excluded and changing its weight does not affect score where missing
  // ─────────────────────────────────────────────────────────────
  // City C has 3 criteria available, 2 missing (Entry Cost & Talent missing):
  // Demand (25): 6.0 -> 150
  // Competitive (20): 7.5 -> 150
  // Distribution (20): 6.5 -> 130
  // Eligible weight sum = 65, weighted sum = 430.0. Score = (430 / 65) * 10 = 66.15.
  const partialCityCriteria = [
    { name: 'Demand Fit', weight: 25, score: 6.0, is_available: true },
    { name: 'Competitive Opportunity', weight: 20, score: 7.5, is_available: true },
    { name: 'Distribution Feasibility', weight: 20, score: 6.5, is_available: true },
    { name: 'Entry Cost & Unit Economics', weight: 20, score: null, is_available: false },
    { name: 'Operational Feasibility & Talent', weight: 15, score: null, is_available: false },
  ]
  const partialFixture: CityWhatIfInput[] = [
    { city: 'Tier2-Hub', criteria: partialCityCriteria },
  ]

  const basePartialOutput = computeWhatIfRanking(partialFixture, DEFAULT_WEIGHTS, DEFAULT_WEIGHTS)
  const basePartial = basePartialOutput.results.find((r) => r.city === 'Tier2-Hub')!
  assert(
    basePartial.newScore === 66.15,
    'City with missing factors computes correct baseline score (66.15)',
    `Expected 66.15, got ${basePartial.newScore}`
  )

  // Now change Entry Cost & Unit Economics weight from 20 to 50
  const changedMissingWeight = {
    ...DEFAULT_WEIGHTS,
    'Entry Cost & Unit Economics': 50,
  }
  const changedPartialOutput = computeWhatIfRanking(partialFixture, changedMissingWeight, DEFAULT_WEIGHTS)
  const changedPartial = changedPartialOutput.results.find((r) => r.city === 'Tier2-Hub')!
  assert(
    changedPartial.newScore === 66.15,
    'Changing weight of missing factor does NOT affect score for the city where it is missing',
    `Expected 66.15, got ${changedPartial.newScore}`
  )

  // Changing to 0 also has 0 effect:
  const zeroMissingWeight = {
    ...DEFAULT_WEIGHTS,
    'Entry Cost & Unit Economics': 0,
  }
  const zeroPartialOutput = computeWhatIfRanking(partialFixture, zeroMissingWeight, DEFAULT_WEIGHTS)
  const zeroPartial = zeroPartialOutput.results.find((r) => r.city === 'Tier2-Hub')!
  assert(
    zeroPartial.newScore === 66.15,
    'Zeroing weight of missing factor does NOT affect score for the city where it is missing'
  )

  // ─────────────────────────────────────────────────────────────
  // Test 6: (Requirement 4) Insufficient evidence / unranked cities flagged clearly without fake ranks or zero scores
  // ─────────────────────────────────────────────────────────────
  const insufficientCriteria = [
    { name: 'Demand Fit', weight: 25, score: 5.0, is_available: true },
    { name: 'Competitive Opportunity', weight: 20, score: null, is_available: false },
    { name: 'Distribution Feasibility', weight: 20, score: null, is_available: false },
    { name: 'Entry Cost & Unit Economics', weight: 20, score: null, is_available: false },
    { name: 'Operational Feasibility & Talent', weight: 15, score: null, is_available: false },
  ]
  const mixedFixture: CityWhatIfInput[] = [
    { city: 'Bengaluru', criteria: bengaluruCriteria },
    { city: 'Unranked-City', criteria: insufficientCriteria },
  ]
  const mixedOutput = computeWhatIfRanking(mixedFixture, DEFAULT_WEIGHTS, DEFAULT_WEIGHTS)
  const unrankedCity = mixedOutput.results.find((r) => r.city === 'Unranked-City')!

  assert(
    unrankedCity.insufficientData === true,
    'Insufficient data city is flagged as insufficientData = true'
  )
  assert(
    unrankedCity.previousRank === null && unrankedCity.newRank === null,
    'Unranked city has null rank (never assigned fake rank like 0 or 99)',
    `previousRank: ${unrankedCity.previousRank}, newRank: ${unrankedCity.newRank}`
  )
  assert(
    unrankedCity.previousScore === null && unrankedCity.newScore === null,
    'Unranked city has null score (never assigned fake score like 0)',
    `previousScore: ${unrankedCity.previousScore}, newScore: ${unrankedCity.newScore}`
  )
  assert(
    unrankedCity.rankMovement === null && unrankedCity.rankMovementLabel === '—',
    'Unranked city has null rank movement and "—" label'
  )
  assert(
    unrankedCity.mainDriver === '—',
    'Unranked city has "—" driver'
  )
  assert(
    unrankedCity.missingCriteria.length === 4,
    'Unranked city lists all 4 missing criteria accurately'
  )

  // ─────────────────────────────────────────────────────────────
  // Test 7: (Requirement 4) Deterministic tie-breaker preserves baseline rank first, then city name
  // ─────────────────────────────────────────────────────────────
  // Two cities with identical scores:
  const identicalA = [
    { name: 'Demand Fit', weight: 25, score: 8.0, is_available: true },
    { name: 'Competitive Opportunity', weight: 20, score: 8.0, is_available: true },
    { name: 'Distribution Feasibility', weight: 20, score: 8.0, is_available: true },
    { name: 'Entry Cost & Unit Economics', weight: 20, score: 8.0, is_available: true },
    { name: 'Operational Feasibility & Talent', weight: 15, score: 8.0, is_available: true },
  ]
  const identicalB = [
    { name: 'Demand Fit', weight: 25, score: 8.0, is_available: true },
    { name: 'Competitive Opportunity', weight: 20, score: 8.0, is_available: true },
    { name: 'Distribution Feasibility', weight: 20, score: 8.0, is_available: true },
    { name: 'Entry Cost & Unit Economics', weight: 20, score: 8.0, is_available: true },
    { name: 'Operational Feasibility & Talent', weight: 15, score: 8.0, is_available: true },
  ]
  const tieFixture: CityWhatIfInput[] = [
    { city: 'City-Zeta', criteria: identicalA },
    { city: 'City-Alpha', criteria: identicalB },
  ]
  const tieOutput = computeWhatIfRanking(tieFixture, DEFAULT_WEIGHTS, DEFAULT_WEIGHTS)
  const zCity = tieOutput.results.find((r) => r.city === 'City-Zeta')!
  const aCity = tieOutput.results.find((r) => r.city === 'City-Alpha')!
  assert(
    aCity.newRank === 1 && zCity.newRank === 2,
    'Tied cities break tie deterministically via alphabetical city name (City-Alpha #1, City-Zeta #2)'
  )

  // ─────────────────────────────────────────────────────────────
  // Test 8: (Requirement 7) Preset profiles validate through schema and compute valid scores
  // ─────────────────────────────────────────────────────────────
  const presetKeys: Array<keyof typeof PRESET_PROFILES> = ['Cost-first', 'Demand-first', 'Balanced']
  for (const pKey of presetKeys) {
    const profile = PRESET_PROFILES[pKey]
    const valResult = validateWeightsObject(profile)
    assert(
      valResult.success === true,
      `Preset "${pKey}" passes weights schema validation`
    )

    const presetOutput = computeWhatIfRanking(standardFixture, profile, DEFAULT_WEIGHTS)
    assert(
      presetOutput.rankedCount === 2,
      `Preset "${pKey}" computes ranking for all candidate cities without errors`
    )
    const blrPreset = presetOutput.results.find((r) => r.city === 'Bengaluru')!
    assert(
      blrPreset.newScore !== null && !Number.isNaN(blrPreset.newScore),
      `Preset "${pKey}" produces valid numeric score for Bengaluru (${blrPreset.newScore})`
    )
  }

  // ─────────────────────────────────────────────────────────────
  // Test 9: (Requirement 6) Field-level validation rejects invalid inputs cleanly
  // ─────────────────────────────────────────────────────────────
  assert(validateWeightField('-5') === 'Weight cannot be negative', 'Field validation rejects negative values')
  assert(validateWeightField('105') === 'Weight cannot exceed 100', 'Field validation rejects values over 100')
  assert(validateWeightField('abc') === 'Must be a valid number', 'Field validation rejects non-numeric string')
  assert(validateWeightField('') === 'Weight is required', 'Field validation rejects empty string')
  assert(validateWeightField('NaN') === 'Must be a valid number', 'Field validation rejects NaN string')
  assert(validateWeightField('Infinity') === 'Must be a finite number' || validateWeightField('Infinity') === 'Weight cannot exceed 100', 'Field validation rejects Infinity')
  assert(validateWeightField('0') === null, 'Field validation accepts 0')
  assert(validateWeightField('100') === null, 'Field validation accepts 100')
  assert(validateWeightField('25') === null, 'Field validation accepts 25')

  console.log(`\nWhat-If Ranking Suite: ${passed} passed, ${failed} failed.\n`)
  if (failed > 0) {
    process.exit(1)
  }
}

// Run immediately if executed directly
if (process.argv[1]?.includes('whatIfRanking.test')) {
  runWhatIfRankingTests()
}
