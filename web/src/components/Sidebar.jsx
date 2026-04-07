import React, { useMemo, useState } from 'react'
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
  const [isExpanded, setIsExpanded] = useState(false)
  const [customPath, setCustomPath] = useState('')
  const [isAddingProject, setIsAddingProject] = useState(false)
  const [projectError, setProjectError] = useState('')
  const [chatScope, setChatScope] = useState('project')
  const expanded = isMobile || isExpanded

  const allSessions = useMemo(() => {
    return [...(sessions || [])].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    )
  }, [sessions])

  const projectSessions = useMemo(() => {
    return [...allSessions]
      .filter((session) => Boolean(session?.project?.path))
  }, [allSessions])

  const normalSessions = useMemo(() => {
    return [...allSessions]
      .filter((session) => !session?.project?.path)
  }, [allSessions])

  const displayedSessions = chatScope === 'project' ? projectSessions : normalSessions
  const activeGeneratingSessionId = isSending
    ? (generatingSessionId || activeSessionId)
    : null

  const toggleExpanded = () => {
    if (isMobile) return
    setIsExpanded((prev) => !prev)
  }

  const handleProjectChange = async (project) => {
    setProjectError('')
    await onProjectSelect?.(project || null)
  }



  const handleAddCustomProject = async () => {
    const path = customPath.trim()
    if (isAddingProject) return

    // If no path is typed, treat Add as "browse and pick folder".
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
    <aside className={`
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      md:translate-x-0
      fixed md:relative
      z-40 md:z-auto
      flex-shrink-0
      h-full
      bg-[#27272a] text-zinc-300
      flex flex-col
      transition-all duration-500 ease-out
      border-r border-zinc-800/50
      md:shadow-lg md:shadow-black/15
      ${expanded ? 'w-[260px]' : 'w-[68px]'}
    `}>
      {/* Top Header */}
      <div className={`flex items-center px-4 pt-4 pb-2 ${expanded ? 'justify-between' : 'justify-center'}`}>
        <button
          onClick={toggleExpanded}
          className="flex items-center gap-2 rounded-md p-1.5 -ml-1.5 hover:bg-zinc-800/50 transition-colors"
          title={expanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          <div className="w-6 h-6 rounded flex items-center justify-center text-amber-500 font-serif italic font-bold">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          {expanded && <span className="font-semibold text-zinc-100 text-[15px]">OpenTop</span>}
        </button>

        {expanded && !isMobile && (
          <button
            onClick={toggleExpanded}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-colors"
            title="Collapse Sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        )}

        {/* Mobile close button */}
        <button
          className="md:hidden p-1.5 text-zinc-500 hover:text-zinc-200"
          onClick={onCloseSidebar}
        >✕</button>
      </div>

      {!expanded && (
        <div className="px-3 pt-1 flex justify-center">
          <button
            onClick={toggleExpanded}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/70 transition-colors"
            title="Open Sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      )}

      {/* New Chat Button */}
      <div className={`px-3 pt-2 ${!expanded && 'flex justify-center'}`}>
        <button
          onClick={() => onNewChat(null)}
          className={`
            flex items-center gap-2 py-2 rounded-lg
            text-sm text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100
            transition-all duration-200 group
            ${expanded ? 'w-full px-2' : 'w-10 justify-center'}
          `}
          title="New Chat"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 group-hover:text-zinc-300">
            <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          {expanded && <span>New chat</span>}
        </button>
      </div>

      {expanded && (
        <div className="px-3 pt-2 space-y-3">
          <div className="px-2 flex items-center gap-1.5">
            <button
              onClick={() => setChatScope('project')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${chatScope === 'project' ? 'bg-zinc-700/70 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'}`}
            >
              Project chats
            </button>
            <button
              onClick={() => setChatScope('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${chatScope === 'all' ? 'bg-zinc-700/70 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'}`}
            >
              All chats
            </button>
          </div>

          {chatScope === 'project' && (
            <div className="px-2 space-y-2.5 pt-0.5">
              {activeProject?.path && (
                <div className="px-2 py-1 rounded-md bg-zinc-900/60 border border-zinc-800/70 text-[11px]">
                  <p className="text-zinc-300 truncate" title={activeProject.name}>{activeProject.name}</p>
                  <p className="text-zinc-500 truncate" title={activeProject.path}>{activeProject.path}</p>
                </div>
              )}

              <button
                onClick={handlePickProjectFolder}
                disabled={isAddingProject}
                className="w-full text-left px-2 py-1.5 text-xs rounded-md text-zinc-300 bg-zinc-800/70 hover:bg-zinc-700/70 disabled:opacity-50 transition-colors"
              >
                {isAddingProject ? 'Opening folder picker...' : 'Choose folder from Mac'}
              </button>

              <div className="flex gap-1.5">
                <input
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  placeholder="/Users/.../your-project"
                  className="flex-1 min-w-0 px-2 py-1.5 rounded-md bg-zinc-900 border border-zinc-700/70 text-[11px] text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-zinc-500"
                />
                <button
                  onClick={handleAddCustomProject}
                  disabled={isAddingProject}
                  className="px-2 py-1.5 rounded-md text-xs text-zinc-200 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 transition-colors"
                >
                  Add
                </button>
              </div>

              {projectError && (
                <p className="text-[11px] text-rose-400">{projectError}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-3 pb-2 pt-3">
        {expanded && (
          <>
            <p className="px-2 pb-2 text-[11px] text-zinc-500 font-medium">
              {chatScope === 'project' ? 'Project chats' : 'All chats'}
            </p>
            {displayedSessions.length === 0 ? (
              <p className="px-2 py-2 text-sm text-zinc-500">
                {chatScope === 'project' ? 'No project chats yet' : 'No chats yet'}
              </p>
            ) : (
              <div className="space-y-[2px]">
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
                    isExpanded={expanded}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer replacing ProfileMenu & SystemStatus */}
      <SidebarFooter
        isExpanded={expanded}
        onCollapsedProfileClick={isMobile ? undefined : toggleExpanded}
      />
    </aside>
  )
}
