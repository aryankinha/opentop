import React, { useMemo, useState } from 'react'
import {
  FolderOpen,
  MessageSquarePlus,
  Plus,
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

  const homeSessions = useMemo(() => {
    return allSessions.filter((session) => !session?.project?.path)
  }, [allSessions])

  const displayedSessions =
    chatScope === 'project' ? projectSessions : homeSessions

  const activeGeneratingSessionId = isSending
    ? (generatingSessionId || activeSessionId)
    : null

  const handleProjectChange = async (project) => {
    setProjectError('')
    setChatScope(project?.path ? 'project' : 'all')
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
        'fixed inset-y-0 left-0 z-40 flex min-h-0 w-[86vw] max-w-[300px] flex-col border-r border-[var(--color-app-border)] bg-[var(--color-app-sidebar)] md:relative md:w-[292px]',
        'shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:shadow-none',
        'transition-transform duration-300 md:relative',
        sidebarOpen || !isMobile ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
    >
      <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-4">
        <div className="pl-1 font-serif text-lg font-medium text-white">
          OpenTop
        </div>

        {isMobile && (
          <button
            onClick={onCloseSidebar}
            className="rounded-md p-1.5 text-gray-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="shrink-0 px-3 pb-3">
        <button
          onClick={() => {
            onNewChat?.()
            if (isMobile) onCloseSidebar?.()
          }}
          className="flex w-full items-center gap-2 rounded-xl border border-white/8 px-2.5 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-white/5"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white">
            <Plus className="h-3 w-3" />
          </div>
          New chat
        </button>
      </div>

      <div className="shrink-0 px-3">
        <button
          onClick={() => setChatScope('all')}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
            chatScope === 'all'
              ? 'text-white bg-white/10 font-medium'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <MessageSquarePlus className="h-4 w-4" />
          Home chats
        </button>

        <button
          onClick={() => setChatScope('project')}
          className={`mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
            chatScope === 'project'
              ? 'text-white bg-white/10 font-medium'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          Project chats
        </button>
      </div>

      {chatScope === 'project' && (
        <div className="shrink-0 px-3 pt-3 text-xs text-gray-500">
          {activeProject?.path ? (
            <div className="mb-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
              <div className="truncate text-[13px] text-gray-300">{activeProject.name}</div>
              <div className="truncate text-[11px]">{activeProject.path}</div>
            </div>
          ) : (
            <div className="mb-2">No project selected</div>
          )}

          <div className="mt-2">
            <input
              value={customPath}
              onChange={(event) => setCustomPath(event.target.value)}
              placeholder="/path/to/project"
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-200 outline-none transition focus:border-white/20"
            />
          </div>

          <div className="mt-2 flex gap-2">
            <button
              onClick={handlePickProjectFolder}
              disabled={isAddingProject}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-gray-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
            >
              Choose
            </button>

            <button
              onClick={handleAddCustomProject}
              disabled={isAddingProject}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-gray-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
            >
              {isAddingProject ? 'Adding…' : 'Add'}
            </button>
          </div>

          {projectError && (
            <p className="mt-2 text-xs text-red-400">{projectError}</p>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-4">
        <div className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-gray-500">
          {chatScope === 'project' ? 'Project history' : 'Home history'}
        </div>

        {displayedSessions.length === 0 ? (
          <div className="px-2 text-xs text-gray-500">
            No chats yet
          </div>
        ) : (
          <div className="space-y-1">
            {displayedSessions.map((session) => (
              <SessionItem
                key={session.sessionId}
                session={session}
                active={session.sessionId === activeSessionId}
                isGenerating={
                  session.sessionId === activeGeneratingSessionId
                }
                onClick={() => {
                  onSelectSession?.(session.sessionId)
                  if (isMobile) onCloseSidebar?.()
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <SidebarFooter />
    </aside>
  )
}
