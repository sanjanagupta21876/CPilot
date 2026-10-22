import { runStartupProfileValidationTests } from '../src/lib/validations/__tests__/startupProfile.test'
import { runFitScoreTests } from '../src/lib/scoring/__tests__/fitScore.test'
import { runLocalConnectMatchingTests } from '../src/lib/scoring/__tests__/localConnectMatching.test'
import { runIntroductionRequestValidationTests } from '../src/lib/validations/__tests__/introductionRequest.test'
import { runMarketValidationMetricsTests } from '../src/lib/scoring/__tests__/marketValidationMetrics.test'
import { runMarketValidationSchemaTests } from '../src/lib/validations/__tests__/marketValidation.test'
import { runMarketProofClassifierTests } from '../src/lib/scoring/__tests__/marketProofClassifier.test'
import { runAIProviderTests } from '../src/lib/ai/__tests__/aiProvider.test'
import { runAIUseCasesTests } from '../src/lib/ai/__tests__/aiUseCases.test'
import { runIntegrationJourneyTests } from '../src/lib/__tests__/integrationJourney.test'
import { runSensitivityTests } from '../src/lib/scoring/__tests__/sensitivity.test'
import { runPruneTests } from '../src/lib/ai/__tests__/prune.test'
import { runBundleSecretCheck } from './check-bundle-secrets'
import { runWeightsValidationTests } from '../src/lib/validations/__tests__/weights.test'
import { runWhatIfRankingTests } from '../src/lib/scoring/__tests__/whatIfRanking.test'

console.log('====================================================')
console.log('   CITY LAUNCHPAD — COMPREHENSIVE TEST RUNNER')
console.log('====================================================')

async function main() {
  try {
    runStartupProfileValidationTests()
    runFitScoreTests()
    runSensitivityTests()
    runLocalConnectMatchingTests()
    runIntroductionRequestValidationTests()
    runMarketValidationMetricsTests()
    runMarketValidationSchemaTests()
    runMarketProofClassifierTests()
    runWeightsValidationTests()
    runWhatIfRankingTests()
    await runAIProviderTests()
    await runAIUseCasesTests()
    await runPruneTests()
    await runIntegrationJourneyTests()
    runBundleSecretCheck()
    console.log('====================================================')
    console.log('  ALL TEST SUITES PASSED SUCCESSFULLY')
    console.log('====================================================\n')
    process.exit(0)
  } catch (error) {
    console.error('Test runner encountered an error:', error)
    process.exit(1)
  }
}

main()
