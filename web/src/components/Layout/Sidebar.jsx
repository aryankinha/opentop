import { useState } from 'react'
import { X, Plus, MessageSquare, Trash2, Edit2, Check, MoreHorizontal, Settings, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useApp } from '@/context/AppContext'
import { cn } from '@/lib/utils'
import { UsageDisplay } from './UsageDisplay'

export function Sidebar({ isOpen, onClose, isMobile, onSettingsClick }) {
  const {
    sessions,
    sessionsLoading,
    currentSessionId,
    selectSession,
    deleteSession,
    updateSessionTitle,
    isConnected,
  } = useApp()

  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')

  // Group sessions by date
  const groupedSessions = groupSessionsByDate(sessions)

  const handleSelect = (sessionId) => {
    selectSession(sessionId)
    if (isMobile) onClose?.()
  }

  const handleNewSession = () => {
    selectSession(null)
    if (isMobile) onClose?.()
  }

  const handleDelete = async (e, sessionId) => {
    e.stopPropagation()
    if (confirm('Delete this conversation?')) {
      try {
        await deleteSession(sessionId)
      } catch (error) {
        console.error('Failed to delete:', error)
      }
    }
  }

  const startEditing = (e, session) => {
    e.stopPropagation()
    setEditingId(session.sessionId)
    setEditTitle(getSessionTitle(session))
  }

  const saveTitle = async (sessionId) => {
    if (!editTitle.trim()) {
      setEditingId(null)
      return
    }
    try {
      await updateSessionTitle(sessionId, editTitle.trim())
      setEditingId(null)
    } catch (error) {
      console.error('Failed to save:', error)
    }
  }

  if (isMobile && !isOpen) return null

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[hsl(var(--sidebar-bg))]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
        <span className="font-semibold text-lg">OpenTop</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewSession}
            disabled={!isConnected}
            className="h-9 w-9"
          >
            <Plus className="h-5 w-5" />
          </Button>
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9">
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Sessions */}
      <ScrollArea className="flex-1">
        {sessionsLoading ? (
          <div className="p-4 text-sm text-[hsl(var(--muted-foreground))]">Loading...</div>
        ) : Object.keys(groupedSessions).length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No conversations yet</p>
          </div>
        ) : (
          <div className="py-3">
            {Object.entries(groupedSessions).map(([group, groupSessions]) => (
              <div key={group} className="mb-4">
                <div className="px-4 py-2 text-[11px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  {group}
                </div>
                {groupSessions.map((session) => (
                  <SessionItem
                    key={session.sessionId}
                    session={session}
                    isSelected={session.sessionId === currentSessionId}
                    isEditing={editingId === session.sessionId}
                    editTitle={editTitle}
                    onEditTitleChange={setEditTitle}
                    onSelect={() => handleSelect(session.sessionId)}
                    onDelete={(e) => handleDelete(e, session.sessionId)}
                    onStartEdit={(e) => startEditing(e, session)}
                    onSaveTitle={() => saveTitle(session.sessionId)}
                    onCancelEdit={() => setEditingId(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-[hsl(var(--border))]">
        <UsageDisplay />
        <div className="px-3 pb-3">
          <Button
            variant="ghost"
            className="w-full justify-start h-10 px-3 text-sm text-[hsl(var(--muted-foreground))]"
            onClick={onSettingsClick}
          >
            <Settings className="h-4 w-4 mr-3" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
        <div className="fixed inset-y-0 left-0 w-[260px] z-50 animate-slide-in-left">
          {sidebarContent}
        </div>
      </>
    )
  }

  return (
    <div className="w-[var(--sidebar-width)] border-r border-[hsl(var(--border))] flex-shrink-0">
      {sidebarContent}
    </div>
  )
}

function SessionItem({ 
  session, 
  isSelected, 
  isEditing, 
  editTitle, 
  onEditTitleChange,
  onSelect, 
  onDelete,
  onStartEdit,
  onSaveTitle,
  onCancelEdit,
}) {
  const title = getSessionTitle(session)

  if (isEditing) {
    return (
      <div className="mx-3 p-3 rounded-lg bg-[hsl(var(--active-bg))]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => onEditTitleChange(e.target.value)}
            className="flex-1 px-3 py-2 text-sm bg-[hsl(var(--input-bg))] rounded-md border border-[hsl(var(--border))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveTitle()
              if (e.key === 'Escape') onCancelEdit()
            }}
          />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSaveTitle}>
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "group mx-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors flex items-center justify-between",
        isSelected ? "bg-[hsl(var(--active-bg))]" : "hover:bg-[hsl(var(--hover-bg))]"
      )}
      onClick={onSelect}
    >
      <span className="text-sm truncate flex-1">{title}</span>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={onStartEdit} className="py-2">
            <Edit2 className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-[hsl(var(--destructive))] py-2">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function getSessionTitle(session) {
  if (session.title) return session.title
  const firstUserMsg = session.messages?.find(m => m.role === 'user')
  if (firstUserMsg) {
    const title = firstUserMsg.content.slice(0, 40)
    return title.length < firstUserMsg.content.length ? title + '...' : title
  }
  return 'New conversation'
}

function groupSessionsByDate(sessions) {
  const groups = {}
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const lastWeek = new Date(today.getTime() - 7 * 86400000)

  const sorted = [...sessions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  for (const session of sorted) {
    const date = new Date(session.createdAt)
    let group
    if (date >= today) group = 'Today'
    else if (date >= yesterday) group = 'Yesterday'
    else if (date >= lastWeek) group = 'Previous 7 days'
    else group = 'Older'

    if (!groups[group]) groups[group] = []
    groups[group].push(session)
  }

  return groups
}
