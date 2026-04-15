import { getAnalyticsData } from '@/app/actions/analytics'
import { getDiningSurveyTrends } from '@/app/actions/dining-survey-public'
import { AnalyticsDashboard } from '@/components/analytics-dashboard'

export default async function AnalyticsPage() {
  const [data, diningTrends] = await Promise.all([
    getAnalyticsData(),
    getDiningSurveyTrends(30),
  ])
  return <AnalyticsDashboard data={data} initialDiningTrends={diningTrends} />
}
