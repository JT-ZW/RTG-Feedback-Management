'use server'

import { createClient } from '@/lib/supabase/server'
import { computeScores } from '@/lib/mystery-shopper-sections'
import type { FormResponses } from '@/lib/mystery-shopper-sections'

export interface SubmitMysteryShopperInput {
  propertyId: string
  visitDate: string        // ISO date string YYYY-MM-DD
  shopperName: string
  responses: FormResponses
}

export interface SubmitResult {
  success: boolean
  id?: string
  error?: string
}

export async function submitMysteryShopperForm(
  input: SubmitMysteryShopperInput
): Promise<SubmitResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated.' }
  }

  // Fetch the user's organization_id from their profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { success: false, error: 'User profile not found.' }
  }

  // Verify the user has a role on the selected property
  const { data: roleCheck } = await supabase
    .from('user_property_roles')
    .select('id')
    .eq('user_id', user.id)
    .eq('property_id', input.propertyId)
    .maybeSingle()

  if (!roleCheck) {
    return { success: false, error: 'You do not have access to the selected property.' }
  }

  const { totalActual, totalPossible, percentage } = computeScores(input.responses)

  const { data, error } = await supabase
    .from('mystery_shopper_submissions')
    .insert({
      organization_id: profile.organization_id,
      property_id: input.propertyId,
      submitted_by: user.id,
      visit_date: input.visitDate,
      shopper_name: input.shopperName.trim(),
      responses: JSON.stringify(input.responses),
      total_score: totalActual,
      max_score: totalPossible,
      percentage,
      status: 'submitted',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Mystery shopper submission error:', error.message)
    return { success: false, error: 'Failed to save submission. Please try again.' }
  }

  return { success: true, id: data.id }
}
