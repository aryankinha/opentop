import { useEffect, useState } from 'react'
import { Menu, Settings, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/context/AppContext'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export function Header({ onMenuClick, onSettingsClick }) {
  const { isConnected } = useApp()
  const [usagePercent, setUsagePercent] = useState(null)

  useEffect(() => {
    fetchUsage()
    const interval = setInterval(fetchUsage, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const fetchUsage = async () => {
    try {
      const data = await api.getUsage()
      // Use percentRemaining from new API response
      setUsagePercent(data.unlimited ? null : data.percentRemaining)
    } catch (err) {
      // Silently fail - sidebar has full display
    }
  }

  const getUsageColor = () => {
    if (usagePercent === null) return 'text-[hsl(var(--muted-foreground))]'
    const percentUsed = 100 - usagePercent
    if (percentUsed >= 90) return 'text-rose-400'
    if (percentUsed >= 70) return 'text-amber-400'
    return 'text-emerald-400'
  }

  return (
    <header className="flex items-center justify-between px-4 h-14 border-b border-[hsl(var(--border))] bg-[hsl(var(--sidebar-bg))]">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="h-9 w-9">
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-medium text-lg">OpenTop</span>
        {!isConnected && (
          <span className="text-xs text-[hsl(var(--muted-foreground))]">• Offline</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Usage badge */}
        {usagePercent !== null && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            "bg-[hsl(var(--secondary))]",
            getUsageColor()
          )}>
            <Zap className="h-3 w-3" />
            {usagePercent.toFixed(1)}%
          </div>
        )}
        
        <Button variant="ghost" size="icon" onClick={onSettingsClick} className="h-9 w-9">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
