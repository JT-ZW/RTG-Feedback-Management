'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { computeBarScores, BAR_CHECKLIST_TOTAL, type BarChecklistResponses } from '@/lib/bar-checklist-items'

export interface BarChecklistSubmitInput {
  propertyId: string
  submissionDate: string
  outlet: string
  submitterName: string
  position: string
  responses: BarChecklistResponses
}

export interface BarChecklistSubmitResult {
  success: boolean
  error?: string
}

export async function submitPublicBarChecklist(
  input: BarChecklistSubmitInput
): Promise<BarChecklistSubmitResult> {
  if (!input.submitterName.trim()) {
    return { success: false, error: 'Name is required.' }
  }
  if (!input.outlet.trim()) {
    return { success: false, error: 'Outlet is required.' }
  }
  if (!input.position.trim()) {
    return { success: false, error: 'Position is required.' }
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

  const { yesCount, percentage } = computeBarScores(input.responses)

  const { error } = await admin
    .from('bar_checklist_submissions')
    .insert({
      organization_id: property.organization_id,
      property_id: property.id,
      submission_date: input.submissionDate,
      outlet: input.outlet.trim(),
      submitter_name: input.submitterName.trim(),
      position: input.position.trim(),
      responses: JSON.stringify(input.responses),
      yes_count: yesCount,
      total_items: BAR_CHECKLIST_TOTAL,
      compliance_score: percentage,
      status: 'submitted',
    })

  if (error) {
    console.error('Bar checklist submission error:', error.message)
    return { success: false, error: 'Failed to save submission. Please try again.' }
  }

  return { success: true }
}
