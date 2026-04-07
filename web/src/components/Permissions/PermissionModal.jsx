import { Button } from '@/components/ui/button'
import { Shield, Terminal, FileEdit, Globe, Wrench, X, Check, AlertTriangle, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

const kindConfig = {
  shell: { 
    icon: Terminal, 
    label: 'Shell Command', 
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    description: 'Execute a command in the terminal'
  },
  write: { 
    icon: FileEdit, 
    label: 'Write File', 
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    description: 'Create or modify a file'
  },
  read: { 
    icon: Eye, 
    label: 'Read File', 
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    description: 'Read file contents'
  },
  url: { 
    icon: Globe, 
    label: 'Open URL', 
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    description: 'Access a web resource'
  },
  mcp: { 
    icon: Wrench, 
    label: 'MCP Tool', 
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    description: 'Use an external tool'
  },
}

export function PermissionModal({ request, onApprove, onDeny, pendingCount }) {
  const config = kindConfig[request.kind] || { 
    icon: Shield, 
    label: request.kind, 
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    description: 'Perform an action'
  }
  const Icon = config.icon
  const detail = request.detail || {}

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-fade-in" 
        onClick={onDeny} 
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-[hsl(var(--card))] rounded-2xl border-2 border-[hsl(var(--border))] shadow-2xl animate-slide-in-bottom overflow-hidden">
        {/* Warning stripe */}
        <div className={cn("h-1.5 w-full", config.bgColor)} />
        
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-[hsl(var(--border))]">
          <div className={cn(
            "p-3.5 rounded-xl shadow-lg",
            config.bgColor
          )}>
            <Icon className={cn("h-7 w-7", config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-xl tracking-tight">Permission Required</h3>
              {pendingCount > 1 && (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-purple-600 text-white shadow-md">
                  +{pendingCount - 1} more
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-semibold", config.color)}>
                {config.label}
              </span>
              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                • {config.description}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
          {detail.command && (
            <DetailBlock label="Command" icon={Terminal}>
              <code className="text-sm font-mono text-amber-400">{detail.command}</code>
            </DetailBlock>
          )}

          {detail.path && (
            <DetailBlock label="File Path" icon={FileEdit}>
              <code className="text-sm font-mono text-blue-400 break-all">{detail.path}</code>
            </DetailBlock>
          )}

          {detail.url && (
            <DetailBlock label="URL" icon={Globe}>
              <code className="text-sm font-mono text-emerald-400 break-all">{detail.url}</code>
            </DetailBlock>
          )}

          {detail.description && (
            <DetailBlock label="Details" icon={AlertTriangle}>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{detail.description}</p>
            </DetailBlock>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary))/40]">
          <Button
            variant="outline"
            className="flex-1 h-12 text-base font-semibold border-2 hover:bg-[hsl(var(--destructive))/10] hover:border-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))] transition-all"
            onClick={onDeny}
          >
            <X className="h-5 w-5 mr-2" />
            Deny
          </Button>
          <Button
            className="flex-1 h-12 text-base font-semibold bg-gradient-to-br from-[hsl(var(--primary))] to-purple-600 hover:shadow-xl hover:shadow-[hsl(var(--primary))]/30 hover:scale-105 transition-all"
            onClick={onApprove}
          >
            <Check className="h-5 w-5 mr-2" />
            Approve
          </Button>
        </div>
      </div>
    </div>
  )
}

function DetailBlock({ label, icon: Icon, children }) {
  return (
    <div className="animate-scale-in">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="p-4 rounded-xl bg-[hsl(var(--code-bg))] border border-[hsl(var(--border))] overflow-x-auto shadow-inner">
        {children}
      </div>
    </div>
  )
}
