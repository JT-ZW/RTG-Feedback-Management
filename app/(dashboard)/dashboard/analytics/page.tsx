import { getAnalyticsData } from '@/app/actions/analytics'
import { AnalyticsDashboard } from '@/components/analytics-dashboard'

export default async function AnalyticsPage() {
  const data = await getAnalyticsData()
  return <AnalyticsDashboard data={data} />
}
