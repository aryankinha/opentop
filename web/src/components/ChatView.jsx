import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { FolderOpen, Menu } from 'lucide-react'
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
    <div className="relative flex h-full flex-col overflow-hidden bg-app-bg text-app-text">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button
          onClick={onOpenSidebar}
          className="md:hidden text-gray-400 hover:text-white"
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">

          {sendError && (
            <div className="mb-4 text-sm text-red-400">
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

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input (NOT fixed anymore) */}
      <div className="border-t border-white/10 px-4 py-3">
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