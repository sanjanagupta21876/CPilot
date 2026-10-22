import { weightsSchema } from '../schemas'

/**
 * Phase 1: Weights Validation Tests
 */
export function runWeightsValidationTests() {
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

  console.log('\n--- Running Weights Validation Tests ---')

  // Valid weights
  const validWeights = {
    'Demand Fit': 30,
    'Competitive Opportunity': 25,
    'Distribution Feasibility': 25,
    'Entry Cost & Unit Economics': 20,
  }
  const validResult = weightsSchema.safeParse(validWeights)
  assert(
    validResult.success === true,
    'Valid weights pass validation'
  )

  // Negative weight rejected
  const negativeWeights = {
    'Demand Fit': -10,
    'Competitive Opportunity': 25,
  }
  const negativeResult = weightsSchema.safeParse(negativeWeights)
  assert(
    negativeResult.success === false,
    'Negative weight is rejected'
  )
  if (!negativeResult.success) {
    assert(
      negativeResult.error.issues.some((i) => i.message.includes('negative')),
      'Negative weight error message is clear'
    )
  }

  // Non-numeric string rejected
  const stringWeights = {
    'Demand Fit': 'thirty' as unknown as number,
    'Competitive Opportunity': 25,
  }
  const stringResult = weightsSchema.safeParse(stringWeights)
  assert(
    stringResult.success === false,
    'Non-numeric string weight is rejected'
  )

  // Empty string rejected
  const emptyStringWeights = {
    'Demand Fit': '' as unknown as number,
    'Competitive Opportunity': 25,
  }
  const emptyStringResult = weightsSchema.safeParse(emptyStringWeights)
  assert(
    emptyStringResult.success === false,
    'Empty string weight is rejected'
  )

  // Null rejected
  const nullWeights = {
    'Demand Fit': null as unknown as number,
    'Competitive Opportunity': 25,
  }
  const nullResult = weightsSchema.safeParse(nullWeights)
  assert(
    nullResult.success === false,
    'Null weight is rejected'
  )

  // Undefined rejected
  const undefinedWeights = {
    'Demand Fit': undefined as unknown as number,
    'Competitive Opportunity': 25,
  }
  const undefinedResult = weightsSchema.safeParse(undefinedWeights)
  assert(
    undefinedResult.success === false,
    'Undefined weight is rejected'
  )

  // NaN rejected
  const nanWeights = {
    'Demand Fit': NaN,
    'Competitive Opportunity': 25,
  }
  const nanResult = weightsSchema.safeParse(nanWeights)
  assert(
    nanResult.success === false,
    'NaN weight is rejected'
  )
  if (!nanResult.success) {
    assert(
      nanResult.error.issues.some((i) => i.message.includes('NaN')),
      'NaN error message is clear'
    )
  }

  // Infinity rejected
  const infinityWeights = {
    'Demand Fit': Infinity,
    'Competitive Opportunity': 25,
  }
  const infinityResult = weightsSchema.safeParse(infinityWeights)
  assert(
    infinityResult.success === false,
    'Infinity weight is rejected'
  )
  if (!infinityResult.success) {
    assert(
      infinityResult.error.issues.some((i) => i.message.includes('Infinity')),
      'Infinity error message is clear'
    )
  }

  // All-zero weights rejected
  const allZeroWeights = {
    'Demand Fit': 0,
    'Competitive Opportunity': 0,
    'Distribution Feasibility': 0,
  }
  const allZeroResult = weightsSchema.safeParse(allZeroWeights)
  assert(
    allZeroResult.success === false,
    'All-zero weights are rejected'
  )
  if (!allZeroResult.success) {
    assert(
      allZeroResult.error.issues.some((i) => i.message.includes('greater than 0')),
      'All-zero error message is clear'
    )
  }

  // One zero weight is valid (means "ignore this factor")
  const oneZeroWeights = {
    'Demand Fit': 0,
    'Competitive Opportunity': 50,
    'Distribution Feasibility': 50,
  }
  const oneZeroResult = weightsSchema.safeParse(oneZeroWeights)
  assert(
    oneZeroResult.success === true,
    'One zero weight is valid (factor ignored)'
  )

  // Unknown key rejected
  const unknownKeyWeights = {
    'Demand Fit': 30,
    'Unknown Factor': 25,
  }
  const unknownKeyResult = weightsSchema.safeParse(unknownKeyWeights)
  assert(
    unknownKeyResult.success === false,
    'Unknown criterion key is rejected'
  )
  if (!unknownKeyResult.success) {
    assert(
      unknownKeyResult.error.issues.some((i) => i.message.includes('Unknown criterion')),
      'Unknown key error message is clear'
    )
  }

  // Empty object rejected (no weights at all)
  const emptyWeights = {}
  const emptyResult = weightsSchema.safeParse(emptyWeights)
  assert(
    emptyResult.success === false,
    'Empty weights object is rejected'
  )

  console.log(`\nWeights Validation: ${passed} passed, ${failed} failed.\n`)
  if (failed > 0) {
    process.exit(1)
  }
}

// Run immediately if invoked as main script
runWeightsValidationTests()
