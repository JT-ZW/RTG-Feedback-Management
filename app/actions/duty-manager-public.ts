'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { computeDMScores, DM_MAX_SCORE } from '@/lib/duty-manager-sections'
import type { DutyManagerResponses, RoomCheck } from '@/lib/duty-manager-sections'

export interface DutyManagerSubmitInput {
  propertyId: string
  shiftDate: string
  shift: 'AM' | 'PM'
  managerName: string
  responses: DutyManagerResponses
  roomChecks: RoomCheck[]
}

export interface DutyManagerSubmitResult {
  success: boolean
  error?: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function submitPublicDutyManagerForm(
  input: DutyManagerSubmitInput
): Promise<DutyManagerSubmitResult> {
  if (!input.propertyId || !UUID_RE.test(input.propertyId)) {
    return { success: false, error: 'Invalid property.' }
  }
  if (!input.managerName.trim()) {
    return { success: false, error: 'Manager name is required.' }
  }
  if (input.managerName.trim().length > 200) {
    return { success: false, error: 'Manager name is too long.' }
  }
  if (!input.shiftDate || !DATE_RE.test(input.shiftDate)) {
    return { success: false, error: 'A valid shift date (YYYY-MM-DD) is required.' }
  }
  if (!['AM', 'PM'].includes(input.shift)) {
    return { success: false, error: 'Please select a shift.' }
  }

  if (
    JSON.stringify(input.responses).length > 50_000 ||
    JSON.stringify(input.roomChecks).length > 50_000
  ) {
    return { success: false, error: 'Submission payload is too large.' }
  }

  const admin = createAdminClient()

  // Validate property exists
  const { data: property } = await admin
    .from('properties')
    .select('id, organization_id')
    .eq('id', input.propertyId)
    .single()

  if (!property) {
    return { success: false, error: 'Property not found. Please contact support.' }
  }

  const { totalActual, percentage } = computeDMScores(input.responses)

  const { error } = await admin
    .from('duty_manager_submissions')
    .insert({
      organization_id: property.organization_id,
      property_id: property.id,
      submitted_by: null,
      shift_date: input.shiftDate,
      shift: input.shift,
      manager_name: input.managerName.trim(),
      responses: JSON.stringify(input.responses),
      room_checks: JSON.stringify(input.roomChecks),
      total_score: totalActual,
      max_score: DM_MAX_SCORE,
      percentage,
      status: 'submitted',
    })

  if (error) {
    console.error('Duty manager submission error:', error.message)
    return { success: false, error: 'Failed to save submission. Please try again.' }
  }

  return { success: true }
}
