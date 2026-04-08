import React, { useState } from 'react'
import { useApp } from '@/context/AppContext'
import ChatInput from './ChatInput'

export default function EmptyState({ onOpenSidebar, onNewChat, activeProject = null, showInstallButton = false, onInstallPWA }) {
  const { sendMessage, isSending } = useApp()
  const [input, setInput] = useState('')

  const handleSend = async (text, model) => {
    if (!text.trim() || isSending) return
    try {
      await sendMessage(text, { project: activeProject, model })
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-[#18181b] relative h-full">
      <button
        className="md:hidden absolute top-4 left-4 z-10 p-2 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
        onClick={onOpenSidebar}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
        </svg>
      </button>

      {/* Main Centered Content */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 md:px-8 max-w-4xl mx-auto w-full">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-amber-500 mb-6 font-serif italic text-2xl font-bold">
            <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h2 className="text-[28px] md:text-3xl font-semibold text-zinc-100 tracking-tight mb-2">
            OpenTop
          </h2>
          <p className="text-zinc-400 text-center max-w-sm px-4">
            How can I help you today?
          </p>
          {activeProject?.path && (
            <div className="mt-3 px-3 py-2 rounded-lg border border-zinc-800/80 bg-zinc-900/50 max-w-lg w-full">
              <p className="text-zinc-300 text-xs font-medium truncate" title={activeProject.name}>
                {activeProject.name}
              </p>
              <p className="text-zinc-500 text-[11px] truncate" title={activeProject.path}>
                {activeProject.path}
              </p>
            </div>
          )}
        </div>

        {showInstallButton && (
          <button
            onClick={onInstallPWA}
            className="md:hidden mb-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Install OpenTop App
          </button>
        )}

        <ChatInput 
          input={input} 
          setInput={setInput} 
          onSend={handleSend} 
          isLoading={isSending} 
          isInitial={true} 
        />
      </div>
    </div>
  )
}
