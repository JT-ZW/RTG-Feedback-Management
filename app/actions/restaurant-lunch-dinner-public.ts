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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function submitPublicRestaurantLunchDinner(
  input: RestaurantLunchDinnerSubmitInput
): Promise<RestaurantLunchDinnerSubmitResult> {
  if (!input.propertyId || !UUID_RE.test(input.propertyId)) {
    return { success: false, error: 'Invalid property.' }
  }
  if (!input.submitterName.trim()) {
    return { success: false, error: 'Name is required.' }
  }
  if (input.submitterName.trim().length > 200) {
    return { success: false, error: 'Name is too long.' }
  }
  if (!input.position.trim()) {
    return { success: false, error: 'Position is required.' }
  }
  if (input.position.trim().length > 200) {
    return { success: false, error: 'Position is too long.' }
  }
  if (!input.submissionDate || !DATE_RE.test(input.submissionDate)) {
    return { success: false, error: 'A valid date (YYYY-MM-DD) is required.' }
  }
  if (!['AM', 'PM'].includes(input.shift)) {
    return { success: false, error: 'Please select a shift.' }
  }

  if (JSON.stringify(input.responses).length > 50_000) {
    return { success: false, error: 'Submission payload is too large.' }
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
