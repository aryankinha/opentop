import { MessageSquare, Trash2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatRelativeTime, truncate } from '@/lib/utils'
import { useState } from 'react'

export function SessionItem({ session, isSelected, onSelect, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = (e) => {
    e.stopPropagation()
    if (confirmDelete) {
      onDelete(session.sessionId)
      setConfirmDelete(false)
    } else {
      setConfirmDelete(true)
      // Reset after 3 seconds
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <div
      onClick={() => onSelect(session.sessionId)}
      className={cn(
        'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
        isSelected
          ? 'bg-[hsl(var(--primary))]/10 border-l-2 border-[hsl(var(--primary))]'
          : 'hover:bg-[hsl(var(--secondary))] border-l-2 border-transparent'
      )}
    >
      <MessageSquare className="h-5 w-5 flex-shrink-0 text-[hsl(var(--muted-foreground))]" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {session.model || 'Chat'}
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            {session.messageCount || 0} msgs
          </span>
        </div>
        <div className="text-xs text-[hsl(var(--muted-foreground))]">
          {formatRelativeTime(session.createdAt)}
        </div>
      </div>

      <Button
        variant={confirmDelete ? 'destructive' : 'ghost'}
        size="icon"
        className="h-8 w-8 flex-shrink-0"
        onClick={handleDelete}
      >
        {confirmDelete ? (
          <Check className="h-4 w-4" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}
