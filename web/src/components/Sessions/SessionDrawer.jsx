import { X, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SessionItem } from './SessionItem'
import { useApp } from '@/context/AppContext'

export function SessionDrawer({ isOpen, onClose }) {
  const {
    sessions,
    sessionsLoading,
    currentSessionId,
    selectSession,
    deleteSession,
    isConnected,
  } = useApp()

  const handleSelect = (sessionId) => {
    selectSession(sessionId)
    onClose()
  }

  const handleNewSession = () => {
    selectSession(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in-0"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-[hsl(var(--card))] z-50 flex flex-col animate-in slide-in-from-left">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-[hsl(var(--border))]">
          <h2 className="font-semibold">Conversations</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <Button
            className="w-full"
            onClick={handleNewSession}
            disabled={!isConnected}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Conversation
          </Button>
        </div>

        {/* Session List */}
        <ScrollArea className="flex-1">
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                No conversations yet
              </p>
            </div>
          ) : (
            <div className="py-2">
              {sessions.map((session) => (
                <SessionItem
                  key={session.sessionId}
                  session={session}
                  isSelected={session.sessionId === currentSessionId}
                  onSelect={handleSelect}
                  onDelete={deleteSession}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </>
  )
}
