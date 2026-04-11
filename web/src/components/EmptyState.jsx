import React, { useState } from 'react'
import { Menu, PenLine, GraduationCap, Code2, Coffee, Sparkles } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import ChatInput from './ChatInput'

const SUGGESTIONS = [
  { text: 'Write', icon: PenLine, prompt: 'Write a poem about the sea' },
  { text: 'Learn', icon: GraduationCap, prompt: 'Explain quantum computing to a 5 year old' },
  { text: 'Code', icon: Code2, prompt: 'How do I center a div?' },
  { text: 'Life stuff', icon: Coffee, prompt: 'Give me tips for better sleep' },
  { text: "OpenTop's choice", icon: Sparkles, prompt: 'Tell me a random interesting fact' },
]

export default function EmptyState({
  onOpenSidebar,
  activeProject = null,
}) {
  const { sendMessage, cancelMessage, isSending, user, sendError } = useApp()
  const [input, setInput] = useState('')
  const displayName = user?.displayName || 'User'

  const handleSend = async (text, model) => {
    if (!text.trim() || isSending) return
    try {
      await sendMessage(text, { project: activeProject, model })
    } catch (e) {
      console.error('Failed to send message:', e)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--color-app-bg)] text-[var(--color-app-text)] font-sans">

      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 py-3 md:px-6">
        <button
          onClick={onOpenSidebar}
          className="md:hidden text-gray-400 hover:text-white"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="text-sm font-medium text-gray-300">
          OpenTop
        </div>
      </header>

      {/* Center content */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">

        {/* Title */}
        <h1 className="text-3xl font-serif text-[#e4dac5] flex items-center justify-center gap-3">
          <Sparkles className="h-7 w-7 text-[#e58a66]" />
          Back at it, {displayName.toLowerCase()}
        </h1>

        {/* Input */}
        <div className="mt-12 w-full max-w-2xl flex flex-col items-center">
          {sendError && (
            <div className="mb-4 text-sm text-red-400 text-center">
              {sendError}
            </div>
          )}
          <div className="w-full">
            <ChatInput
              input={input}
              setInput={setInput}
              onSend={handleSend}
              onCancel={cancelMessage}
              isLoading={isSending}
              isInitial
            />
          </div>
        </div>

        {/* Suggestions */}
        <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-2xl px-4">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.text}
              onClick={() => setInput(s.prompt)}
              className="flex items-center gap-2 text-[13px] px-3 py-1.5 rounded-full border border-white/10 bg-transparent text-gray-300 hover:bg-white/5 transition-colors"
            >
              <s.icon className="h-3.5 w-3.5 text-gray-400" />
              {s.text}
            </button>
          ))}
        </div>

        {/* Active project (minimal) */}
        {activeProject?.path && (
          <div className="mt-8 text-xs text-gray-500 truncate max-w-md text-center">
            {activeProject.name} — {activeProject.path}
          </div>
        )}
      </div>
    </div>
  )
}