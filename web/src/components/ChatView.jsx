import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Menu } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'
import EmptyChat from './EmptyChat'
import ChatInput from './ChatInput'

export default function ChatView({ sessionId, onOpenSidebar }) {
  const { sessions, messages, sendMessage, cancelMessage, isSending, sendError } = useApp()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  const session = sessions.find((item) => item.sessionId === sessionId)

  // ✅ Smooth auto-scroll (only when new messages)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  const handleSend = async (text, model) => {
    if (!text.trim() || isSending) return

    const current = text
    setInput('')

    try {
      await sendMessage(current, { model })
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-app-bg text-app-text">

      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <button
          onClick={onOpenSidebar}
          className="rounded-md p-1 text-gray-400 transition hover:bg-white/5 hover:text-white md:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="truncate text-sm text-gray-200">
            {session?.title || session?.name || 'Conversation'}
          </p>

          <p className="text-xs text-gray-500 truncate">
            {session?.model || 'model'} 
            {session?.project?.name && ` • ${session.project.name}`}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto w-full max-w-3xl px-3 py-5 sm:px-4">
          {sendError && (
            <div className="mb-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {sendError}
            </div>
          )}

          {messages.length === 0 ? (
            <EmptyChat
              sessionName={session?.name}
              project={session?.project}
            />
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                  <MessageBubble
                    key={`${index}-${message.role}`}
                    message={message}
                    sessionModel={session?.model || null}
                  />
                ))}
              </AnimatePresence>

              {isSending && <TypingIndicator />}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 px-3 py-3 sm:px-4">
        <div className="mx-auto max-w-3xl">
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
