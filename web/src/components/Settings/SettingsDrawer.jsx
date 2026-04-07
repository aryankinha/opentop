import { useState } from 'react'
import { X, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useApp } from '@/context/AppContext'
import { cn } from '@/lib/utils'

export function SettingsDrawer({ isOpen, onClose }) {
  const { serverUrl, setServerUrl, checkConnection, isConnected, isConnecting } = useApp()
  const [url, setUrl] = useState(serverUrl)

  const handleSave = async () => {
    setServerUrl(url)
    await checkConnection()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 w-72 max-w-[85vw] bg-[hsl(var(--sidebar-bg))] z-50 flex flex-col animate-slide-in-right border-l border-[hsl(var(--border))]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-[hsl(var(--border))]">
          <span className="font-medium">Settings</span>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Server */}
          <div>
            <label className="text-xs text-[hsl(var(--muted-foreground))] mb-2 block">Server URL</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:3000"
              className="h-9 text-sm bg-[hsl(var(--input-bg))]"
            />
          </div>

          {/* Status */}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">Status</span>
            <span className={cn(
              "text-sm",
              isConnected ? "text-[hsl(var(--success))]" : "text-[hsl(var(--destructive))]"
            )}>
              {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleSave}
            disabled={isConnecting}
          >
            <RefreshCw className={cn("h-3 w-3 mr-2", isConnecting && "animate-spin")} />
            {url !== serverUrl ? 'Save & Connect' : 'Reconnect'}
          </Button>

          {/* Commands */}
          <div className="pt-3 border-t border-[hsl(var(--border))]">
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">Commands</p>
            <div className="space-y-1 text-xs">
              <div className="p-2 rounded bg-[hsl(var(--code-bg))] font-mono">opentop start</div>
              <div className="p-2 rounded bg-[hsl(var(--code-bg))] font-mono">opentop start --tunnel</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[hsl(var(--border))] text-center text-xs text-[hsl(var(--muted-foreground))]">
          OpenTop v0.1.0
        </div>
      </div>
    </>
  )
}
