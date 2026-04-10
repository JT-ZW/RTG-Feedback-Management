'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface UpdateHodCommentsResult {
  success: boolean
  error?: string
}

export async function updateHodComments(
  submissionId: string,
  hodComments: string
): Promise<UpdateHodCommentsResult> {
  if (!submissionId) return { success: false, error: 'Invalid submission.' }

  const admin = createAdminClient()

  const { error } = await admin
    .from('duty_manager_submissions')
    .update({
      hod_comments: hodComments.trim() || null,
      status: hodComments.trim() ? 'reviewed' : 'submitted',
    })
    .eq('id', submissionId)

  if (error) {
    console.error('HOD comments update error:', error.message)
    return { success: false, error: 'Failed to save comments. Please try again.' }
  }

  revalidatePath(`/dashboard/duty-manager/${submissionId}`)
  revalidatePath('/dashboard/duty-manager')
  return { success: true }
}
