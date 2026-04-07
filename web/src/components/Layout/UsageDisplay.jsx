import { useEffect, useState } from 'react'
import { Activity, Zap, TrendingUp } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/**
 * Format token count for display (e.g., 125000 -> "125K")
 */
function formatTokens(tokens) {
  if (tokens >= 1000000) {
    return (tokens / 1000000).toFixed(1) + 'M'
  }
  if (tokens >= 1000) {
    return Math.round(tokens / 1000) + 'K'
  }
  return tokens.toString()
}

/**
 * Simple horizontal progress bar
 */
function ProgressBar({ percentage }) {
  const getColor = () => {
    if (percentage >= 90) return 'bg-rose-500'
    if (percentage >= 70) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  return (
    <div className="h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
      <div 
        className={cn("h-full rounded-full transition-all duration-500", getColor())}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  )
}

/**
 * Compact usage display for sidebar footer
 */
export function UsageDisplay({ className }) {
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchUsage()
    const interval = setInterval(fetchUsage, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchUsage = async () => {
    try {
      const data = await api.getUsage()
      setUsage(data)
      setError(false)
    } catch (err) {
      console.error('Failed to fetch usage:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  // Show fallback when loading briefly or on error
  const showFallback = loading || error || !usage

  // Calculate percentage used (100 - percentRemaining)
  const percentUsed = showFallback ? 0 : (100 - (usage.percentRemaining || 0))
  const remaining = showFallback ? 0 : (usage.remaining || 0)
  const total = showFallback ? 300 : (usage.total || 300)
  const unlimited = usage?.unlimited || false

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          "px-4 py-3 cursor-pointer hover:bg-[hsl(var(--hover-bg))] transition-colors",
          className
        )}>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                <Zap className="h-3 w-3" />
                {unlimited ? 'Copilot' : 'Remaining'}
              </span>
              <span className="font-medium">
                {loading ? '—' : unlimited ? '∞' : `${usage.percentRemaining?.toFixed(1)}%`}
              </span>
            </div>
            {!unlimited && <ProgressBar percentage={percentUsed} />}
            <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
              {loading ? 'Loading...' : error ? 'Offline' : unlimited ? 'Unlimited plan' : `${remaining} / ${total} reqs left`}
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[200px]">
        <div className="space-y-1">
          <p className="font-medium">Copilot Quota</p>
          {error ? (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Backend not connected
            </p>
          ) : unlimited ? (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Unlimited plan
            </p>
          ) : (
            <>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Remaining: {usage?.percentRemaining?.toFixed(1)}% ({remaining} reqs)
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Resets in {usage?.daysUntilReset || 0} days
              </p>
              {usage?.stale && (
                <p className="text-xs text-amber-400">
                  ⚠️ Cached data (API unavailable)
                </p>
              )}
            </>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Detailed usage display for settings
 */
export function UsageDetails({ className }) {
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const usageData = await api.getUsage()
      setUsage(usageData)
    } catch (error) {
      console.error('Failed to fetch usage:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !usage) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="h-24 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />
        <div className="h-20 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />
      </div>
    )
  }

  const { percentRemaining, remaining, total, unlimited, resetDate, daysUntilReset, plan, stale } = usage
  const percentUsed = 100 - (percentRemaining || 0)

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main stats card */}
      <div className={cn(
        "p-4 rounded-xl border transition-colors",
        unlimited 
          ? "bg-emerald-500/5 border-emerald-500/20"
          : percentUsed >= 90 
            ? "bg-rose-500/5 border-rose-500/20" 
            : percentUsed >= 70
              ? "bg-amber-500/5 border-amber-500/20"
              : "bg-emerald-500/5 border-emerald-500/20"
      )}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Copilot Quota</h4>
            <span className="text-lg font-bold">
              {unlimited ? '∞' : `${percentRemaining?.toFixed(1)}%`}
            </span>
          </div>
          {!unlimited && <ProgressBar percentage={percentUsed} />}
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {unlimited ? 'Unlimited requests' : `${remaining} of ${total} requests remaining`}
          </p>
          {!unlimited && (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Resets {resetDate} ({daysUntilReset} days)
            </p>
          )}
          {plan && (
            <p className="text-xs text-[hsl(var(--muted-foreground))] capitalize">
              Plan: {plan.replace(/_/g, ' ')}
            </p>
          )}
          {stale && (
            <p className="text-xs text-amber-400">
              ⚠️ Showing cached data (API unavailable)
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
