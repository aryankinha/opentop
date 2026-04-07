import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function ConnectionStatus({ isConnected, isConnecting }) {
  const status = isConnecting ? 'connecting' : isConnected ? 'connected' : 'disconnected'
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-all shadow-sm',
            isConnected 
              ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30' 
              : isConnecting 
                ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30 animate-pulse'
                : 'text-rose-400 bg-rose-500/15 border border-rose-500/30'
          )}
        >
          {isConnecting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isConnected ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
          ) : (
            <WifiOff className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">
            {isConnecting ? 'Connecting' : isConnected ? 'Connected' : 'Offline'}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isConnecting ? 'Connecting to server...' : isConnected ? 'Connected to OpenTop server' : 'Not connected to server'}
      </TooltipContent>
    </Tooltip>
  )
}
