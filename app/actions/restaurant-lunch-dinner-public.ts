'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  computeRestaurantLunchDinnerScores,
  RESTAURANT_LUNCH_DINNER_TOTAL,
  type RestaurantLunchDinnerResponses,
} from '@/lib/restaurant-lunch-dinner-items'

export interface RestaurantLunchDinnerSubmitInput {
  propertyId: string
  submissionDate: string
  shift: 'AM' | 'PM'
  submitterName: string
  position: string
  responses: RestaurantLunchDinnerResponses
}

export interface RestaurantLunchDinnerSubmitResult {
  success: boolean
  error?: string
}

export async function submitPublicRestaurantLunchDinner(
  input: RestaurantLunchDinnerSubmitInput
): Promise<RestaurantLunchDinnerSubmitResult> {
  if (!input.submitterName.trim()) {
    return { success: false, error: 'Name is required.' }
  }
  if (!input.position.trim()) {
    return { success: false, error: 'Position is required.' }
  }
  if (!input.submissionDate) {
    return { success: false, error: 'Date is required.' }
  }
  if (!['AM', 'PM'].includes(input.shift)) {
    return { success: false, error: 'Please select a shift.' }
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

  const { yesCount, percentage } = computeRestaurantLunchDinnerScores(input.responses)

  const { error } = await admin
    .from('restaurant_lunch_dinner_submissions')
    .insert({
      organization_id: property.organization_id,
      property_id: property.id,
      submission_date: input.submissionDate,
      shift: input.shift,
      submitter_name: input.submitterName.trim(),
      position: input.position.trim(),
      responses: JSON.stringify(input.responses),
      yes_count: yesCount,
      total_items: RESTAURANT_LUNCH_DINNER_TOTAL,
      compliance_score: percentage,
      status: 'submitted',
    })

  if (error) {
    console.error('Restaurant lunch/dinner submission error:', error.message)
    return { success: false, error: 'Failed to save submission. Please try again.' }
  }

  return { success: true }
}
