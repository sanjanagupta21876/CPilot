import {
  explainWithPrune,
  generateDeterministicExplanation,
  parsePruneMetadataDefensively,
  setMockPruneHandler,
  resetMockPruneHandler,
  PRUNE_DISCLAIMER_AI,
  PRUNE_DISCLAIMER_TEMPLATE,
  type ScenarioData,
} from '../prune'

function assert(condition: boolean, testName: string, detail?: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${testName}${detail ? ` - ${detail}` : ''}`)
  }
  console.log(`  ✓ ${testName}`)
}

export async function runPruneTests(): Promise<void> {
  console.log('\n--- Running Prune AI Gateway Narration Tests (Phase 3) ---')

  const originalFlag = process.env.NARRATION_ENABLED
  const originalKey = process.env.PRUNE_API_KEY

  const sampleScenario: ScenarioData = {
    cityLabels: ['Bengaluru', 'Mumbai'],
    winnerCity: 'Bengaluru',
    runnerUpCity: 'Mumbai',
    scores: {
      Bengaluru: 78.4,
      Mumbai: 74.2,
    },
    oldRanks: { Bengaluru: 1, Mumbai: 2 },
    newRanks: { Bengaluru: 1, Mumbai: 2 },
    changedFactorWeights: {
      'Demand Fit': { oldWeight: 25, newWeight: 35 },
    },
    driverNames: ['Demand Fit', 'Operational Feasibility'],
    excludedFactors: [],
    robustnessPercentage: 84.5,
  }

  try {
    // 1. Feature flag off uses deterministic template
    process.env.NARRATION_ENABLED = 'false'
    process.env.PRUNE_API_KEY = 'prune_live_mock_key_12345'

    const directTemplate = generateDeterministicExplanation(sampleScenario)
    assert(
      directTemplate.includes('Bengaluru ranks #1') && directTemplate.includes('Demand Fit (25% → 35%)'),
      'generateDeterministicExplanation produces valid template narrative'
    )

    const flagOffResult = await explainWithPrune(sampleScenario)
    assert(flagOffResult.isAiGenerated === false, 'Feature flag OFF: isAiGenerated is false')
    assert(
      flagOffResult.fallbackReason === 'flag_disabled',
      'Feature flag OFF: fallbackReason is flag_disabled'
    )
    assert(
      flagOffResult.disclaimer === PRUNE_DISCLAIMER_TEMPLATE,
      'Feature flag OFF: uses template disclaimer'
    )
    assert(
      flagOffResult.text.includes('Bengaluru ranks #1') &&
        flagOffResult.text.includes('Demand Fit (25% → 35%)'),
      'Feature flag OFF: produces structured deterministic template summary'
    )
    assert(flagOffResult.pruneMetadata === null, 'Feature flag OFF: pruneMetadata is null')

    // 2. Missing key uses deterministic template
    process.env.NARRATION_ENABLED = 'true'
    delete process.env.PRUNE_API_KEY

    const missingKeyResult = await explainWithPrune(sampleScenario)
    assert(missingKeyResult.isAiGenerated === false, 'Missing key: isAiGenerated is false')
    assert(
      missingKeyResult.fallbackReason === 'missing_key',
      'Missing key: fallbackReason is missing_key'
    )
    assert(
      missingKeyResult.disclaimer === PRUNE_DISCLAIMER_TEMPLATE,
      'Missing key: uses template disclaimer'
    )

    // 3. Gateway error (502 / 401 / 429) falls back to deterministic template
    process.env.PRUNE_API_KEY = 'prune_valid_test_key'
    setMockPruneHandler(async () => ({
      status: 502,
      body: { error: 'Bad gateway connecting to model upstream' },
    }))

    const gatewayErrorResult = await explainWithPrune(sampleScenario)
    assert(gatewayErrorResult.isAiGenerated === false, 'Gateway error: isAiGenerated is false')
    assert(
      gatewayErrorResult.fallbackReason === 'gateway_error',
      'Gateway error: fallbackReason is gateway_error'
    )
    assert(
      gatewayErrorResult.text.includes('Bengaluru ranks #1'),
      'Gateway error: safely returns deterministic template without throwing'
    )

    // 4. Timeout falls back to deterministic template
    setMockPruneHandler(async () => ({
      status: 200,
      body: { choices: [{ message: { content: 'Slow response' } }] },
      delayMs: 200,
    }))

    const timeoutResult = await explainWithPrune(sampleScenario, 25) // 25ms timeout
    assert(timeoutResult.isAiGenerated === false, 'Timeout: isAiGenerated is false')
    assert(
      timeoutResult.fallbackReason === 'timeout',
      'Timeout: fallbackReason is timeout'
    )
    assert(
      timeoutResult.text.includes('Bengaluru ranks #1'),
      'Timeout: returns fallback template within short timeout window'
    )

    // 5. Successful AI wording does NOT mutate scores or ranks
    const initialBengScore = sampleScenario.scores.Bengaluru
    const initialMumbScore = sampleScenario.scores.Mumbai
    const initialWinner = sampleScenario.winnerCity

    setMockPruneHandler(async () => ({
      status: 200,
      body: {
        choices: [
          {
            message: {
              content:
                'Bengaluru maintains its leading expansion position with strong demand density. Increasing Demand Fit weight further widens its advantage over Mumbai.',
            },
          },
        ],
        prune_metadata: {
          cache_hit: true,
          cost_usd: 0.00012,
          tokens_prompt: 95,
          tokens_completion: 32,
          receipt_signature: 'sig_bvest_2026_receipt_001',
          savings_usd: 0.0018,
        },
      },
    }))

    const successResult = await explainWithPrune(sampleScenario)
    assert(successResult.isAiGenerated === true, 'Successful call: isAiGenerated is true')
    assert(
      successResult.disclaimer === PRUNE_DISCLAIMER_AI,
      'Successful call: displays required AI-generated disclaimer'
    )
    assert(
      successResult.text.startsWith('Bengaluru maintains its leading expansion position'),
      'Successful call: returns model narrative'
    )

    // Invariant: numeric scores and winner cannot be mutated by AI wording
    assert(
      sampleScenario.scores.Bengaluru === initialBengScore,
      'AI narrative cannot mutate Bengaluru score'
    )
    assert(
      sampleScenario.scores.Mumbai === initialMumbScore,
      'AI narrative cannot mutate Mumbai score'
    )
    assert(
      sampleScenario.winnerCity === initialWinner,
      'AI narrative cannot mutate winner city'
    )

    // 6. Defensive metadata parsing
    const meta = successResult.pruneMetadata
    assert(meta !== null, 'pruneMetadata parsed successfully')
    assert(meta?.cache_hit === true, 'pruneMetadata correctly captured cache_hit: true')
    assert(meta?.cost_usd === 0.00012, 'pruneMetadata correctly captured cost_usd')
    assert(
      meta?.receipt_signature === 'sig_bvest_2026_receipt_001',
      'pruneMetadata correctly captured signed receipt'
    )
    assert(meta?.savings_usd === 0.0018, 'pruneMetadata captures savings when reported')

    // Missing metadata must not crash
    setMockPruneHandler(async () => ({
      status: 200,
      body: {
        choices: [{ message: { content: 'Valid narrative with null metadata' } }],
        prune_metadata: null,
      },
    }))
    const nullMetaResult = await explainWithPrune(sampleScenario)
    assert(
      nullMetaResult.isAiGenerated === true && nullMetaResult.pruneMetadata === null,
      'Null prune_metadata handled safely without crashing'
    )

    // Unexpected / missing fields in metadata
    const weirdMetadata = parsePruneMetadataDefensively({
      unexpected_key: 'ignored',
      savings_usd: 0, // Zero savings must not be reported as savings
      cost_usd: 'not-a-number',
      cache_hit: false,
    })
    assert(weirdMetadata?.cache_hit === false, 'Defensive parsing extracts valid boolean')
    assert(
      weirdMetadata?.savings_usd === undefined,
      'Zero savings are never claimed as savings'
    )
    assert(weirdMetadata?.cost_usd === undefined, 'Non-number cost is filtered safely')

    // 7. Malformed output (empty content) falls back safely
    setMockPruneHandler(async () => ({
      status: 200,
      body: {
        choices: [{ message: { content: '' } }],
      },
    }))
    const emptyOutputResult = await explainWithPrune(sampleScenario)
    assert(
      emptyOutputResult.isAiGenerated === false,
      'Empty model content falls back to deterministic template'
    )
    assert(
      emptyOutputResult.fallbackReason === 'malformed_output',
      'Fallback reason tagged as malformed_output'
    )

    console.log('Prune AI Gateway Suite: all tests passed successfully.\n')
  } finally {
    resetMockPruneHandler()
    if (originalFlag !== undefined) process.env.NARRATION_ENABLED = originalFlag
    else delete process.env.NARRATION_ENABLED
    if (originalKey !== undefined) process.env.PRUNE_API_KEY = originalKey
    else delete process.env.PRUNE_API_KEY
  }
}

// Run immediately if invoked directly
if (process.argv[1]?.includes('prune.test')) {
  runPruneTests()
}
