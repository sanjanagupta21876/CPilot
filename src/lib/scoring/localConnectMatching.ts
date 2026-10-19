import type { Contact, StartupProfile, VerificationStatus } from '@/types/database'

export interface MatchScoreBreakdown {
  industryScore: number // max 35
  geoScore: number // max 35
  categoryScore: number // max 15
  verificationScore: number // max 15
  totalScore: number // 0 - 100
  reasons: string[]
}

export interface RankedContact extends Contact {
  matchScore: number
  matchBreakdown: MatchScoreBreakdown
  matchReasons: string[]
}

export const MATCHING_WEIGHTS = {
  INDUSTRY_MAX: 35,
  GEO_MAX: 35,
  CATEGORY_MAX: 15,
  VERIFICATION_MAX: 15,
} as const

/**
 * Normalizes text for case-insensitive comparisons
 */
function clean(str: string | null | undefined): string {
  return (str || '').trim().toLowerCase()
}

/**
 * Tokenizes strings into significant words (ignoring short stop words)
 */
function tokenize(str: string | null | undefined): string[] {
  if (!str) return []
  const stopWords = new Set(['and', 'the', 'for', 'with', 'in', 'of', 'to', 'a', '&', 'or'])
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))
}

/**
 * Deterministically evaluates industry alignment using stored tags & capabilities.
 */
export function evaluateIndustryFit(
  startup: Partial<StartupProfile>,
  contact: Contact
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  const startupIndustry = clean(startup.industry)
  const productCategory = clean(startup.product_category)
  const contactTags = (contact.industry_tags || []).map((t) => t.trim())
  const contactCapabilities = (contact.capabilities || []).map((c) => c.trim())

  if (!startupIndustry && !productCategory) {
    return { score: 0, reasons: [] }
  }

  // 1. Direct exact or substring match in industry_tags
  const directTagMatch = contactTags.find((tag) => {
    const cTag = clean(tag)
    return (
      cTag === startupIndustry ||
      startupIndustry.includes(cTag) ||
      cTag.includes(startupIndustry) ||
      (productCategory && (cTag === productCategory || productCategory.includes(cTag)))
    )
  })

  if (directTagMatch) {
    reasons.push(`Matches startup industry focus: ${directTagMatch}`)
    return { score: MATCHING_WEIGHTS.INDUSTRY_MAX, reasons }
  }

  // 2. Keyword token overlap between startup description/industry and contact tags/capabilities
  const startupTokens = new Set([
    ...tokenize(startup.industry),
    ...tokenize(startup.product_category),
    ...tokenize(startup.product_desc),
  ])

  let tokenMatchCount = 0
  const matchedTokens: string[] = []

  for (const tag of contactTags) {
    const tokens = tokenize(tag)
    for (const t of tokens) {
      if (startupTokens.has(t) && !matchedTokens.includes(t)) {
        tokenMatchCount++
        matchedTokens.push(t)
      }
    }
  }

  for (const cap of contactCapabilities) {
    const tokens = tokenize(cap)
    for (const t of tokens) {
      if (startupTokens.has(t) && !matchedTokens.includes(t)) {
        tokenMatchCount++
        matchedTokens.push(t)
      }
    }
  }

  if (tokenMatchCount >= 2) {
    reasons.push(`Aligned domain keywords: ${matchedTokens.slice(0, 3).join(', ')}`)
    return { score: 25, reasons }
  } else if (tokenMatchCount === 1) {
    reasons.push(`Partial domain overlap: ${matchedTokens[0]}`)
    return { score: 15, reasons }
  }

  // 3. General ecosystem relevance
  const hasGeneralTag = contactTags.some((t) => {
    const c = clean(t)
    return c === 'general' || c === 'early-stage' || c === 'deeptech' || c === 'b2b'
  })
  if (hasGeneralTag) {
    reasons.push('General cross-sector startup ecosystem contact')
    return { score: 10, reasons }
  }

  return { score: 0, reasons: [] }
}

/**
 * Deterministically evaluates geographic and expansion city alignment.
 */
export function evaluateGeographicFit(
  startup: Partial<StartupProfile>,
  contact: Contact
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  const contactCity = clean(contact.city)
  const expansionCities = (startup.expansion_cities || []).map((c) => clean(c))
  const currentCity = clean(startup.current_city)
  const serviceArea = clean(contact.service_area)

  // 1. Matches targeted expansion city
  const matchedExpansionCity = (startup.expansion_cities || []).find((c) =>
    clean(c).includes(contactCity) || contactCity.includes(clean(c))
  )

  if (matchedExpansionCity) {
    reasons.push(`Operates directly in target expansion city: ${contact.city}`)
    return { score: MATCHING_WEIGHTS.GEO_MAX, reasons }
  }

  // 2. Matches startup's current operating city
  if (currentCity && (currentCity.includes(contactCity) || contactCity.includes(currentCity))) {
    reasons.push(`Located in current operating base: ${contact.city}`)
    return { score: 25, reasons }
  }

  // 3. Service area mentions multi-region or expansion cities
  if (serviceArea) {
    const servesExpansion = expansionCities.some((ec) => ec && serviceArea.includes(ec))
    if (servesExpansion || serviceArea.includes('pan-india') || serviceArea.includes('pan-south') || serviceArea.includes('pan-maharashtra')) {
      reasons.push(`Service area covers regional corridor: ${contact.service_area}`)
      return { score: 18, reasons }
    }
  }

  return { score: 0, reasons: [] }
}

