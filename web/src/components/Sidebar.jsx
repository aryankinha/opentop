import React, { useMemo, useState } from 'react'
import {
  FolderOpen,
  MessageSquarePlus,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import SessionItem from './SessionItem'
import SidebarFooter from './SidebarFooter'
import { api } from '@/lib/api'

export default function Sidebar({
  sessions,
  activeSessionId,
  isSending = false,
  generatingSessionId = null,
  onSelectSession,
  onNewChat,
  activeProject = null,
  onProjectSelect,
  onProjectsRefresh,
  sidebarOpen,
  onCloseSidebar,
  isMobile = false,
}) {
  const [customPath, setCustomPath] = useState('')
  const [isAddingProject, setIsAddingProject] = useState(false)
  const [projectError, setProjectError] = useState('')
  const [chatScope, setChatScope] = useState('all')

  const allSessions = useMemo(() => {
    return [...(sessions || [])].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    )
  }, [sessions])

  const projectSessions = useMemo(() => {
    return allSessions.filter((session) => Boolean(session?.project?.path))
  }, [allSessions])

  const globalSessions = useMemo(() => {
    return allSessions.filter((session) => !session?.project?.path)
  }, [allSessions])

  const displayedSessions = chatScope === 'project' ? projectSessions : globalSessions
  const activeGeneratingSessionId = isSending
    ? (generatingSessionId || activeSessionId)
    : null

  const handleProjectChange = async (project) => {
    setProjectError('')
    await onProjectSelect?.(project || null)
  }

  const handleAddCustomProject = async () => {
    const path = customPath.trim()
    if (isAddingProject) return

    if (!path) {
      await handlePickProjectFolder()
      return
    }

    setProjectError('')
    setIsAddingProject(true)
    try {
      const result = await api.addCustomProject(path)
      setCustomPath('')
      await handleProjectChange(result?.project || null)
      await onProjectsRefresh?.()
      setChatScope('project')
    } catch (err) {
      setProjectError(err.message || 'Failed to add project')
    } finally {
      setIsAddingProject(false)
    }
  }

  const handlePickProjectFolder = async () => {
    if (isAddingProject) return

    setProjectError('')
    setIsAddingProject(true)
    try {
      const result = await api.pickProjectFolder()
      if (result?.canceled) return

      const pickedProject = result?.project || null
      if (pickedProject?.path) {
        setCustomPath(pickedProject.path)
        setChatScope('project')
      }
      await handleProjectChange(pickedProject)
      await onProjectsRefresh?.()
    } catch (err) {
      setProjectError(err.message || 'Failed to pick folder')
    } finally {
      setIsAddingProject(false)
    }
  }

  return (
    <aside
      className={[
        'app-sidebar-panel fixed inset-y-0 left-0 z-40 flex w-[88vw] max-w-[320px] flex-col',
        'transition-transform duration-300 md:relative md:w-[300px] md:max-w-none',
        sidebarOpen || !isMobile ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
    >
      <div className="flex items-center justify-between px-4 pb-3 pt-5">
        <button
          onClick={() => {
            onNewChat?.()
            if (isMobile) onCloseSidebar?.()
          }}
          className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition hover:bg-white/[0.04]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-500/10 text-amber-300 shadow-[0_0_0_1px_rgba(245,158,11,0.06)]">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-[var(--color-app-text)]">OpenTop</p>
            <p className="text-xs text-[var(--color-app-muted)]">Mobile agent control</p>
          </div>
        </button>

        {isMobile && (
          <button
            onClick={onCloseSidebar}
            className="rounded-xl border border-white/8 bg-white/[0.03] p-2 text-[var(--color-app-muted)] transition hover:bg-white/[0.08] hover:text-[var(--color-app-text)]"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="px-4">
        <button
          onClick={() => {
            onNewChat?.()
            if (isMobile) onCloseSidebar?.()
          }}
          className="flex w-full items-center justify-between rounded-2xl border border-[var(--color-app-border)] bg-[var(--color-app-soft)] px-4 py-3 text-left text-sm text-[var(--color-app-text)] transition hover:border-[var(--color-app-border-strong)] hover:bg-[var(--color-app-hover)]"
        >
          <span className="flex items-center gap-2.5">
            <MessageSquarePlus className="h-4.5 w-4.5 text-amber-300" />
            New chat
          </span>
          <Plus className="h-4 w-4 text-[var(--color-app-muted)]" />
        </button>
      </div>

      <div className="px-4 pb-4 pt-4">
        <div className="rounded-2xl border border-[var(--color-app-border)] bg-white/[0.02] p-1">
          <div className="grid grid-cols-2 gap-1 text-xs font-medium">
            <button
              onClick={() => setChatScope('all')}
              className={[
                'rounded-xl px-3 py-2 transition',
                chatScope === 'all'
                  ? 'bg-[var(--color-app-text)] text-[#181513]'
                  : 'text-[var(--color-app-muted)] hover:bg-white/[0.04] hover:text-[var(--color-app-text)]',
              ].join(' ')}
            >
              Home chats
            </button>
            <button
              onClick={() => setChatScope('project')}
              className={[
                'rounded-xl px-3 py-2 transition',
                chatScope === 'project'
                  ? 'bg-[var(--color-app-text)] text-[#181513]'
                  : 'text-[var(--color-app-muted)] hover:bg-white/[0.04] hover:text-[var(--color-app-text)]',
              ].join(' ')}
            >
              Project chats
            </button>
          </div>
        </div>
      </div>

      {chatScope === 'project' && (
        <div className="px-4 pb-4">
          <div className="rounded-[22px] border border-[var(--color-app-border)] bg-[var(--color-app-soft)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-app-muted)]">
                  Active project
                </p>
                {activeProject?.path ? (
                  <>
                    <p className="mt-2 text-sm font-semibold text-[var(--color-app-text)]">
                      {activeProject.name}
                    </p>
                    <p className="mt-1 break-words text-xs text-[var(--color-app-muted)]">
                      {activeProject.path}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-[var(--color-app-muted)]">
                    Pick a folder to keep this conversation scoped to a project.
                  </p>
                )}
              </div>
              <button
                onClick={handlePickProjectFolder}
                disabled={isAddingProject}
                className="rounded-xl border border-white/8 bg-white/[0.04] p-2 text-[var(--color-app-muted)] transition hover:bg-white/[0.08] hover:text-[var(--color-app-text)] disabled:opacity-50"
                aria-label="Choose a project folder"
              >
                <FolderOpen className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-app-muted)]" />
                <input
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  placeholder="/Users/.../project-folder"
                  className="w-full rounded-2xl border border-[var(--color-app-border)] bg-[rgba(12,10,9,0.55)] py-2.5 pl-9 pr-3 text-xs text-[var(--color-app-text)] outline-none transition placeholder:text-[var(--color-app-muted)] focus:border-[var(--color-app-border-strong)]"
                />
              </div>
              <button
                onClick={handleAddCustomProject}
                disabled={isAddingProject}
                className="rounded-2xl bg-[var(--color-app-text)] px-3 py-2.5 text-xs font-semibold text-[#181513] transition hover:bg-[#fff8ef] disabled:opacity-50"
              >
                {isAddingProject ? 'Adding' : 'Add'}
              </button>
            </div>

            {projectError && (
              <p className="mt-2 text-xs text-rose-300">{projectError}</p>
            )}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 px-3 pb-3">
        <div className="app-fade-mask h-full overflow-y-auto scrollbar-thin px-1">
          <div className="mb-3 flex items-center justify-between px-3 pt-1">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-app-muted)]">
              {chatScope === 'project' ? 'Project sessions' : 'Recent chats'}
            </p>
            <p className="text-xs text-[var(--color-app-muted)]">{displayedSessions.length}</p>
          </div>

          {displayedSessions.length === 0 ? (
            <div className="mx-2 rounded-[22px] border border-dashed border-[var(--color-app-border)] bg-white/[0.02] px-4 py-5 text-sm text-[var(--color-app-muted)]">
              {chatScope === 'project'
                ? 'No project chat yet. Choose a folder and start the first conversation.'
                : 'No chats yet. Start a fresh conversation from here.'}
            </div>
          ) : (
            <div className="space-y-1.5 px-1 pb-6">
              {displayedSessions.map((session) => (
                <SessionItem
                  key={session.sessionId}
                  session={session}
                  active={session.sessionId === activeSessionId}
                  isGenerating={session.sessionId === activeGeneratingSessionId}
                  onClick={() => {
                    onSelectSession?.(session.sessionId)
                    if (isMobile) onCloseSidebar?.()
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <SidebarFooter />
    </aside>
  )
}
