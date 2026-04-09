import React, { useEffect, useRef, useState } from 'react'
import { Loader2, Pencil, Trash2 } from 'lucide-react'
import { useApp } from '@/context/AppContext'

export default function SessionItem({
  session,
  active,
  onClick,
  isGenerating = false,
}) {
  const { updateSessionTitle, deleteSession } = useApp()
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [title, setTitle] = useState(getSessionTitle(session.title, session.messages))
  const inputRef = useRef(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    setTitle(getSessionTitle(session.title, session.messages))
  }, [session.title, session.messages])

  const handleEditComplete = async () => {
    setIsEditing(false)
    if (title.trim() && title !== session.title) {
      try {
        await updateSessionTitle(session.sessionId, title.trim())
      } catch (error) {
        console.error('Failed to update title', error)
      }
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleEditComplete()
    } else if (event.key === 'Escape') {
      setIsEditing(false)
      setTitle(getSessionTitle(session.title, session.messages))
    }
  }

  const handleDelete = async (event) => {
    event.stopPropagation()
    if (isDeleting) return

    const confirmed = window.confirm('Delete this chat?')
    if (!confirmed) return

    setIsDeleting(true)
    try {
      await deleteSession(session.sessionId)
    } catch (error) {
      console.error('Failed to delete chat', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      onClick={() => {
        if (!isEditing) onClick?.()
      }}
      className={[
        'group relative rounded-[22px] border px-4 py-3 transition',
        active
          ? 'border-[var(--color-app-border-strong)] bg-white/[0.08] shadow-[0_12px_32px_rgba(0,0,0,0.22)]'
          : 'border-transparent bg-white/[0.03] hover:border-[var(--color-app-border)] hover:bg-white/[0.06]',
        isGenerating ? 'pr-24' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.04)] text-xs font-semibold uppercase text-[var(--color-app-text)]">
          {title.charAt(0)}
        </div>

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              ref={inputRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={handleEditComplete}
              onKeyDown={handleKeyDown}
              onClick={(event) => event.stopPropagation()}
              className="w-full rounded-xl border border-[var(--color-app-border-strong)] bg-black/20 px-3 py-2 text-sm text-[var(--color-app-text)] outline-none"
            />
          ) : (
            <>
              <p className="truncate text-sm font-medium text-[var(--color-app-text)]">
                {title}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-app-muted)]">
                {session.project?.name && (
                  <span className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-1">
                    {session.project.name}
                  </span>
                )}
                {session.model && (
                  <span>{formatModelLabel(session.model)}</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {isGenerating && (
        <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-100">
          <Loader2 className="h-3 w-3 animate-spin" />
          Generating
        </div>
      )}

      {!isEditing && !isGenerating && (
        <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            onClick={(event) => {
              event.stopPropagation()
              setIsEditing(true)
            }}
            className="rounded-lg p-2 text-[var(--color-app-muted)] transition hover:bg-white/[0.08] hover:text-[var(--color-app-text)]"
            title="Edit title"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-lg p-2 text-[var(--color-app-muted)] transition hover:bg-white/[0.08] hover:text-rose-200 disabled:opacity-50"
            title="Delete chat"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

function getSessionTitle(title, messages) {
  if (title) return title
  if (messages?.length > 0) return `${messages[0].content.slice(0, 36)}...`
  return 'New Chat'
}

function formatModelLabel(model) {
  const known = {
    'claude-haiku-4.5': 'Haiku 4.5',
    'claude-sonnet-4.5': 'Sonnet 4.5',
    'claude-opus-4.5': 'Opus 4.5',
    'gpt-5.3-codex': 'GPT-5.3 Codex',
    'gpt-5-mini': 'GPT-5 Mini',
  }

  return known[model] || model
}
