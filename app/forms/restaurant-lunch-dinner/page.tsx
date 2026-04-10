import { PublicRestaurantLunchDinnerForm } from '@/components/public-restaurant-lunch-dinner-form'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = {
  title: 'Restaurant Checklist (Lunch & Dinner) — RTG Hotels',
  description: 'Rainbow Tourism Group Restaurant Lunch & Dinner Shift Compliance Checklist',
}

export default async function PublicRestaurantLunchDinnerPage() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('properties')
    .select('id, name')
    .order('name', { ascending: true })

  const properties = (data ?? []).map(p => ({ id: p.id, name: p.name }))

  return <PublicRestaurantLunchDinnerForm properties={properties} />
}
