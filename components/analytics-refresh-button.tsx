'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react'
import { generateOrgInsights } from '@/app/actions/analytics'
import { useRouter } from 'next/navigation'

export function AnalyticsRefreshButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleRefresh() {
    setLoading(true)
    setError(null)
    const result = await generateOrgInsights()
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error ?? 'Unknown error')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rtg-brown hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {loading ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {loading ? 'Generating insights…' : 'Generate AI Insights'}
      </button>
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
