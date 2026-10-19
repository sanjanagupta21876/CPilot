import { startupProfileSchema } from '../schemas'

/**
 * Phase 4: Startup Profile Validation Test Suite
 */
export function runStartupProfileValidationTests() {
  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`)
      passed++
    } else {
      console.error(`  ✗ ${testName}`)
      failed++
    }
  }

  console.log('\n--- Running Startup Profile Validation Tests ---')

  // 1. Valid full profile
  const validFull = {
    name: 'Kavach AgriTech',
    business_description: 'Decentralized farm-gate cold chain infrastructure for horticulture.',
    industry: 'AgriTech & Cold Chain IoT',
    stage: 'seed',
    product_desc: 'Solar-powered IoT micro-cold storage pods and remote temperature sensors.',
    target_customer: 'Tier-2/3 Farmer Producer Organisations (FPOs) and fresh produce aggregators',
    current_city: 'Pune',
    price_min: 75000,
    price_max: 250000,
    primary_channel: 'B2B Direct Field Sales & FPO Partnerships',
    website_url: 'https://kavachagri.in',
    product_category: 'Cold Chain IoT Hardware',
    target_geography: 'Western & Southern India',
    expansion_cities: ['Bengaluru', 'Mumbai', 'Hyderabad'],
    traction_summary: '14 micro-pods deployed with 3 FPOs in Maharashtra.',
    expansion_context: 'Scaling into Karnataka and Madhya Pradesh horticulture corridors.',
  }
  const res1 = startupProfileSchema.safeParse(validFull)
  assert(res1.success, 'Valid full profile passes validation')

  // 2. Valid minimal profile (only required fields, no optional fields or prices)
  const validMinimal = {
    name: 'KiranaStack',
    business_description: 'Automated billing and ledger app for independent retailers.',
    industry: 'Retail Tech',
    stage: 'idea',
    product_desc: 'Simple mobile POS and UPI auto-reconciliation tool.',
    target_customer: 'Independent Kirana Stores',
    current_city: 'Bengaluru',
    primary_channel: 'General Trade & Kirana Retail Outlets',
  }
  const res2 = startupProfileSchema.safeParse(validMinimal)
  assert(res2.success, 'Valid minimal profile with only required fields passes')

  // 3. Missing name fails
  const missingName = { ...validMinimal, name: '' }
  const res3 = startupProfileSchema.safeParse(missingName)
  assert(!res3.success && Boolean(res3.error.issues.find((i) => i.path[0] === 'name')), 'Missing name fails validation')

  // 4. Short business description fails (< 10 chars)
  const shortDesc = { ...validMinimal, business_description: 'Too short' }
  const res4 = startupProfileSchema.safeParse(shortDesc)
  assert(!res4.success && Boolean(res4.error.issues.find((i) => i.path[0] === 'business_description')), 'Short business description fails (<10 chars)')

  // 5. Missing current_city fails
  const missingCity = { ...validMinimal, current_city: '' }
  const res5 = startupProfileSchema.safeParse(missingCity)
  assert(!res5.success && Boolean(res5.error.issues.find((i) => i.path[0] === 'current_city')), 'Missing current_city fails validation')

  // 6. Missing primary_channel fails
  const missingChannel = { ...validMinimal, primary_channel: '' }
  const res6 = startupProfileSchema.safeParse(missingChannel)
  assert(!res6.success && Boolean(res6.error.issues.find((i) => i.path[0] === 'primary_channel')), 'Missing primary_channel fails validation')

  // 7. Invalid price range: price_min > price_max fails
  const invalidPriceRange = { ...validMinimal, price_min: 5000, price_max: 1000 }
  const res7 = startupProfileSchema.safeParse(invalidPriceRange)
  assert(
    !res7.success && Boolean(res7.error.issues.find((i) => i.message.includes('Minimum price cannot exceed maximum price'))),
    'Invalid price range (min > max) fails validation'
  )

  // 8. Negative price fails
  const negativePrice = { ...validMinimal, price_min: -500 }
  const res8 = startupProfileSchema.safeParse(negativePrice)
  assert(!res8.success, 'Negative price fails validation')

  // 9. Single price (only price_min or only price_max) succeeds
  const singlePrice = { ...validMinimal, price_min: 1500 }
  const res9 = startupProfileSchema.safeParse(singlePrice)
  assert(res9.success, 'Single price (only price_min) succeeds')

  // 10. Invalid URL format fails
  const invalidUrl = { ...validMinimal, website_url: 'not-a-valid-url' }
  const res10 = startupProfileSchema.safeParse(invalidUrl)
  assert(!res10.success && Boolean(res10.error.issues.find((i) => i.path[0] === 'website_url')), 'Invalid website URL format fails')

  // 11. Empty URL string succeeds (optional)
  const emptyUrl = { ...validMinimal, website_url: '' }
  const res11 = startupProfileSchema.safeParse(emptyUrl)
  assert(res11.success, 'Empty website_url succeeds (treated as optional)')

  // 12. Candidate expansion cities array
  const withCities = { ...validMinimal, expansion_cities: ['Mumbai', 'Delhi-NCR'] }
  const res12 = startupProfileSchema.safeParse(withCities)
  assert(res12.success && res12.data.expansion_cities.length === 2, 'Candidate expansion cities array persists')

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`)
  if (failed > 0) {
    throw new Error(`${failed} tests failed`)
  }
}

if (require.main === module) {
  runStartupProfileValidationTests()
}
