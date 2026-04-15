'use client'

import { useState, useRef } from 'react'
import QRCode from 'react-qr-code'
import { QrCode, Download, X, ExternalLink } from 'lucide-react'
import { CopyLinkButton } from '@/components/copy-link-button'

interface Property {
  id: string
  name: string
  code: string
}

interface PropertyQrCodesProps {
  properties: Property[]
  baseUrl: string
}

export function PropertyQrCodes({ properties, baseUrl }: PropertyQrCodesProps) {
  const [selected, setSelected] = useState<Property | null>(null)
  const qrRef = useRef<HTMLDivElement>(null)

  const surveyUrl = (p: Property) =>
    `${baseUrl}/forms/dining-survey/${p.code.toLowerCase()}`

  function downloadPng(property: Property) {
    const svgEl = qrRef.current?.querySelector('svg')
    if (!svgEl) return

    const size = 512
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svgEl)
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      URL.revokeObjectURL(url)

      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `${property.name.replace(/\s+/g, '-').toLowerCase()}-dining-survey-qr.png`
      a.click()
    }
    img.src = url
  }

  return (
    <>
      {/* Property list with QR buttons */}
      <div className="divide-y divide-stone-100">
        {properties.map((p) => {
          const url = surveyUrl(p)
          return (
            <div key={p.id} className="py-3 flex items-center justify-between gap-4">
              <p className="text-sm text-stone-700 font-medium">{p.name}</p>
              <div className="flex items-center gap-2 min-w-0">
                <code className="text-xs text-stone-400 truncate max-w-xs hidden sm:block">
                  /forms/dining-survey/{p.code.toLowerCase()}
                </code>
                <CopyLinkButton text={url} />
                <button
                  onClick={() => setSelected(p)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-colors"
                  title="Show QR code"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  QR
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal overlay */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 flex flex-col items-center gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="w-full flex items-start justify-between">
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-widest font-semibold">Guest Dining Survey</p>
                <h2 className="text-lg font-bold text-stone-900 mt-0.5">{selected.name}</h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-stone-500" />
              </button>
            </div>

            {/* QR code */}
            <div ref={qrRef} className="p-5 bg-white border-2 border-stone-100 rounded-2xl">
              <QRCode
                value={surveyUrl(selected)}
                size={220}
                bgColor="#ffffff"
                fgColor="#1c1917"
                level="M"
              />
            </div>

            {/* URL */}
            <p className="text-xs text-stone-400 text-center break-all px-2">
              {surveyUrl(selected)}
            </p>

            {/* Actions */}
            <div className="flex gap-3 w-full">
              <button
                onClick={() => downloadPng(selected)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-700 text-white text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </button>
              <a
                href={surveyUrl(selected)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
