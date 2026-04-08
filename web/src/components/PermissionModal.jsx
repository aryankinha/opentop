import React, { useState, useEffect } from 'react'

function formatPermissionDetail(request) {
  const detail = request?.detail

  if (!detail) return 'No details available'
  if (typeof detail === 'string') return detail

  if (typeof detail === 'object') {
    if (typeof detail.command === 'string' && detail.command.trim()) return detail.command
    if (typeof detail.path === 'string' && detail.path.trim()) return detail.path
    if (typeof detail.url === 'string' && detail.url.trim()) return detail.url
    if (typeof detail.description === 'string' && detail.description.trim()) return detail.description

    try {
      return JSON.stringify(detail)
    } catch {
      return 'Unsupported permission detail'
    }
  }

  return String(detail)
}

export default function PermissionModal({ request, onAllow, onDeny }) {
  const [countdown, setCountdown] = useState(60)
  const kind = request?.kind || request?.detail?.kind || 'unknown'
  const detailText = formatPermissionDetail(request)

  useEffect(() => {
    setCountdown(60)
  }, [request?.id])

  useEffect(() => {
    if (countdown <= 0) {
      onDeny?.()
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, onDeny])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center
      justify-center p-4 bg-black/50 backdrop-blur-sm">

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl
        overflow-hidden">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              kind === 'shell' ? 'bg-red-100 text-red-700' :
              kind === 'write' ? 'bg-orange-100 text-orange-700' :
              kind === 'read'  ? 'bg-blue-100 text-blue-700' :
              kind === 'url'   ? 'bg-purple-100 text-purple-700' :
              'bg-green-100 text-green-700'
            }`}>
              {kind}
            </div>
            <h2 className="font-semibold text-gray-900">Permission Request</h2>
          </div>
        </div>

        {/* Detail */}
        <div className="px-5 py-4">
          <p className="text-xs text-gray-500 mb-2">Copilot wants to run:</p>
          <div className="bg-gray-900 rounded-xl px-4 py-3">
            <code className="text-green-400 text-xs font-mono break-all">
              {detailText}
            </code>
          </div>
        </div>

        {/* Countdown */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-1">
              <div
                className="bg-amber-500 h-1 rounded-full transition-all"
                style={{ width: `${(countdown / 60) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 w-12 text-right">
              {countdown}s
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onDeny}
            className="flex-1 py-2.5 border border-gray-300 text-gray-700
              rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Deny
          </button>
          <button
            onClick={onAllow}
            className="flex-1 py-2.5 bg-[#1a1a1a] text-white rounded-xl
              text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  )
}
