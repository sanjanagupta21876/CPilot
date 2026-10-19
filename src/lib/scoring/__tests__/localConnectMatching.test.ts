import {
  evaluateIndustryFit,
  evaluateGeographicFit,
  evaluateCategoryFit,
  evaluateVerificationFit,
  calculateLocalConnectMatch,
  rankContacts,
  MATCHING_WEIGHTS,
} from '../localConnectMatching'
import type { Contact, StartupProfile } from '@/types/database'

export function runLocalConnectMatchingTests() {
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

  console.log('\n--- Running Local Connect Matching & Deterministic Ranking Tests ---')

  const mockStartup: StartupProfile = {
    id: 'startup-001',
    user_id: 'user-001',
    name: 'Kavach AgriTech',
    industry: 'AgriTech & Cold Chain IoT',
    stage: 'seed',
    target_customer: 'Tier-2/3 Farmer Producer Organisations (FPOs) and fresh produce aggregators',
    product_desc: 'Solar-powered IoT micro-cold storage pods and remote temperature sensors.',
    business_description: 'Decentralized farm-gate cold chain infrastructure for horticulture.',
    current_city: 'Pune',
    expansion_cities: ['Bengaluru', 'Mumbai', 'Hyderabad'],
    primary_channel: 'B2B Direct Field Sales & FPO Partnerships',
    price_min: 75000,
    price_max: 250000,
    product_category: 'Cold Chain Hardware',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const mockContactDirect: Contact = {
    id: 'contact-direct-001',
    city: 'Bengaluru',
    name: 'Ananya Raghavan',
    organization: 'WayCool Agritech Logistics',
    role: 'Head of Cold Chain Procurement',
    category: 'distributor',
    industry_tags: ['AgriTech', 'Logistics', 'Cold Storage'],
    capabilities: ['Bulk Farm Procurement', 'Kirana Store Replenishment'],
    service_area: 'Bengaluru Urban & Rural',
    description: 'Handles 400+ tons/day of fresh produce with cold storage pods.',
    source_name: 'AgriLogistics Summit 2026 Directory',
    source_url: 'https://waycool.in',
    verified: true,
    verification_status: 'directly_confirmed',
    verified_at: '2026-09-05T11:30:00Z',
    is_demo: true,
    created_at: '2026-09-05T11:30:00Z',
  }

  const mockContactUnrelated: Contact = {
    id: 'contact-unrelated-001',
    city: 'Kolkata',
    name: 'Tapan Roy',
    organization: 'Bengal Jute Weavers Guild',
    role: 'Secretary',
    category: 'supplier',
    industry_tags: ['Textiles', 'Jute Handicrafts'],
    capabilities: ['Handloom Weaving', 'Raw Fiber Baling'],
    service_area: 'Hooghly & Howrah District',
    description: 'Artisan textile cluster producer.',
    source_name: 'State Handloom Directory',
    source_url: null,
    verified: false,
    verification_status: 'unverified',
    verified_at: null,
    is_demo: true,
    created_at: '2026-09-10T10:00:00Z',
  }

  // 1. Direct industry match
  const indRes1 = evaluateIndustryFit(mockStartup, mockContactDirect)
  assert(
    indRes1.score === MATCHING_WEIGHTS.INDUSTRY_MAX,
    'Direct exact industry tag match scores maximum 35 points'
  )
  assert(
    indRes1.reasons.length > 0 && indRes1.reasons[0].includes('AgriTech'),
    'Direct industry match produces truthful explanation referencing matched tag'
  )

  // 2. Unrelated industry yields 0 points without fabricating reasons
  const indRes2 = evaluateIndustryFit(mockStartup, mockContactUnrelated)
  assert(
    indRes2.score === 0 && indRes2.reasons.length === 0,
    'Unrelated industry yields 0 points and zero fabricated reasons'
  )

  // 3. Geographic fit: target expansion city match scores 35 points
  const geoRes1 = evaluateGeographicFit(mockStartup, mockContactDirect)
  assert(
    geoRes1.score === MATCHING_WEIGHTS.GEO_MAX,
    'Target expansion city match (Bengaluru) scores maximum 35 points'
  )
  assert(
    geoRes1.reasons[0].includes('Bengaluru'),
    'Geographic match reason explicitly identifies target city'
  )

  // 4. Geographic fit: operating base city match scores 25 points
  const contactPune: Contact = { ...mockContactDirect, city: 'Pune' }
  const geoRes2 = evaluateGeographicFit(mockStartup, contactPune)
  assert(
    geoRes2.score === 25,
    'Current operating city match (Pune) scores 25 points'
  )

  // 5. Geographic fit: unrelated non-expansion city scores 0 points
  const geoRes3 = evaluateGeographicFit(mockStartup, mockContactUnrelated)
  assert(
    geoRes3.score === 0,
    'Non-expansion, non-operating city (Kolkata) scores 0 points'
  )

  // 6. Category fit: channel alignment
  const catRes1 = evaluateCategoryFit(mockStartup, mockContactDirect)
  assert(
    catRes1.score === MATCHING_WEIGHTS.CATEGORY_MAX,
    'B2B / Distributor alignment scores maximum 15 points'
  )

  // 7. Verification transparency scoring
  const verConfirmed = evaluateVerificationFit(mockContactDirect)
  assert(
    verConfirmed.score === 15 && verConfirmed.reasons[0].includes('Directly confirmed'),
    'Directly confirmed contact scores 15 verification points'
  )

  const contactSourceChecked: Contact = {
    ...mockContactDirect,
    verification_status: 'source_checked',
  }
  const verSourceChecked = evaluateVerificationFit(contactSourceChecked)
  assert(
    verSourceChecked.score === 10 && verSourceChecked.reasons[0].includes('Source-checked'),
    'Source-checked contact scores 10 verification points with source name'
  )

  const verUnverified = evaluateVerificationFit(mockContactUnrelated)
  assert(
    verUnverified.score === 5 && verUnverified.reasons[0].includes('Unverified'),
    'Unverified contact scores 5 verification points transparently'
  )

  // 8. Total match score computation and clamping
  const fullMatch = calculateLocalConnectMatch(mockStartup, mockContactDirect)
  assert(
    fullMatch.totalScore === 100,
    'Ideal match across industry, expansion city, category, and verification scores 100%'
  )
  assert(
    fullMatch.totalScore >= 0 && fullMatch.totalScore <= 100,
    'Match score strictly clamped within 0-100 range'
  )

  // 9. Missing startup profile handles gracefully without crash or fabrication
  const noProfileMatch = calculateLocalConnectMatch(null, mockContactDirect)
  assert(
    noProfileMatch.industryScore === 0 && noProfileMatch.geoScore === 0,
    'Missing startup profile zeroes out preference scores without throwing'
  )
  assert(
    noProfileMatch.totalScore === 15,
    'Missing profile only awards verification score (15)'
  )

  // 10. Deterministic ranking order
  const ranked = rankContacts([mockContactUnrelated, mockContactDirect], mockStartup)
  assert(
    ranked[0].id === mockContactDirect.id,
    'Ranked list deterministically places highest matching contact first'
  )
  assert(
    ranked[0].matchScore > ranked[1].matchScore,
    'Higher relevant contact has higher numeric match score than unrelated contact'
  )

  console.log(`\nLocal Connect Matching Suite: ${passed} passed, ${failed} failed.`)
  if (failed > 0) throw new Error(`${failed} tests failed in Local Connect matching suite.`)
}
