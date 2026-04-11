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

  const displayedSessions =
    chatScope === 'project' ? projectSessions : allSessions

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
        'fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[var(--color-app-sidebar)] border-r border-[var(--color-app-border)]',
        'transition-transform duration-300 md:relative',
        sidebarOpen || !isMobile ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="font-serif text-lg text-white font-medium pl-1">
          OpenTop
        </div>

        {isMobile && (
          <button
            onClick={onCloseSidebar}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* New Chat */}
      <div className="px-3 mb-4">
        <button
          onClick={() => {
            onNewChat?.()
            if (isMobile) onCloseSidebar?.()
          }}
          className="flex w-full items-center gap-2 px-2 py-1.5 text-sm font-medium text-gray-200 hover:bg-white/5 rounded-md transition-colors"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white">
            <Plus className="h-3 w-3" />
          </div>
          New chat
        </button>
      </div>

      {/* Scope toggle / Sections */}
      <div className="px-3 flex flex-col gap-0.5">
        <button
          onClick={() => setChatScope('all')}
          className={`flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${
            chatScope === 'all'
              ? 'text-white bg-white/10 font-medium'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <MessageSquarePlus className="h-4 w-4" />
          Chats
        </button>

        <button
          onClick={() => setChatScope('project')}
          className={`flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${
            chatScope === 'project'
              ? 'text-white bg-white/10 font-medium'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          Projects
        </button>
      </div>

      {/* Project section */}
      {chatScope === 'project' && (
        <div className="px-3 mt-3 text-xs text-gray-500">

          {activeProject?.path ? (
            <div className="mb-2">
              <div className="text-gray-300">{activeProject.name}</div>
              <div className="truncate">{activeProject.path}</div>
            </div>
          ) : (
            <div className="mb-2">No project selected</div>
          )}

          <div className="flex gap-2 mt-2">
            <button
              onClick={handlePickProjectFolder}
              className="text-gray-400 hover:text-white"
            >
              Choose
            </button>

            <button
              onClick={handleAddCustomProject}
              disabled={isAddingProject}
              className="text-gray-400 hover:text-white disabled:opacity-50"
            >
              Add
            </button>
          </div>

          {projectError && (
            <p className="mt-2 text-xs text-red-400">{projectError}</p>
          )}
        </div>
      )}

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto px-2 mt-4">
        <div className="px-2 mb-2 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
          Recents
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