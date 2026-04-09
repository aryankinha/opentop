import React, { useState } from 'react'
import { FolderOpen, Menu, Smartphone } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import ChatInput from './ChatInput'

const SUGGESTIONS = [
  'Summarize the current project architecture',
  'Help me debug a failing build',
  'Plan the next steps for this feature',
]

export default function EmptyState({
  onOpenSidebar,
  activeProject = null,
  showInstallButton = false,
  onInstallPWA,
}) {
  const { sendMessage, isSending, sendError } = useApp()
  const [input, setInput] = useState('')

  const handleSend = async (text, model) => {
    if (!text.trim() || isSending) return

    try {
      await sendMessage(text, { project: activeProject, model })
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-1 flex-col bg-[rgba(20,18,16,0.72)] md:min-h-0">
      <header className="sticky top-0 z-10 border-b border-white/6 bg-[linear-gradient(180deg,rgba(24,21,19,0.95),rgba(24,21,19,0.82))] px-4 py-4 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <button
            className="rounded-2xl border border-white/8 bg-white/[0.04] p-2 text-[var(--color-app-muted)] transition hover:bg-white/[0.08] hover:text-[var(--color-app-text)] md:hidden"
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
          <div>
            <p className="text-sm font-semibold text-[var(--color-app-text)]">OpenTop</p>
            <p className="text-xs text-[var(--color-app-muted)]">
              Self-hosted agent sessions, controlled from your phone
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10 md:px-8">
        <div className="w-full max-w-4xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[26px] border border-amber-400/20 bg-amber-500/10 text-amber-200 shadow-[0_18px_44px_rgba(245,158,11,0.12)]">
              <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-[var(--color-app-text)] md:text-5xl">
              What should OpenTop do next?
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--color-app-muted)] md:text-base">
              Run coding tasks on your Mac, continue a saved chat, or scope the next session to a project so the agent stays anchored in one workspace.
            </p>

            {activeProject?.path && (
              <div className="mx-auto mt-6 flex max-w-xl items-center gap-3 rounded-[26px] border border-white/8 bg-white/[0.04] px-4 py-3 text-left">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-black/20 text-[var(--color-app-muted)]">
                  <FolderOpen className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--color-app-text)]" title={activeProject.name}>
                    {activeProject.name}
                  </p>
                  <p className="mt-1 truncate text-xs text-[var(--color-app-muted)]" title={activeProject.path}>
                    {activeProject.path}
                  </p>
                </div>
              </div>
            )}

            {sendError && (
              <div className="mx-auto mt-6 max-w-2xl rounded-[22px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-left text-sm text-rose-100">
                <p className="font-medium">Message failed to send</p>
                <p className="mt-1 text-rose-200/80">{sendError}</p>
              </div>
            )}
          </div>

          <div className="mx-auto mt-8 max-w-3xl">
            <div className="grid gap-3 md:grid-cols-3">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="rounded-[24px] border border-[var(--color-app-border)] bg-white/[0.03] px-4 py-4 text-left text-sm text-[var(--color-app-text)] transition hover:border-[var(--color-app-border-strong)] hover:bg-white/[0.06]"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {showInstallButton && (
              <button
                onClick={onInstallPWA}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-4 py-2 text-sm text-[var(--color-app-text)] transition hover:bg-white/[0.08] md:hidden"
              >
                <Smartphone className="h-4 w-4" />
                Install OpenTop app
              </button>
            )}

            <div className="mt-6">
              <ChatInput
                input={input}
                setInput={setInput}
                onSend={handleSend}
                isLoading={isSending}
                isInitial
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
