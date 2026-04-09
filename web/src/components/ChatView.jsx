import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { FolderOpen, Menu, MessageSquarePlus } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'
import EmptyChat from './EmptyChat'
import ChatInput from './ChatInput'

export default function ChatView({ sessionId, onOpenSidebar }) {
  const { sessions, messages, sendMessage, cancelMessage, isSending, sendError } = useApp()
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  const session = sessions.find((item) => item.sessionId === sessionId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isSending])

  const handleSend = async (text, model) => {
    if (!text.trim() || isSending) return

    const currentInput = text
    setInput('')

    try {
      await sendMessage(currentInput, { model })
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="relative flex h-full min-h-screen flex-col bg-[rgba(20,18,16,0.72)] md:min-h-0">
      <header className="sticky top-0 z-20 border-b border-white/6 bg-[linear-gradient(180deg,rgba(24,21,19,0.95),rgba(24,21,19,0.82))] px-4 py-4 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <button
            className="rounded-2xl border border-white/8 bg-white/[0.04] p-2 text-[var(--color-app-muted)] transition hover:bg-white/[0.08] hover:text-[var(--color-app-text)] md:hidden"
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--color-app-text)]">
              {session?.title || session?.name || 'OpenTop conversation'}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-app-muted)]">
              <span>{session?.model || 'claude-sonnet-4.5'}</span>
              {session?.project?.path && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.04] px-2 py-1">
                  <FolderOpen className="h-3.5 w-3.5" />
                  {session.project.name}
                </span>
              )}
            </div>
          </div>

          <div className="hidden rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-[var(--color-app-muted)] md:flex">
            Synced with your Mac
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto flex min-h-full max-w-4xl flex-col px-4 pb-36 pt-6 md:px-8 md:pt-8">
          {sendError && (
            <div className="mb-6 rounded-[22px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              <p className="font-medium">Message failed to send</p>
              <p className="mt-1 text-rose-200/80">{sendError}</p>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-8">
              <EmptyChat sessionName={session?.name} project={session?.project} />
            </div>
          ) : (
            <div className="space-y-1">
              <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                  <MessageBubble
                    key={`${message.timestamp || index}-${message.role}-${index}`}
                    message={message}
                    sessionModel={session?.model || null}
                  />
                ))}
              </AnimatePresence>

              {isSending && <TypingIndicator />}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-[linear-gradient(180deg,transparent,rgba(20,18,16,0.92)_30%,rgba(20,18,16,1)_100%)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 md:absolute md:px-8">
        <div className="pointer-events-auto mx-auto max-w-4xl">
          {messages.length > 0 && (
            <div className="mb-3 hidden items-center gap-2 text-xs text-[var(--color-app-muted)] md:flex">
              <MessageSquarePlus className="h-3.5 w-3.5" />
              Ask a follow-up, switch models, or keep working in this session.
            </div>
          )}
          <ChatInput
            input={input}
            setInput={setInput}
            onSend={handleSend}
            onCancel={cancelMessage}
            isLoading={isSending}
            initialModel={session?.model || null}
          />
        </div>
      </div>
    </div>
  )
}
