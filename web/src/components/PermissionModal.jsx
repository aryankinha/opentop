import React, { useEffect, useState } from 'react'

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

function getKindTone(kind) {
  switch (kind) {
    case 'shell':
      return 'border-rose-400/20 bg-rose-500/10 text-rose-100'
    case 'write':
      return 'border-amber-400/20 bg-amber-500/10 text-amber-100'
    case 'read':
      return 'border-sky-400/20 bg-sky-500/10 text-sky-100'
    default:
      return 'border-white/10 bg-white/[0.05] text-[var(--color-app-text)]'
  }
}

export default function PermissionModal({ request, onAllow, onDeny, onAllowAlways }) {
  const [countdown, setCountdown] = useState(60)
  const kind = request?.kind || request?.detail?.kind || 'unknown'
  const detailText = formatPermissionDetail(request)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setCountdown(60)
  }, [request?.id])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (countdown <= 0) {
      onDeny?.()
      return
    }

    const timeoutId = setTimeout(() => setCountdown((value) => value - 1), 1000)
    return () => clearTimeout(timeoutId)
  }, [countdown, onDeny])

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-4 backdrop-blur-md sm:items-center">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-[30px] border border-[var(--color-app-border)] bg-[var(--color-app-panel-strong)] shadow-[0_32px_120px_rgba(0,0,0,0.55)]">
        <div className="shrink-0 border-b border-white/6 px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--color-app-muted)]">
                Permission request
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--color-app-text)]">
                OpenTop needs approval
              </h2>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getKindTone(kind)}`}>
              {kind}
            </span>
          </div>
        </div>

        <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5">
          <div>
            <p className="mb-2 text-sm text-[var(--color-app-muted)]">
              Copilot is asking to run this action:
            </p>
            <div className="overflow-x-auto rounded-[24px] border border-white/6 bg-black/20 p-4">
              <code className="text-sm break-all text-[var(--color-app-text)]">{detailText}</code>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-app-muted)]">
              <span>Auto-denies in</span>
              <span>{countdown}s</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-amber-300 transition-all"
                style={{ width: `${(countdown / 60) * 100}%` }}
              />
            </div>
          </div>

          {onAllowAlways && kind !== 'unknown' && (
            <button
              onClick={onAllowAlways}
              className="w-full rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-[var(--color-app-text)] transition hover:bg-white/[0.08]"
            >
              Always allow this type ({kind})
            </button>
          )}

          <div className="flex gap-3">
            <button
              onClick={onDeny}
              className="flex-1 rounded-[22px] border border-white/8 px-4 py-3 text-sm font-medium text-[var(--color-app-muted)] transition hover:bg-white/[0.05] hover:text-[var(--color-app-text)]"
            >
              Deny
            </button>
            <button
              onClick={onAllow}
              className="flex-1 rounded-[22px] bg-[var(--color-app-text)] px-4 py-3 text-sm font-semibold text-[#181513] transition hover:bg-[#fff8ef]"
            >
              Allow
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
