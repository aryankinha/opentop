import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '@/context/AppContext'

export default function SessionItem({
  session,
  active,
  onClick,
  isExpanded = true,
  isGenerating = false,
}) {
  const { updateSessionTitle, deleteSession } = useApp()
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [title, setTitle] = useState(getSessionTitle(session.title, session.messages))
  const inputRef = useRef(null)

  useEffect(() => {
    if (isEditing && inputRef.current && isExpanded) {
      inputRef.current.focus()
    }
  }, [isEditing, isExpanded])

  useEffect(() => {
    setTitle(getSessionTitle(session.title, session.messages))
  }, [session.title, session.messages])

  const handleEditComplete = async () => {
    setIsEditing(false)
    if (title.trim() && title !== session.title) {
      try {
        await updateSessionTitle(session.sessionId, title.trim())
      } catch (e) {
        console.error('Failed to update title', e)
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleEditComplete()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setTitle(getSessionTitle(session.title, session.messages))
    }
  }

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (isDeleting) return

    const confirmed = window.confirm('Delete this chat?')
    if (!confirmed) return

    setIsDeleting(true)
    try {
      await deleteSession(session.sessionId)
    } catch (err) {
      console.error('Failed to delete chat', err)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      onClick={(e) => {
        if (!isEditing) onClick(e)
      }}
      className={`
        group relative flex items-center text-left py-2 rounded-lg mb-0.5 cursor-pointer
        transition-colors duration-150
        ${isExpanded ? 'w-full px-3' : 'w-10 h-10 justify-center mx-auto'}
        ${active
          ? 'bg-zinc-800 text-zinc-100'
          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
        }
        ${isGenerating ? 'ring-1 ring-zinc-700/80' : ''}
      `}
      title={!isExpanded ? title : undefined}
    >
      {!isExpanded ? (
        <>
          <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-semibold uppercase transition-colors
            ${active ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200 group-hover:bg-zinc-700/50'}
          `}>
            {title.charAt(0)}
          </div>
          {isGenerating && (
            <span className="pointer-events-none absolute -top-0.5 -right-0.5 inline-flex h-3.5 w-3.5 items-center justify-center">
              <span className="h-3.5 w-3.5 rounded-full border border-zinc-300/90 border-t-transparent animate-spin" />
            </span>
          )}
        </>
      ) : (
        <>
          {isEditing ? (
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleEditComplete}
              onKeyDown={handleKeyDown}
              className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 text-sm text-zinc-100 px-1 py-0.5 rounded outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <p className={`flex-1 text-[13px] truncate font-medium select-none ${isGenerating ? 'pr-24' : 'pr-14'}`}>
              {title}
            </p>
          )}

          {isGenerating && !isEditing && (
            <div className="absolute right-2 flex items-center gap-1.5 rounded-full border border-zinc-700/80 bg-zinc-900/80 px-2 py-0.5">
              <span className="h-3 w-3 rounded-full border border-zinc-300/90 border-t-transparent animate-spin" />
              <span className="text-[10px] text-zinc-300">Generating</span>
            </div>
          )}

          {/* Action Buttons */}
          {!isEditing && !isGenerating && (
            <div className={`absolute right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all ${active ? 'opacity-100' : ''}`}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditing(true)
                }}
                className="p-1 rounded-md hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Edit title"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                </svg>
              </button>

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1 rounded-md hover:bg-zinc-700 text-zinc-500 hover:text-rose-300 disabled:opacity-50 transition-colors"
                title="Delete chat"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </div>
          )}

          {isGenerating && !isEditing && (
            <div className="pointer-events-none absolute inset-x-2 bottom-0 h-px overflow-hidden rounded">
              <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-zinc-300/60 to-transparent animate-[chat-generating-sweep_1.25s_ease-in-out_infinite]" />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function getSessionTitle(title, messages) {
  if (title) return title
  if (messages?.length > 0) return `${messages[0].content.slice(0, 30)}...`
  return 'New Chat'
}
