import React, { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useApp } from '@/context/AppContext'

export default function SystemStatus() {
  const { serverUrl, isConnected } = useApp()
  const [usage, setUsage] = useState(null)

  useEffect(() => {
    let mounted = true
    const fetchUsage = async () => {
      try {
        const data = await api.getUsage()
        if (mounted) setUsage(data)
      } catch (e) {
        console.error('Failed to load usage data')
      }
    }
    
    if (isConnected) {
      fetchUsage()
      // Refresh usage periodically
      const interval = setInterval(fetchUsage, 60000)
      return () => {
        mounted = false
        clearInterval(interval)
      }
    }
    return () => { mounted = false }
  }, [isConnected])

  // Truncate URL nicely
  const displayUrl = serverUrl?.replace(/^https?:\/\//, '') || 'Disconnected'
  
  // Format tokens
  const formatTokens = (val) => {
    if (val === undefined) return '0'
    if (val > 1000000) return (val / 1000000).toFixed(1) + 'M'
    if (val > 1000) return (val / 1000).toFixed(1) + 'k'
    return val.toString()
  }

  const normalizeUsage = (data) => {
    if (!data) {
      return {
        label: 'Loading usage...',
        subLabel: '',
        percent: 0,
        unlimited: false,
      }
    }

    // New backend format from /usage (Copilot quota)
    if (data.unlimited) {
      return {
        label: 'Unlimited',
        subLabel: data.plan ? `Plan: ${data.plan}` : '',
        percent: 100,
        unlimited: true,
      }
    }

    if (typeof data.total === 'number' && typeof data.remaining === 'number') {
      const total = Math.max(0, data.total)
      const used = Math.max(0, total - Math.max(0, data.remaining))
      const percent = total > 0
        ? Math.min(100, Math.max(0, Math.round((used / total) * 100)))
        : Math.min(100, Math.max(0, 100 - Number(data.percentRemaining || 0)))

      return {
        label: `${formatTokens(used)} / ${formatTokens(total)}`,
        subLabel: data.plan ? `Plan: ${data.plan}` : '',
        percent,
        unlimited: false,
      }
    }

    // Legacy format fallback
    if (typeof data.totalTokens === 'number' && typeof data.quotaLimit === 'number') {
      return {
        label: `${formatTokens(data.totalTokens)} / ${formatTokens(data.quotaLimit)}`,
        subLabel: '',
        percent: Math.min(100, Math.max(0, data.quotaUsedPercent || 0)),
        unlimited: false,
      }
    }

    return {
      label: 'Usage unavailable',
      subLabel: '',
      percent: 0,
      unlimited: false,
    }
  }

  const usageDisplay = normalizeUsage(usage)

  return (
    <div className="rounded-[18px] border border-white/6 bg-black/10 p-2.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-app-muted)]">
            Connection
          </p>
          <p className="mt-1 text-[13px] font-medium text-[var(--color-app-text)]">
            {isConnected ? 'Connected' : 'Disconnected'}
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--color-app-muted)]">
            {displayUrl}
          </p>
        </div>
        <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.45)]' : 'bg-rose-400'}`} />
      </div>

      {isConnected && (
        <div className="mt-2.5 rounded-2xl border border-white/6 bg-white/[0.03] p-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-[var(--color-app-muted)]">Usage</span>
            <span className="font-mono text-[var(--color-app-text)]">{usageDisplay.label}</span>
          </div>
          {usageDisplay.subLabel && (
            <p className="mt-1 text-xs text-[var(--color-app-muted)]">{usageDisplay.subLabel}</p>
          )}
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className={`h-full rounded-full transition-all duration-500 ${usageDisplay.unlimited ? 'bg-emerald-400' : 'bg-amber-300'}`}
              style={{ width: `${usageDisplay.percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
