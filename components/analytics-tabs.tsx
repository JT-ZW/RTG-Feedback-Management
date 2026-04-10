'use client'

import { useState } from 'react'

const TABS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'trends',      label: 'Trends' },
  { id: 'sections',    label: 'Section Drill-Down' },
  { id: 'failures',    label: 'Failure Analysis' },
  { id: 'cadence',     label: 'Submission Cadence' },
  { id: 'ai',          label: 'AI Insights' },
]

interface Props {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function AnalyticsTabs({ activeTab, onTabChange }: Props) {
  return (
    <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1 flex-wrap">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === tab.id
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function useAnalyticsTab() {
  const [activeTab, setActiveTab] = useState('overview')
  return { activeTab, setActiveTab }
}
