import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, StartupProfile, CityRecord } from '@/types/database'

/**
 * Retrieves the authenticated user's active startup profile.
 * Used across City Intelligence, Local Connect, and Market Validation.
 */
export async function getActiveProfile(
  supabase: SupabaseClient<Database>
): Promise<{ profile: StartupProfile | null; error: string | null }> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { profile: null, error: 'Unauthenticated' }
    }

    const { data: profile, error } = await supabase
      .from('startup_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      return { profile: null, error: error.message }
    }

    return { profile: profile as StartupProfile | null, error: null }
  } catch (err: unknown) {
    return {
      profile: null,
      error: err instanceof Error ? err.message : 'Failed to retrieve startup profile',
    }
  }
}

/**
 * Retrieves the catalog of supported cities from the database.
 * Falls back to an empty array if database is offline or unseeded.
 */
export async function getSupportedCities(
  supabase: SupabaseClient<Database>
): Promise<CityRecord[]> {
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error || !data) {
      return []
    }

    return data as CityRecord[]
  } catch {
    return []
  }
}
