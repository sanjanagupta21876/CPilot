'use server'

import { createClient } from '@/lib/supabase/server'
import {
  introductionRequestSchema,
  isValidStatusTransition,
  type IntroductionRequestInput,
} from '@/lib/validations/schemas'
import type { IntroductionRequest, Contact } from '@/types/database'
import { DEMO_INTRO_REQUESTS, DEMO_CONTACTS } from '@/lib/data/demoData'

// In-memory fallback cache for demo sessions when Supabase is disconnected/unconfigured
const demoSessionRequests: IntroductionRequest[] = []

/**
 * Submits an introduction request with server-side validation and authentication.
 */
export async function createIntroductionRequest(
  rawInput: IntroductionRequestInput
): Promise<{ success: boolean; data?: IntroductionRequest; error?: string }> {
  try {
    const validated = introductionRequestSchema.parse(rawInput)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // Support demo mode submission when running in demo prototype
      const demoUser = { id: 'demo-user-001' }
      const contact = DEMO_CONTACTS.find((c) => c.id === validated.contact_id)

      const demoRequest: IntroductionRequest = {
        id: `intro-demo-${Date.now()}`,
        user_id: demoUser.id,
        contact_id: validated.contact_id,
        startup_id: validated.startup_id || 'demo-profile-001',
        purpose: validated.purpose || 'Ecosystem partnership & pilot inquiry',
        business_context: validated.business_context || 'Market entry exploration for scalable regional operations.',
        desired_outcome: validated.desired_outcome || 'Introductory exploratory meeting or preliminary agreement.',
        message:
          validated.message ||
          `Purpose: ${validated.purpose}\n\nContext:\n${validated.business_context}\n\nDesired Outcome:\n${validated.desired_outcome}`,
        match_reason: validated.match_reason || 'Targeted regional ecosystem partner match',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        contact: contact,
      }

      demoSessionRequests.unshift(demoRequest)
      return { success: true, data: demoRequest }
    }

    // Verify user owns a startup profile
    let startupId = validated.startup_id
    if (!startupId) {
      const { data: startup } = await supabase
        .from('startup_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (startup) {
        startupId = startup.id
      }
    }

    // Check for duplicate pending requests
    const { data: existing } = await supabase
      .from('introduction_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('contact_id', validated.contact_id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      return {
        success: false,
        error: 'You already have an active pending introduction request for this contact.',
      }
    }

    const messageBody =
      validated.message?.trim() ||
      `Purpose: ${validated.purpose}\n\nContext:\n${validated.business_context}\n\nDesired Outcome:\n${validated.desired_outcome}`

    const { data: newRequest, error: insertError } = await supabase
      .from('introduction_requests')
      .insert({
        user_id: user.id,
        contact_id: validated.contact_id,
        startup_id: startupId,
        purpose: validated.purpose,
        business_context: validated.business_context,
        desired_outcome: validated.desired_outcome,
        message: messageBody,
        match_reason: validated.match_reason || 'Partner alignment in expansion city',
        status: 'pending',
      })
      .select('*, contact:contacts(*)')
      .single()

    if (insertError) {
      throw insertError
    }

    return { success: true, data: newRequest as unknown as IntroductionRequest }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit introduction request.'
    return { success: false, error: message }
  }
}

/**
 * Cancels a pending introduction request owned by the founder.
 */
export async function cancelIntroductionRequest(
  requestId: string
): Promise<{ success: boolean; data?: IntroductionRequest; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // In demo mode, check demoSessionRequests
      const req = demoSessionRequests.find((r) => r.id === requestId)
      if (req) {
        if (req.status !== 'pending') {
          return {
            success: false,
            error: `Only pending requests can be cancelled. Current status is ${req.status}.`,
          }
        }
        req.status = 'cancelled'
        req.updated_at = new Date().toISOString()
        return { success: true, data: req }
      }
      return { success: false, error: 'Sign in to manage introduction requests.' }
    }

    // Fetch existing request to verify ownership and allowed transition
    const { data: existing, error: fetchError } = await supabase
      .from('introduction_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchError || !existing) {
      return { success: false, error: 'Introduction request not found.' }
    }

    if (existing.user_id !== user.id) {
      return { success: false, error: 'Unauthorized to modify this request.' }
    }

    const check = isValidStatusTransition(existing.status, 'cancelled', 'founder')
    if (!check.allowed) {
      return { success: false, error: check.reason }
    }

    const { data: updated, error: updateError } = await supabase
      .from('introduction_requests')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select('*, contact:contacts(*)')
      .single()

    if (updateError) throw updateError

    return { success: true, data: updated as unknown as IntroductionRequest }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to cancel request.'
    return { success: false, error: message }
  }
}

/**
 * Retrieves the signed-in user's introduction requests.
 */
export async function getUserIntroductionRequests(): Promise<{
  requests: IntroductionRequest[]
  isDemo: boolean
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // Return combined demo intro requests
      const convertedDemoRequests: IntroductionRequest[] = DEMO_INTRO_REQUESTS.map((demo) => {
        const contact = DEMO_CONTACTS.find((c) => c.name === demo.contactName) || {
          id: `contact-mock-${demo.id}`,
          name: demo.contactName,
          organization: demo.organization,
          category: demo.category,
          city: demo.city,
          role: null,
          industry_tags: ['AgriTech', 'Distribution'],
          description: null,
          source_name: 'Trade Directory',
          source_url: null,
          verified: true,
          verification_status: 'directly_confirmed',
          verified_at: '2026-09-01T10:00:00Z',
          is_demo: true,
          created_at: demo.requestedAt,
        }

        return {
          id: demo.id,
          user_id: 'demo-user-001',
          contact_id: contact.id,
          purpose: demo.purpose,
          business_context: demo.notes || 'Expansion pilot assessment',
          desired_outcome: 'Scheduled consultation and terms review',
          message: demo.purpose,
          status: demo.status,
          match_reason: 'Expansion city contact match',
          created_at: demo.requestedAt,
          updated_at: demo.requestedAt,
          contact: contact as Contact,
        }
      })

      return {
        requests: [...demoSessionRequests, ...convertedDemoRequests],
        isDemo: true,
      }
    }

    const { data, error } = await supabase
      .from('introduction_requests')
      .select('*, contact:contacts(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
      if (demoSessionRequests.length > 0) {
        return { requests: demoSessionRequests, isDemo: false }
      }
      return { requests: [], isDemo: false }
    }

    return { requests: data as unknown as IntroductionRequest[], isDemo: false }
  } catch {
    return { requests: demoSessionRequests, isDemo: true }
  }
}
