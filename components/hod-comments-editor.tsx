'use client'

import { useState, useTransition } from 'react'
import { updateHodComments } from '@/app/actions/duty-manager-hod'
import { MessageSquare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function HodCommentsEditor({
  submissionId,
  initialComments,
}: {
  submissionId: string
  initialComments: string | null
}) {
  const [value, setValue] = useState(initialComments ?? '')
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await updateHodComments(submissionId, value)
      if (result.success) {
        toast.success('Comments saved successfully.')
      } else {
        toast.error(result.error ?? 'Failed to save.')
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-stone-100 bg-amber-50">
        <MessageSquare className="w-4 h-4 text-amber-600 shrink-0" />
        <h2 className="text-sm font-semibold text-amber-900">HOD Comments & Action (Following Day)</h2>
      </div>
      <div className="p-5">
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Enter HOD comments and follow-up actions here…"
          rows={5}
          className="w-full border border-stone-200 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
        <div className="flex items-center justify-end mt-3">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-1.5 bg-stone-900 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isPending ? 'Saving…' : 'Save Comments'}
          </button>
        </div>
      </div>
    </div>
  )
}
