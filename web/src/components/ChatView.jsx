import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'
import EmptyChat from './EmptyChat'
import ChatInput from './ChatInput'
import { AnimatePresence } from 'framer-motion'

export default function ChatView({ sessionId, serverUrl, onBack, onOpenSidebar }) {
  const { sessions, messages, sendMessage, isSending, sendError } = useApp()
  const [input, setInput] = useState('')
  
  const messagesEndRef = useRef(null)
  const bottomRef = useRef(null)

  const session = sessions.find(s => s.sessionId === sessionId)
  const isLoading = isSending
  const isTyping = isSending

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = async (text, model) => {
    if (!text.trim() || isLoading) return
    const currentInput = text
    setInput('')
    try {
      await sendMessage(currentInput, { model })
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#18181b] relative">
      <button
        className="md:hidden absolute top-4 left-4 z-10 p-2 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
        onClick={onOpenSidebar}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
        </svg>
      </button>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pt-4 md:pt-6" ref={messagesEndRef}>
        <div className="max-w-3xl mx-auto px-4 md:px-6 w-full flex flex-col min-h-full">
          <div className="flex-1 pb-8 pt-4">
            {sendError && (
              <div className="mb-4 rounded-lg border border-rose-900/60 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">
                <p className="font-medium">Message failed to send</p>
                <p className="mt-1 text-rose-300/90">{sendError}</p>
              </div>
            )}

            {session?.project?.path && (
              <div className="mb-4 rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-3 py-2">
                <p className="text-zinc-300 text-sm font-medium truncate" title={session.project.name}>
                  {session.project.name}
                </p>
                <p className="text-zinc-500 text-xs truncate" title={session.project.path}>
                  {session.project.path}
                </p>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center">
                 <EmptyChat sessionName={session?.name} project={session?.project} />
              </div>
            ) : (
              <div className="space-y-10">
                <AnimatePresence initial={false}>
                  {messages.map((msg, i) => (
                    <MessageBubble key={i} message={msg} sessionModel={session?.model || null} />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {isTyping && (
              <div className={messages.length === 0 ? 'mt-6' : 'mt-10'}>
                <TypingIndicator />
              </div>
            )}
          </div>
          <div ref={bottomRef} className="h-6" />
        </div>
      </div>

      {/* Input Area */}
      <div className="pb-6 pt-2 px-4 md:px-6 bg-linear-to-t from-[#18181b] via-[#18181b] to-transparent">
        <div className="max-w-3xl mx-auto">
          <ChatInput 
            input={input} 
            setInput={setInput} 
            onSend={handleSend} 
            isLoading={isLoading} 
            initialModel={session?.model || null}
          />
        </div>
      </div>
    </div>
  )
}
