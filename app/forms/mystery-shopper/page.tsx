import { PublicMysteryShopperForm } from '@/components/public-mystery-shopper-form'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = {
  title: 'Mystery Shopper Checklist — RTG Hotels',
  description: 'Rainbow Tourism Group Mystery Shopper Audit Form',
}

export default async function PublicMysteryShopperPage() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('properties')
    .select('id, name')
    .order('name', { ascending: true })

  const properties = (data ?? []).map(p => ({ id: p.id, name: p.name }))

  return <PublicMysteryShopperForm properties={properties} />
}
