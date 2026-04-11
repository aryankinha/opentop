import React, { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export default function MemorySettings() {
  const [memory, setMemory] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadMemory()
  }, [])

  const loadMemory = async () => {
    try {
      const res = await api.getGlobalMemory()
      setMemory(res?.content || '')
      setEditContent(res?.content || '')
    } catch (e) {
      console.error(e)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await api.saveGlobalMemory(editContent)
      setMemory(editContent)
      setIsEditing(false)
    } catch (e) {
      console.error(e)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = async () => {
    if (window.confirm("Are you sure you want to completely clear the global memory?")) {
      try {
        await api.clearGlobalMemory()
        setMemory('')
        setEditContent('')
        setIsEditing(false)
      } catch (e) {
        console.error(e)
      }
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div className="flex flex-col gap-1">
        <h4 className="text-zinc-100 font-medium">Memory Foundation</h4>
        <p className="text-xs text-zinc-400">
          This system prompt runs automatically before each session. Context entered here shapes how the AI persists standard information across your chats.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            disabled={isSaving}
            className="w-full flex-1 min-h-[300px] bg-[#1a1a1a] border border-zinc-700/80 rounded-xl p-4 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/50 resize-y font-mono leading-relaxed"
            placeholder="Store permanent background knowledge here..."
            autoFocus
          />
        ) : (
          <div className="w-full min-h-[150px] bg-[#1a1a1a] border border-zinc-800 rounded-xl p-4">
             <pre className="text-[13px] text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
               {memory || <span className="text-zinc-600 italic">No global memory stored.</span>}
             </pre>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-col items-start justify-between gap-3 border-t border-zinc-800/50 pt-2 sm:flex-row sm:items-center">
        <button
          onClick={handleClear}
          className="text-xs font-semibold px-3 py-2 text-red-400 hover:text-red-300 hover:bg-zinc-800/50 rounded-lg transition-colors"
        >
          Clear Memory
        </button>
        <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
          {isEditing ? (
            <>
              <button
                onClick={() => { setIsEditing(false); setEditContent(memory); }}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-green-600/90 hover:bg-green-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
              >
                {isSaving && <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                Save
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold hover:bg-zinc-700 hover:text-white transition-colors"
            >
              Edit Memory
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
