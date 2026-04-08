import { useState, useEffect, useCallback } from 'react'
import { AppProvider, useApp } from '@/context/AppContext'
import Sidebar from '@/components/Sidebar'
import ChatView from '@/components/ChatView'
import ConnectScreen from '@/screens/ConnectScreen'
import EmptyState from '@/components/EmptyState'

import PermissionModal from '@/components/PermissionModal'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'
import { api } from '@/lib/api'

const PROJECT_CHAT_MAP_KEY = 'projectChatSessionMap'

function readProjectChatMap() {
  try {
    const raw = localStorage.getItem(PROJECT_CHAT_MAP_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeProjectChatMap(map) {
  localStorage.setItem(PROJECT_CHAT_MAP_KEY, JSON.stringify(map || {}))
}

function getPreferredModel() {
  return localStorage.getItem('selectedModel') || 'claude-sonnet-4.5'
}

function AppContent() {
  const {
    serverUrl,
    isConnected,
    sessions,
    currentSessionId: activeSessionId,
    isSending,
    sendingSessionId,
    createSession,
    selectSession,
    setServerUrl,
    setPairingToken,
    checkConnection,
    permissionRequests,
    approvePermission,
    denyPermission
  } = useApp()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [projects, setProjects] = useState([])
  const [activeProject, setActiveProject] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // Auto-fill PIN from URL parameter (?pin=123456)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pinFromUrl = params.get('pin')
    
    if (pinFromUrl && /^\d{6}$/.test(pinFromUrl)) {
      // Valid 6-digit PIN found in URL
      console.log('Auto-filling PIN from URL')
      setPairingToken(pinFromUrl)
      // Trigger connection check
      setTimeout(() => checkConnection(), 100)
    }
  }, [setPairingToken, checkConnection])

  const fetchProjects = useCallback(async () => {
    if (!isConnected) return

    try {
      const res = await api.getProjects()
      setProjects(res?.projects || [])
    } catch (e) {
      console.log('No projects found', e)
      setProjects([])
    }
  }, [isConnected])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Fetch projects
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Keep active project bound to the currently opened session.
  useEffect(() => {
    if (!activeSessionId) {
      setActiveProject(null)
      localStorage.removeItem('activeProjectPath')
      return
    }

    const activeSession = sessions.find((s) => s.sessionId === activeSessionId)
    const sessionProjectPath = activeSession?.project?.path || null

    if (!sessionProjectPath) {
      setActiveProject(null)
      localStorage.removeItem('activeProjectPath')
      return
    }

    const nextProject =
      projects.find((p) => p.path === sessionProjectPath) ||
      activeSession.project

    if (
      activeProject?.path !== nextProject.path ||
      activeProject?.name !== nextProject.name
    ) {
      setActiveProject(nextProject)
    }
    localStorage.setItem('activeProjectPath', nextProject.path)
  }, [projects, activeProject, sessions, activeSessionId])

  const handleSelectSession = (id) => {
    const selectedSession = sessions.find((s) => s.sessionId === id)
    if (selectedSession?.project?.path) {
      const sessionProject =
        projects.find((p) => p.path === selectedSession.project.path) ||
        selectedSession.project
      setActiveProject(sessionProject)
      localStorage.setItem('activeProjectPath', selectedSession.project.path)
    } else {
      setActiveProject(null)
      localStorage.removeItem('activeProjectPath')
    }

    selectSession(id)
    if (isMobile) setSidebarOpen(false)
  }

  const handleNewChat = () => {
    setActiveProject(null)
    localStorage.removeItem('activeProjectPath')
    selectSession(null)
    if (isMobile) setSidebarOpen(false)
  }

  const handleProjectSelect = async (project) => {
    setActiveProject(project || null)

    if (project?.path) {
      localStorage.setItem('activeProjectPath', project.path)
    } else {
      localStorage.removeItem('activeProjectPath')
      selectSession(null)
      if (isMobile) setSidebarOpen(false)
      return
    }

    const projectChatMap = readProjectChatMap()
    const mappedSession = sessions.find(
      (s) =>
        s.sessionId === projectChatMap[project.path] &&
        s?.project?.path === project.path,
    )

    const existingProjectSession = mappedSession || [...sessions]
      .filter((s) => s?.project?.path === project.path)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0]

    if (existingProjectSession) {
      projectChatMap[project.path] = existingProjectSession.sessionId
      writeProjectChatMap(projectChatMap)
      selectSession(existingProjectSession.sessionId)
    } else {
      try {
        const newSession = await createSession(getPreferredModel(), project)
        if (newSession?.sessionId) {
          projectChatMap[project.path] = newSession.sessionId
          writeProjectChatMap(projectChatMap)
        }
      } catch (err) {
        console.error('Failed to create project chat session', err)
      }
    }

    if (isMobile) setSidebarOpen(false)
  }

  const handleDisconnect = () => {
    setServerUrl('') // Disconnect
  }

  if (!isConnected) {
    return <ConnectScreen onConnect={checkConnection} />
  }

  const onOpenSidebar = () => setSidebarOpen(true)
  const onCloseSidebar = () => setSidebarOpen(false)
  const generatingSessionId = isSending
    ? (sendingSessionId || activeSessionId)
    : null

  return (
    <div className="flex h-screen bg-[#18181b] overflow-hidden relative text-zinc-200">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden" 
          onClick={onCloseSidebar} 
        />
      )}

      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        serverUrl={serverUrl}
        onDisconnect={handleDisconnect}
        activeProject={activeProject}
        sidebarOpen={sidebarOpen}
        onCloseSidebar={onCloseSidebar}
        onProjectSelect={handleProjectSelect}
        onProjectsRefresh={fetchProjects}
        isMobile={isMobile}
        isSending={isSending}
        generatingSessionId={generatingSessionId}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-[#18181b] md:relative absolute inset-0 z-0">
        {activeSessionId ? (
          <ChatView
            sessionId={activeSessionId}
            serverUrl={serverUrl}
            onBack={handleNewChat}
            onOpenSidebar={onOpenSidebar}
          />
        ) : (
          <EmptyState
            onNewChat={handleNewChat}
            onOpenSidebar={onOpenSidebar}
            projects={projects}
            activeProject={activeProject}
            serverUrl={serverUrl}
          />
        )}
      </main>

      {/* Put permissions modal overlay here */}
      {permissionRequests.length > 0 && (
         <PermissionModal 
           request={permissionRequests[0]} 
           onAllow={() => approvePermission(permissionRequests[0].id)}
           onDeny={() => denyPermission(permissionRequests[0].id)}
         />
      )}
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  )
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App
