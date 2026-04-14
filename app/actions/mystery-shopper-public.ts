'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { computeScores } from '@/lib/mystery-shopper-sections'
import type { FormResponses } from '@/lib/mystery-shopper-sections'

export interface PublicSubmitInput {
  propertyId: string
  visitDate: string
  shopperName: string
  responses: FormResponses
}

export interface PublicSubmitResult {
  success: boolean
  error?: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function submitPublicMysteryShopperForm(
  input: PublicSubmitInput
): Promise<PublicSubmitResult> {
  if (!input.propertyId || !UUID_RE.test(input.propertyId)) {
    return { success: false, error: 'Invalid property.' }
  }
  if (!input.shopperName.trim()) {
    return { success: false, error: 'Shopper name is required.' }
  }
  if (input.shopperName.trim().length > 200) {
    return { success: false, error: 'Shopper name is too long.' }
  }
  if (!input.visitDate || !DATE_RE.test(input.visitDate)) {
    return { success: false, error: 'A valid visit date (YYYY-MM-DD) is required.' }
  }

  if (JSON.stringify(input.responses).length > 50_000) {
    return { success: false, error: 'Submission payload is too large.' }
  }

  const admin = createAdminClient()

  // Validate property exists in DB by ID — acts as server-side guard against spoofed IDs
  const { data: property } = await admin
    .from('properties')
    .select('id, organization_id')
    .eq('id', input.propertyId)
    .single()

  if (!property) {
    return { success: false, error: 'Property not found. Please contact support.' }
  }

  const { totalActual, totalPossible, percentage } = computeScores(input.responses)

  const { error } = await admin
    .from('mystery_shopper_submissions')
    .insert({
      organization_id: property.organization_id,
      property_id: property.id,
      visit_date: input.visitDate,
      shopper_name: input.shopperName.trim(),
      responses: JSON.stringify(input.responses),
      total_score: totalActual,
      max_score: totalPossible,
      percentage,
      status: 'submitted',
    })

  if (error) {
    console.error('Public mystery shopper submission error:', error.message)
    return { success: false, error: 'Failed to save submission. Please try again.' }
  }

  return { success: true }
}
