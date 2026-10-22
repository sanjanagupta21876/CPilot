import {
  computeMarginToFlip,
  computeRankRobustness,
  createSeededRandom,
  ROBUSTNESS_DISCLAIMER,
  type CandidateCityInput,
} from '../sensitivity'

function assert(condition: boolean, testName: string, detail?: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${testName}${detail ? ` - ${detail}` : ''}`)
  }
  console.log(`  ✓ ${testName}`)
}

export function runSensitivityTests(): void {
  console.log('\n--- Running Sensitivity Decision Aids Tests (Phase 3) ---')

  // ─────────────────────────────────────────────────────────────
  // A. MARGIN TO FLIP TESTS
  // ─────────────────────────────────────────────────────────────

  // Test 1: Known hand-checked threshold
  // Setup: 4 factors, all weights 30, 10, 30, 30 (total 100).
  // Demand Fit: City A = 9.0, City B = 6.0 (A advantage)
  // Operating Cost: City A = 6.0, City B = 9.0 (B advantage)
  // Market Size: City A = 7.0, City B = 7.0
  // Logistics: City A = 8.0, City B = 8.0
  // At current weights:
  // City A score = (9*30 + 6*10 + 7*30 + 8*30) / 100 * 10 = 78.0
  // City B score = (6*30 + 9*10 + 7*30 + 8*30) / 100 * 10 = 72.0
  // City A leads by 6 points.
  // Operating Cost:
  // City A sum at weight w = 720 + 6w; Denom = 90 + w; Score = 10*(720+6w)/(90+w)
  // City B sum at weight w = 630 + 9w; Denom = 90 + w; Score = 10*(630+9w)/(90+w)
  // For B > A: 630 + 9w > 720 + 6w <=> 3w > 90 <=> w > 30.
  // At w = 30: Tied at 75.0.
  // At w = 31: City A = 74.88, City B = 75.12. B strictly flips A!
  const handCheckCityA: CandidateCityInput = {
    name: 'City Alpha',
    criteria: [
      { name: 'Demand Fit', weight: 30, score: 9.0, is_available: true },
      { name: 'Operating Cost', weight: 10, score: 6.0, is_available: true },
      { name: 'Market Size', weight: 30, score: 7.0, is_available: true },
      { name: 'Logistics', weight: 30, score: 8.0, is_available: true },
    ],
  }
  const handCheckCityB: CandidateCityInput = {
    name: 'City Beta',
    criteria: [
      { name: 'Demand Fit', weight: 30, score: 6.0, is_available: true },
      { name: 'Operating Cost', weight: 10, score: 9.0, is_available: true },
      { name: 'Market Size', weight: 30, score: 7.0, is_available: true },
      { name: 'Logistics', weight: 30, score: 8.0, is_available: true },
    ],
  }

  const handCheckResult = computeMarginToFlip([handCheckCityA, handCheckCityB])
  assert(handCheckResult.canFlip === true, 'Known hand-check: flip is possible')
  const opCostFactor = handCheckResult.flippableFactors.find((f) => f.criterionName === 'Operating Cost')
  assert(
    opCostFactor !== undefined,
    'Known hand-check: Operating Cost is identified as flippable factor'
  )
  assert(
    opCostFactor?.thresholdWeight === 31,
    'Known hand-check: Threshold weight matches exact mathematical derivation (31%)',
    `Expected 31, got ${opCostFactor?.thresholdWeight}`
  )
  assert(
    opCostFactor?.direction === 'increase',
    'Known hand-check: Direction is increase'
  )
  assert(
    opCostFactor!.newCity2Score > opCostFactor!.newCity1Score,
    'Known hand-check: City Beta strictly leads City Alpha at threshold (75.12 vs 74.88)'
  )

  // Test 2: No-flip case
  // City A dominates City B on every single factor
  const dominantCityA: CandidateCityInput = {
    name: 'Dominant City',
    criteria: [
      { name: 'Demand Fit', weight: 25, score: 9.5, is_available: true },
      { name: 'Operating Cost', weight: 25, score: 9.0, is_available: true },
      { name: 'Market Size', weight: 25, score: 8.5, is_available: true },
      { name: 'Logistics', weight: 25, score: 9.0, is_available: true },
    ],
  }
  const trailingCityB: CandidateCityInput = {
    name: 'Trailing City',
    criteria: [
      { name: 'Demand Fit', weight: 25, score: 4.0, is_available: true },
      { name: 'Operating Cost', weight: 25, score: 3.5, is_available: true },
      { name: 'Market Size', weight: 25, score: 4.0, is_available: true },
      { name: 'Logistics', weight: 25, score: 3.0, is_available: true },
    ],
  }
  const noFlipResult = computeMarginToFlip([dominantCityA, trailingCityB])
  assert(noFlipResult.canFlip === false, 'No-flip case: canFlip is false')
  assert(
    noFlipResult.explanation === 'No single weight change flips #1 within the supported range.',
    'No-flip case: exact required explanation string returned'
  )
  assert(noFlipResult.flippableFactors.length === 0, 'No-flip case: flippableFactors is empty')

  // Test 3: Tied scores case
  const tiedCityA: CandidateCityInput = {
    name: 'Tied Metro A',
    criteria: [
      { name: 'Demand Fit', weight: 25, score: 8.0, is_available: true },
      { name: 'Operating Cost', weight: 25, score: 6.0, is_available: true },
      { name: 'Market Size', weight: 25, score: 7.0, is_available: true },
      { name: 'Logistics', weight: 25, score: 7.0, is_available: true },
    ],
  }
  const tiedCityB: CandidateCityInput = {
    name: 'Tied Metro B',
    criteria: [
      { name: 'Demand Fit', weight: 25, score: 8.0, is_available: true },
      { name: 'Operating Cost', weight: 25, score: 6.0, is_available: true },
      { name: 'Market Size', weight: 25, score: 7.0, is_available: true },
      { name: 'Logistics', weight: 25, score: 7.0, is_available: true },
    ],
  }
  const tiedResult = computeMarginToFlip([tiedCityA, tiedCityB])
  assert(tiedResult.canFlip === false, 'Tied case: canFlip is false')
  assert(tiedResult.isTied === true, 'Tied case: isTied is true')
  assert(
    tiedResult.explanation.includes('Scores are currently tied between Tied Metro A and Tied Metro B'),
    'Tied case: explains tied status transparently without inventing a threshold'
  )

  // Test 4: Currently unranked / insufficient data case
  const sparseCityA: CandidateCityInput = {
    name: 'Sparse Metro A',
    criteria: [
      { name: 'Demand Fit', weight: 25, score: 8.0, is_available: true },
      { name: 'Operating Cost', weight: 25, score: null, is_available: false },
      { name: 'Market Size', weight: 25, score: null, is_available: false },
      { name: 'Logistics', weight: 25, score: null, is_available: false },
    ],
  }
  const unrankedResult = computeMarginToFlip([sparseCityA, handCheckCityB])
  assert(unrankedResult.canFlip === false, 'Insufficient data case: canFlip is false')
  assert(unrankedResult.insufficientData === true, 'Insufficient data case: insufficientData is true')
  assert(
    unrankedResult.explanation.includes('Insufficient data to calculate margin to flip'),
    'Insufficient data case: explains lack of data rather than inventing a threshold'
  )

  // Test 5: Missing factor never offered
  // Suppose "Custom Incentive" exists with high score in City 2, but is MISSING for City 1
  const cityWithMissingA: CandidateCityInput = {
    name: 'City With Missing A',
    criteria: [
      { name: 'Demand Fit', weight: 35, score: 8.5, is_available: true },
      { name: 'Operating Cost', weight: 25, score: 7.0, is_available: true },
      { name: 'Market Size', weight: 20, score: 8.0, is_available: true },
      { name: 'Special Incentive', weight: 20, score: null, is_available: false }, // MISSING for A
    ],
  }
  const cityWithMissingB: CandidateCityInput = {
    name: 'City With Missing B',
    criteria: [
      { name: 'Demand Fit', weight: 35, score: 7.5, is_available: true },
      { name: 'Operating Cost', weight: 25, score: 7.0, is_available: true },
      { name: 'Market Size', weight: 20, score: 8.0, is_available: true },
      { name: 'Special Incentive', weight: 20, score: 10.0, is_available: true },
    ],
  }
  const missingResult = computeMarginToFlip([cityWithMissingA, cityWithMissingB])
  const offeredNames = missingResult.flippableFactors.map((f) => f.criterionName)
  assert(
    !offeredNames.includes('Special Incentive'),
    'Missing factor is NEVER offered when unavailable in one or both cities'
  )

  // Test 6a: Supported boundary threshold at 0%
  const boundary0CityA: CandidateCityInput = {
    name: 'Boundary A',
    criteria: [
      { name: 'F1', weight: 1, score: 9.0, is_available: true },
      { name: 'F2', weight: 50, score: 6.99, is_available: true },
      { name: 'F3', weight: 50, score: 7.0, is_available: true },
    ],
  }
  const boundary0CityB: CandidateCityInput = {
    name: 'Boundary B',
    criteria: [
      { name: 'F1', weight: 1, score: 1.0, is_available: true },
      { name: 'F2', weight: 50, score: 7.01, is_available: true },
      { name: 'F3', weight: 50, score: 7.0, is_available: true },
    ],
  }
  const boundary0Result = computeMarginToFlip([boundary0CityA, boundary0CityB])
  const f1Flip = boundary0Result.flippableFactors.find((f) => f.criterionName === 'F1')
  assert(f1Flip !== undefined, 'Boundary test 0%: F1 factor identified')
  assert(
    f1Flip?.thresholdWeight === 0,
    'Boundary test at lower end: threshold found exactly at boundary 0%',
    `Expected 0, got ${f1Flip?.thresholdWeight}`
  )
  assert(f1Flip?.direction === 'decrease', 'Boundary test 0%: direction is decrease')

  // Test 6b: Supported boundary threshold at 100%
  const boundary100CityA: CandidateCityInput = {
    name: 'Boundary 100 A',
    criteria: [
      { name: 'F1', weight: 50, score: 9.0, is_available: true },
      { name: 'F2', weight: 50, score: 7.0, is_available: true },
      { name: 'F3', weight: 10, score: 5.0, is_available: true },
    ],
  }
  const boundary100CityB: CandidateCityInput = {
    name: 'Boundary 100 B',
    criteria: [
      { name: 'F1', weight: 50, score: 5.02, is_available: true },
      { name: 'F2', weight: 50, score: 7.0, is_available: true },
      { name: 'F3', weight: 10, score: 7.0, is_available: true },
    ],
  }
  const boundary100Result = computeMarginToFlip([boundary100CityA, boundary100CityB])
  const f3Flip = boundary100Result.flippableFactors.find((f) => f.criterionName === 'F3')
  assert(f3Flip !== undefined, 'Boundary test 100%: F3 factor identified')
  assert(
    f3Flip?.thresholdWeight === 100,
    'Boundary test at upper end: threshold found exactly at boundary 100%',
    `Expected 100, got ${f3Flip?.thresholdWeight}`
  )
  assert(f3Flip?.direction === 'increase', 'Boundary test 100%: direction is increase')

  // ─────────────────────────────────────────────────────────────
  // B. RANK ROBUSTNESS TESTS
  // ─────────────────────────────────────────────────────────────

  // Test 7a: PRNG determinism
  const rngA = createSeededRandom(42)
  const rngB = createSeededRandom(42)
  assert(rngA() === rngB(), 'createSeededRandom is 100% deterministic with identical seed')

  // Test 7b: Reproducibility (same seed gives identical results)
  const candidateCities: CandidateCityInput[] = [
    {
      name: 'Bengaluru',
      criteria: [
        { name: 'Demand Fit', weight: 25, score: 8.5, is_available: true },
        { name: 'Operating Cost', weight: 20, score: 5.5, is_available: true },
        { name: 'Talent & Ecosystem', weight: 30, score: 9.2, is_available: true },
        { name: 'Retail Reach', weight: 25, score: 7.8, is_available: true },
      ],
    },
    {
      name: 'Mumbai',
      criteria: [
        { name: 'Demand Fit', weight: 25, score: 9.0, is_available: true },
        { name: 'Operating Cost', weight: 20, score: 4.5, is_available: true },
        { name: 'Talent & Ecosystem', weight: 30, score: 8.0, is_available: true },
        { name: 'Retail Reach', weight: 25, score: 8.5, is_available: true },
      ],
    },
    {
      name: 'Pune',
      criteria: [
        { name: 'Demand Fit', weight: 25, score: 7.0, is_available: true },
        { name: 'Operating Cost', weight: 20, score: 8.0, is_available: true },
        { name: 'Talent & Ecosystem', weight: 30, score: 7.5, is_available: true },
        { name: 'Retail Reach', weight: 25, score: 7.0, is_available: true },
      ],
    },
  ]

  const robustnessRun1 = computeRankRobustness(candidateCities, { sampleCount: 1000, seed: 12345 })
  const robustnessRun2 = computeRankRobustness(candidateCities, { sampleCount: 1000, seed: 12345 })

  assert(
    robustnessRun1.results[0].winPercentage === robustnessRun2.results[0].winPercentage,
    'Rank robustness is 100% reproducible with same seed'
  )
  assert(
    robustnessRun1.results[0].winCount === robustnessRun2.results[0].winCount,
    'Win counts match identically across seeded runs'
  )
  assert(
    robustnessRun1.disclaimer === ROBUSTNESS_DISCLAIMER,
    'Explicitly labels sensitivity check under simulated weights, not real-world prediction'
  )

  // Test 8: City strictly beating all others on every factor is #1 in 100% of samples
  const perfectCity: CandidateCityInput = {
    name: 'Top Champion City',
    criteria: [
      { name: 'Demand Fit', weight: 25, score: 10.0, is_available: true },
      { name: 'Operating Cost', weight: 25, score: 10.0, is_available: true },
      { name: 'Talent', weight: 25, score: 10.0, is_available: true },
      { name: 'Retail', weight: 25, score: 10.0, is_available: true },
    ],
  }
  const lowerCity: CandidateCityInput = {
    name: 'Lesser City',
    criteria: [
      { name: 'Demand Fit', weight: 25, score: 5.0, is_available: true },
      { name: 'Operating Cost', weight: 25, score: 5.0, is_available: true },
      { name: 'Talent', weight: 25, score: 5.0, is_available: true },
      { name: 'Retail', weight: 25, score: 5.0, is_available: true },
    ],
  }

  const perfectReport = computeRankRobustness([perfectCity, lowerCity], { sampleCount: 1000, seed: 42 })
  assert(
    perfectReport.results[0].cityName === 'Top Champion City',
    'Strict winner places #1 in robustness'
  )
  assert(
    perfectReport.results[0].winPercentage === 100.0,
    'Strictly dominant city is top in 100.0% of 1,000 sampled weightings'
  )
  assert(
    perfectReport.results[1].winPercentage === 0.0,
    'Lesser city wins 0.0% of samples'
  )

  // Test 9: Two identical cities split approximately evenly (exact 50/50 with fractional tie sharing)
  const identicalCity1: CandidateCityInput = {
    name: 'Twin City Alpha',
    criteria: [
      { name: 'Demand Fit', weight: 25, score: 8.0, is_available: true },
      { name: 'Operating Cost', weight: 25, score: 7.0, is_available: true },
      { name: 'Talent', weight: 25, score: 7.5, is_available: true },
      { name: 'Retail', weight: 25, score: 8.0, is_available: true },
    ],
  }
  const identicalCity2: CandidateCityInput = {
    name: 'Twin City Beta',
    criteria: [
      { name: 'Demand Fit', weight: 25, score: 8.0, is_available: true },
      { name: 'Operating Cost', weight: 25, score: 7.0, is_available: true },
      { name: 'Talent', weight: 25, score: 7.5, is_available: true },
      { name: 'Retail', weight: 25, score: 8.0, is_available: true },
    ],
  }

  const twinReport = computeRankRobustness([identicalCity1, identicalCity2], { sampleCount: 1000, seed: 99 })
  const twinA = twinReport.results.find((r) => r.cityName === 'Twin City Alpha')!
  const twinB = twinReport.results.find((r) => r.cityName === 'Twin City Beta')!

  assert(
    Math.abs(twinA.winPercentage - 50.0) < 0.1,
    'Two identical cities split exactly 50/50 using fractional credit sharing',
    `Twin A: ${twinA.winPercentage}%, Twin B: ${twinB.winPercentage}%`
  )
  assert(
    twinA.winPercentage === twinB.winPercentage,
    'Twin cities have identical win percentages (no alphabetical false 100%)'
  )

  // Test 10: Missing factors across all cities are ignored
  const citiesWithCommonMissing: CandidateCityInput[] = [
    {
      name: 'City X',
      criteria: [
        { name: 'Demand Fit', weight: 25, score: 8.0, is_available: true },
        { name: 'Operating Cost', weight: 25, score: 7.0, is_available: true },
        { name: 'Ecosystem', weight: 25, score: 8.0, is_available: true },
        { name: 'Uncollected Dimension', weight: 25, score: null, is_available: false },
      ],
    },
    {
      name: 'City Y',
      criteria: [
        { name: 'Demand Fit', weight: 25, score: 7.5, is_available: true },
        { name: 'Operating Cost', weight: 25, score: 8.5, is_available: true },
        { name: 'Ecosystem', weight: 25, score: 7.0, is_available: true },
        { name: 'Uncollected Dimension', weight: 25, score: null, is_available: false },
      ],
    },
  ]
  const missingFactorReport = computeRankRobustness(citiesWithCommonMissing, { sampleCount: 500, seed: 42 })
  assert(
    missingFactorReport.ignoredCriteria.includes('Uncollected Dimension'),
    'Factors missing for all candidate cities are identified and ignored'
  )
  assert(
    !missingFactorReport.activeCriteria.includes('Uncollected Dimension'),
    'Ignored factors are not in active criteria'
  )

  // Test 11: All samples remain finite
  for (const r of robustnessRun1.results) {
    assert(Number.isFinite(r.winCount), `Win count for ${r.cityName} is finite`)
    assert(Number.isFinite(r.winPercentage), `Win percentage for ${r.cityName} is finite`)
    assert(r.winPercentage >= 0 && r.winPercentage <= 100, `Win percentage is bounded in [0, 100]`)
  }
  console.log('  ✓ All 1,000 samples produce finite, bounded scores')

  console.log('Sensitivity Decision Aids Suite: all tests passed successfully.\n')
}

// Run immediately if invoked directly
if (process.argv[1]?.includes('sensitivity.test')) {
  runSensitivityTests()
}
