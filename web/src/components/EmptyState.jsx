import React, { useState } from 'react'
import { Menu, PenLine, Code2, Coffee, Sparkles } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import ChatInput from './ChatInput'

const SUGGESTIONS = [
  { text: 'Write', icon: PenLine, prompt: 'Write a poem about the sea' },
  { text: 'Code', icon: Code2, prompt: 'How do I center a div?' },
  { text: 'Life', icon: Coffee, prompt: 'Give me tips for better sleep' },
]

export default function EmptyState({ onOpenSidebar, activeProject = null }) {
  const { sendMessage, cancelMessage, isSending, sendError } = useApp()
  const [input, setInput] = useState('')

  const handleSend = async (text, model) => {
    if (!text.trim() || isSending) return
    try {
      await sendMessage(text, { project: activeProject, model })
    } catch (e) {
      console.error('Failed to send message:', e)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--color-app-bg)] text-[var(--color-app-text)]">
      <header className="flex h-14 shrink-0 items-center gap-3 px-4 sm:px-6">
        <button
          onClick={onOpenSidebar}
          className="rounded-md p-1 text-gray-400 transition hover:bg-white/5 hover:text-white md:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium text-gray-300">OpenTop</span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center px-4 py-8 text-center">
          <h1 className="flex items-center gap-2 text-3xl font-semibold text-[var(--color-app-text)] sm:text-4xl">
            <Sparkles className="h-6 w-6 text-[var(--color-app-accent)]" />
            OpenTop
          </h1>
          <p className="mt-3 max-w-md text-sm text-[var(--color-app-muted)] sm:text-base">
            Start a new chat or continue from the sidebar.
          </p>

          {activeProject?.path && (
            <div className="mt-4 max-w-full rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-[var(--color-app-muted)]">
              <span className="mr-1 text-[var(--color-app-text)]">{activeProject.name}</span>
              <span className="inline-block max-w-[170px] truncate align-bottom sm:max-w-[320px]">{activeProject.path}</span>
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion.text}
                onClick={() => setInput(suggestion.prompt)}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-transparent px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/5 sm:text-sm"
              >
                <suggestion.icon className="h-3.5 w-3.5 text-gray-400" />
                {suggestion.text}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 px-3 py-3 sm:px-4">
        <div className="mx-auto w-full max-w-3xl">
          {sendError && (
            <div className="mb-3 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {sendError}
            </div>
          )}
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
    </div>
  )
}
