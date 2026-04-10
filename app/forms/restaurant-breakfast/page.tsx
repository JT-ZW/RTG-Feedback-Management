import { PublicBreakfastChecklistForm } from '@/components/public-breakfast-checklist-form'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = {
  title: 'Restaurant Breakfast Checklist — RTG Hotels',
  description: 'Rainbow Tourism Group Restaurant Breakfast Compliance Checklist',
}

export default async function PublicBreakfastChecklistPage() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('properties')
    .select('id, name')
    .order('name', { ascending: true })

  const properties = (data ?? []).map(p => ({ id: p.id, name: p.name }))

  return <PublicBreakfastChecklistForm properties={properties} />
}
