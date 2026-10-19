import {
  introductionRequestSchema,
  localConnectFilterSchema,
  isValidStatusTransition,
} from '../schemas'

export function runIntroductionRequestValidationTests() {
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

  console.log('\n--- Running Introduction Request & Lifecycle Tests ---')

  const validUuid = '123e4567-e89b-12d3-a456-426614174000'
  const validStartupUuid = '223e4567-e89b-12d3-a456-426614174001'

  // 1. Valid Phase 6 structured request
  const validStructured = {
    contact_id: validUuid,
    startup_id: validStartupUuid,
    purpose: 'Distribution partnership',
    business_context: 'We have 14 cold pods deployed in Maharashtra and are expanding to Bengaluru.',
    desired_outcome: 'Explore pilot agreement and pricing schedule',
    message: 'Hello, looking forward to discussing synergy.',
    match_reason: 'Direct industry match in Bengaluru',
  }
  const res1 = introductionRequestSchema.safeParse(validStructured)
  assert(res1.success, 'Valid structured introduction request passes schema validation')

  // 2. Valid legacy message format
  const validLegacy = {
    contact_id: validUuid,
    message: 'We are expanding to Bengaluru and would like to explore distribution synergies.',
    match_reason: 'Expansion city match',
  }
  const res2 = introductionRequestSchema.safeParse(validLegacy)
  assert(res2.success, 'Valid legacy request with 20+ char message passes validation')

  // 3. Invalid contact ID (not UUID)
  const invalidUuid = {
    ...validStructured,
    contact_id: 'not-a-valid-uuid',
  }
  const res3 = introductionRequestSchema.safeParse(invalidUuid)
  assert(!res3.success, 'Invalid UUID for contact_id fails validation')

  // 4. Short purpose (< 3 chars)
  const shortPurpose = {
    ...validStructured,
    purpose: 'Hi',
  }
  const res4 = introductionRequestSchema.safeParse(shortPurpose)
  assert(!res4.success, 'Purpose under 3 characters fails validation')

  // 5. Short business context (< 10 chars)
  const shortContext = {
    ...validStructured,
    business_context: 'Short',
  }
  const res5 = introductionRequestSchema.safeParse(shortContext)
  assert(!res5.success, 'Business context under 10 characters fails validation')

  // 6. Short desired outcome (< 5 chars)
  const shortOutcome = {
    ...validStructured,
    desired_outcome: 'Call',
  }
  const res6 = introductionRequestSchema.safeParse(shortOutcome)
  assert(!res6.success, 'Desired outcome under 5 characters fails validation')

  // 7. Founder transition: pending -> cancelled is permitted
  const trans1 = isValidStatusTransition('pending', 'cancelled', 'founder')
  assert(trans1.allowed, 'Founder can cancel a pending introduction request')

  // 8. Founder transition: pending -> withdrawn is permitted
  const trans2 = isValidStatusTransition('pending', 'withdrawn', 'founder')
  assert(trans2.allowed, 'Founder can withdraw a pending introduction request')

  // 9. Founder transition: pending -> accepted is prohibited (cannot self-accept)
  const trans3 = isValidStatusTransition('pending', 'accepted', 'founder')
  assert(
    !trans3.allowed && Boolean(trans3.reason),
    'Founder cannot unilaterally mark their own request as accepted'
  )

  // 10. Founder transition: cancelled -> pending is prohibited
  const trans4 = isValidStatusTransition('cancelled', 'pending', 'founder')
  assert(!trans4.allowed, 'Founder cannot reopen a cancelled request')

  // 11. Recipient transition: pending -> accepted is allowed
  const trans5 = isValidStatusTransition('pending', 'accepted', 'recipient')
  assert(trans5.allowed, 'Recipient/admin can accept a pending request')

  // 12. Recipient transition: pending -> declined is allowed
  const trans6 = isValidStatusTransition('pending', 'declined', 'recipient')
  assert(trans6.allowed, 'Recipient/admin can decline a pending request')

  // 13. Recipient transition: accepted -> completed is allowed
  const trans7 = isValidStatusTransition('accepted', 'completed', 'recipient')
  assert(trans7.allowed, 'Recipient/admin can complete an accepted introduction')

  // 14. Same status transition is rejected
  const trans8 = isValidStatusTransition('pending', 'pending', 'founder')
  assert(!trans8.allowed, 'Transitioning to the identical status is rejected as no-op')

  // 15. Filter schema validation
  const validFilter = {
    query: 'cold storage',
    city: 'Bengaluru',
    category: 'distributor',
    verification_status: 'directly_confirmed' as const,
  }
  const filterRes = localConnectFilterSchema.safeParse(validFilter)
  assert(filterRes.success, 'Local connect filter parameters validate cleanly')

  console.log(`\nIntroduction Request Suite: ${passed} passed, ${failed} failed.`)
  if (failed > 0) throw new Error(`${failed} tests failed in Introduction Request validation suite.`)
}