/**
 * Deterministically evaluates category alignment with startup channel or stage.
 */
export function evaluateCategoryFit(
  startup: Partial<StartupProfile>,
  contact: Contact
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  const channel = clean(startup.primary_channel)
  const stage = startup.stage
  const cat = contact.category

  // Retail & offline physical channel match
  if (
    (channel.includes('retail') || channel.includes('kirana') || channel.includes('fpo') || channel.includes('distributor')) &&
    (cat === 'distributor' || cat === 'retailer' || cat === 'logistics')
  ) {
    reasons.push(`Category matches distribution channel (${cat.replace('-', ' ')})`)
    return { score: MATCHING_WEIGHTS.CATEGORY_MAX, reasons }
  }

  // B2B direct field sales or pilot demand
  if (
    (channel.includes('direct') || channel.includes('enterprise') || channel.includes('b2b')) &&
    (cat === 'pilot-customer' || cat === 'institution' || cat === 'distributor')
  ) {
    reasons.push(`Category matches B2B engagement channel (${cat.replace('-', ' ')})`)
    return { score: MATCHING_WEIGHTS.CATEGORY_MAX, reasons }
  }

  // Early-stage mentorship or incubation fit
  if ((stage === 'idea' || stage === 'pre-seed') && (cat === 'mentor' || cat === 'institution')) {
    reasons.push(`Provides early-stage advisory & institutional support`)
    return { score: MATCHING_WEIGHTS.CATEGORY_MAX, reasons }
  }

  // Hardware/Manufacturing supplier fit
  if (
    (clean(startup.industry).includes('hardware') || clean(startup.product_category).includes('hardware') || clean(startup.product_desc).includes('hardware')) &&
    (cat === 'supplier' || cat === 'logistics')
  ) {
    reasons.push(`Fulfills hardware prototyping & component supply needs`)
    return { score: MATCHING_WEIGHTS.CATEGORY_MAX, reasons }
  }

  // Default baseline relevance
  return { score: 8, reasons: [] }
}

/**
 * Evaluates verification status transparency.
 */
export function evaluateVerificationFit(
  contact: Contact
): { score: number; reasons: string[] } {
  const status: VerificationStatus = contact.verification_status || (contact.verified ? 'directly_confirmed' : 'unverified')

  switch (status) {
    case 'directly_confirmed':
      return {
        score: MATCHING_WEIGHTS.VERIFICATION_MAX,
        reasons: ['Directly confirmed ecosystem contact'],
      }
    case 'source_checked':
      return {
        score: 10,
        reasons: [`Source-checked profile (${contact.source_name})`],
      }
    case 'unverified':
    default:
      return {
        score: 5,
        reasons: ['Unverified public directory listing'],
      }
  }
}

/**
 * Computes deterministic match score (0 - 100) and honest match explanations.
 */
export function calculateLocalConnectMatch(
  startup: Partial<StartupProfile> | null | undefined,
  contact: Contact
): MatchScoreBreakdown {
  if (!startup) {
    // If no startup profile provided, only verification status contributes to default ranking
    const ver = evaluateVerificationFit(contact)
    return {
      industryScore: 0,
      geoScore: 0,
      categoryScore: 0,
      verificationScore: ver.score,
      totalScore: ver.score,
      reasons: ver.reasons,
    }
  }

  const industry = evaluateIndustryFit(startup, contact)
  const geo = evaluateGeographicFit(startup, contact)
  const category = evaluateCategoryFit(startup, contact)
  const verification = evaluateVerificationFit(contact)

  const rawTotal = industry.score + geo.score + category.score + verification.score
  const totalScore = Math.max(0, Math.min(100, Math.round(rawTotal)))

  const reasons = [
    ...industry.reasons,
    ...geo.reasons,
    ...category.reasons,
    ...verification.reasons,
  ]

  return {
    industryScore: industry.score,
    geoScore: geo.score,
    categoryScore: category.score,
    verificationScore: verification.score,
    totalScore,
    reasons,
  }
}

/**
 * Ranks an array of contacts deterministically for a startup profile.
 */
export function rankContacts(
  contacts: Contact[],
  startup: Partial<StartupProfile> | null | undefined
): RankedContact[] {
  const ranked = contacts.map((contact) => {
    const breakdown = calculateLocalConnectMatch(startup, contact)
    return {
      ...contact,
      matchScore: breakdown.totalScore,
      matchBreakdown: breakdown,
      matchReasons: breakdown.reasons,
    }
  })

  // Sort descending by total matchScore, then by verification status, then by name
  return ranked.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore
    }
    const statusWeight: Record<VerificationStatus, number> = {
      directly_confirmed: 3,
      source_checked: 2,
      unverified: 1,
    }
    const weightDiff = (statusWeight[b.verification_status] || 1) - (statusWeight[a.verification_status] || 1)
    if (weightDiff !== 0) return weightDiff
    return a.name.localeCompare(b.name)
  })
}
