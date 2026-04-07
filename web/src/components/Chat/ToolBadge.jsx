import { Terminal, FileEdit, Globe, Wrench, Eye, FolderSearch } from 'lucide-react'
import { cn } from '@/lib/utils'

const toolConfig = {
  shell: { icon: Terminal, label: 'Shell', color: 'text-amber-400 bg-amber-500/10' },
  write: { icon: FileEdit, label: 'Write', color: 'text-rose-400 bg-rose-500/10' },
  read: { icon: Eye, label: 'Read', color: 'text-emerald-400 bg-emerald-500/10' },
  url: { icon: Globe, label: 'Web', color: 'text-blue-400 bg-blue-500/10' },
  mcp: { icon: Wrench, label: 'Tool', color: 'text-violet-400 bg-violet-500/10' },
  search: { icon: FolderSearch, label: 'Search', color: 'text-cyan-400 bg-cyan-500/10' },
}

export function ToolBadge({ tool }) {
  const config = toolConfig[tool] || { icon: Wrench, label: tool, color: 'text-gray-400 bg-gray-500/10' }
  const Icon = config.icon

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      config.color
    )}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}
