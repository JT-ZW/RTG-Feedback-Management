'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  computeBreakfastScores,
  BREAKFAST_TOTAL,
  type BreakfastResponses,
} from '@/lib/restaurant-breakfast-items'

export interface BreakfastSubmitInput {
  propertyId: string
  submissionDate: string
  responses: BreakfastResponses
  checkedBy: string
  restaurantManager: string
  executiveChef: string
}

export interface BreakfastSubmitResult {
  success: boolean
  error?: string
}

export async function submitPublicBreakfastChecklist(
  input: BreakfastSubmitInput
): Promise<BreakfastSubmitResult> {
  if (!input.checkedBy.trim()) {
    return { success: false, error: '"Checked By" name is required.' }
  }
  if (!input.restaurantManager.trim()) {
    return { success: false, error: '"Restaurant Manager / Hostess" name is required.' }
  }
  if (!input.executiveChef.trim()) {
    return { success: false, error: '"Executive / Head Chef" name is required.' }
  }
  if (!input.submissionDate) {
    return { success: false, error: 'Date is required.' }
  }

  const admin = createAdminClient()

  const { data: property } = await admin
    .from('properties')
    .select('id, organization_id')
    .eq('id', input.propertyId)
    .single()

  if (!property) {
    return { success: false, error: 'Property not found. Please contact support.' }
  }

  const { yesCount, percentage } = computeBreakfastScores(input.responses)

  const { error } = await admin
    .from('restaurant_breakfast_submissions')
    .insert({
      organization_id: property.organization_id,
      property_id: property.id,
      submission_date: input.submissionDate,
      responses: JSON.stringify(input.responses),
      checked_by: input.checkedBy.trim(),
      restaurant_manager: input.restaurantManager.trim(),
      executive_chef: input.executiveChef.trim(),
      yes_count: yesCount,
      total_items: BREAKFAST_TOTAL,
      compliance_score: percentage,
      status: 'submitted',
    })

  if (error) {
    console.error('Breakfast checklist submission error:', error.message)
    return { success: false, error: 'Failed to save submission. Please try again.' }
  }

  return { success: true }
}
