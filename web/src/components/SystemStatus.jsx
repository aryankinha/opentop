import React, { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useApp } from '@/context/AppContext'

export default function SystemStatus({ isExpanded = true }) {
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

  if (!isExpanded) {
    return (
      <div className="w-full flex justify-center py-4" title={isConnected ? `Connected: ${displayUrl}` : 'Disconnected'}>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500/80'}`} />
      </div>
    )
  }

  return (
    <div className="w-full px-4 py-2 flex flex-col gap-1.5 opacity-90 transition-opacity hover:opacity-100">
      <div className="flex items-center gap-2">
         <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500/80'}`} />
         <div className="flex flex-col">
            <span className="text-[11px] text-zinc-300 font-medium tracking-wide">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {isConnected && (
               <span className="text-[10px] text-zinc-500 -mt-0.5 max-w-[150px] truncate">
                 {displayUrl}
               </span>
            )}
         </div>
      </div>
      
      {isConnected && (
        <div className="flex flex-col gap-1 pl-3.5 mt-0.5">
           <span className="text-[10px] text-zinc-500 font-mono tracking-tight">
              {usageDisplay.label}
           </span>
           {usageDisplay.subLabel && (
             <span className="text-[10px] text-zinc-600 -mt-0.5">
               {usageDisplay.subLabel}
             </span>
           )}
           <div className="w-20 h-[2px] bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${usageDisplay.unlimited ? 'bg-emerald-500/80' : 'bg-zinc-500'}`}
                style={{ width: `${usageDisplay.percent}%` }}
              />
           </div>
        </div>
      )}
    </div>
  )
}

