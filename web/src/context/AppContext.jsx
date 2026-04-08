import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { ws } from '@/lib/websocket'

// Get default server URL dynamically
function getDefaultServerUrl() {
  // If we're on Vite dev server (port 5173), connect to backend on 18790
  if (window.location.origin === 'http://localhost:5173') {
    return 'http://localhost:18790'
  }
  // Otherwise, use same origin as the page (tunnel URL or deployed URL)
  return window.location.origin
}

// Initial state
const initialState = {
  // Connection
  serverUrl: localStorage.getItem('serverUrl') || getDefaultServerUrl(),
  pairingToken: localStorage.getItem('pairingToken') || '',
  isConnected: false,
  isConnecting: false,
  connectionError: null,

  // Sessions
  sessions: [],
  currentSessionId: null, // Always start with no session (new chat)
  sessionsLoading: false,

  // Messages (for current session)
  messages: [],
  messagesLoading: false,

  // Chat
  isSending: false,
  sendingSessionId: null,
  sendError: null,

  // Permissions
  permissionRequests: [],
}

// Action types
const actions = {
  SET_SERVER_URL: 'SET_SERVER_URL',
  SET_PAIRING_TOKEN: 'SET_PAIRING_TOKEN',
  SET_CONNECTED: 'SET_CONNECTED',
  SET_CONNECTING: 'SET_CONNECTING',
  SET_CONNECTION_ERROR: 'SET_CONNECTION_ERROR',
  SET_SESSIONS: 'SET_SESSIONS',
  SET_SESSIONS_LOADING: 'SET_SESSIONS_LOADING',
  SET_CURRENT_SESSION: 'SET_CURRENT_SESSION',
  ADD_SESSION: 'ADD_SESSION',
  REMOVE_SESSION: 'REMOVE_SESSION',
  SET_MESSAGES: 'SET_MESSAGES',
  SET_MESSAGES_LOADING: 'SET_MESSAGES_LOADING',
  ADD_MESSAGE: 'ADD_MESSAGE',
  SET_SENDING: 'SET_SENDING',
  SET_SENDING_SESSION: 'SET_SENDING_SESSION',
  SET_SEND_ERROR: 'SET_SEND_ERROR',
  ADD_PERMISSION_REQUEST: 'ADD_PERMISSION_REQUEST',
  REMOVE_PERMISSION_REQUEST: 'REMOVE_PERMISSION_REQUEST',
}

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    case actions.SET_SERVER_URL:
      localStorage.setItem('serverUrl', action.payload)
      api.setServerUrl(action.payload)
      ws.setUrl(action.payload)
      return { ...state, serverUrl: action.payload }

    case actions.SET_PAIRING_TOKEN:
      localStorage.setItem('pairingToken', action.payload || '')
      api.setPairingToken(action.payload)
      return { ...state, pairingToken: action.payload }

    case actions.SET_CONNECTED:
      return { ...state, isConnected: action.payload, isConnecting: false }

    case actions.SET_CONNECTING:
      return { ...state, isConnecting: action.payload, connectionError: null }

    case actions.SET_CONNECTION_ERROR:
      return { ...state, connectionError: action.payload, isConnecting: false, isConnected: false }

    case actions.SET_SESSIONS:
      return { ...state, sessions: action.payload, sessionsLoading: false }

    case actions.SET_SESSIONS_LOADING:
      return { ...state, sessionsLoading: action.payload }

    case actions.SET_CURRENT_SESSION: {
      const nextSessionId = action.payload || null
      localStorage.setItem('currentSessionId', nextSessionId || '')

      // Re-selecting the same session should not wipe the currently loaded messages.
      if (state.currentSessionId === nextSessionId) {
        return state
      }

      return { ...state, currentSessionId: nextSessionId, messages: [] }
    }

    case actions.ADD_SESSION:
      return { ...state, sessions: [...state.sessions, action.payload] }

    case actions.REMOVE_SESSION:
      return {
        ...state,
        sessions: state.sessions.filter((s) => s.sessionId !== action.payload),
        currentSessionId:
          state.currentSessionId === action.payload ? null : state.currentSessionId,
      }

    case actions.SET_MESSAGES:
      return { ...state, messages: action.payload, messagesLoading: false }

    case actions.SET_MESSAGES_LOADING:
      return { ...state, messagesLoading: action.payload }

    case actions.ADD_MESSAGE:
      return { ...state, messages: [...state.messages, action.payload] }

    case actions.SET_SENDING:
      return {
        ...state,
        isSending: action.payload,
        sendError: null,
        sendingSessionId: action.payload ? state.sendingSessionId : null,
      }

    case actions.SET_SENDING_SESSION:
      return { ...state, sendingSessionId: action.payload }

    case actions.SET_SEND_ERROR:
      return { ...state, sendError: action.payload, isSending: false, sendingSessionId: null }

    case actions.ADD_PERMISSION_REQUEST:
      return {
        ...state,
        permissionRequests: [...state.permissionRequests, action.payload],
      }

    case actions.REMOVE_PERMISSION_REQUEST:
      return {
        ...state,
        permissionRequests: state.permissionRequests.filter(
          (r) => r.id !== action.payload
        ),
      }

    default:
      return state
  }
}

// Create context
const AppContext = createContext(null)

// Provider component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // Initialize API URL and token
  useEffect(() => {
    api.setServerUrl(state.serverUrl)
    api.setPairingToken(state.pairingToken)
    ws.setUrl(state.serverUrl)
  }, [])

  // Check connection on mount
  useEffect(() => {
    checkConnection()
  }, [state.serverUrl])

  // Load sessions when connected
  useEffect(() => {
    if (state.isConnected) {
      loadSessions()
    }
  }, [state.isConnected])

  // Load messages when session changes
  useEffect(() => {
    if (state.currentSessionId && state.isConnected) {
      loadMessages(state.currentSessionId)
    }
  }, [state.currentSessionId, state.isConnected])

  // WebSocket connection
  useEffect(() => {
    if (!state.currentSessionId || !state.isConnected) return

    const unsubConnection = ws.on('connection', ({ connected }) => {
      dispatch({ type: actions.SET_CONNECTED, payload: connected })
    })

    const unsubPermission = ws.on('permission_request', (request) => {
      dispatch({ type: actions.ADD_PERMISSION_REQUEST, payload: request })
      // Vibrate on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200])
      }
    })

    const unsubAcknowledged = ws.on('permission_acknowledged', ({ id }) => {
      dispatch({ type: actions.REMOVE_PERMISSION_REQUEST, payload: id })
    })

    ws.connect(state.currentSessionId)

    return () => {
      unsubConnection()
      unsubPermission()
      unsubAcknowledged()
    }
  }, [state.currentSessionId, state.isConnected])

  // Actions
  const checkConnection = useCallback(async () => {
    dispatch({ type: actions.SET_CONNECTING, payload: true })
    try {
      await api.getHealth()
      dispatch({ type: actions.SET_CONNECTED, payload: true })
    } catch (error) {
      dispatch({ type: actions.SET_CONNECTION_ERROR, payload: error.message })
    }
  }, [])

  const setServerUrl = useCallback((url) => {
    dispatch({ type: actions.SET_SERVER_URL, payload: url })
  }, [])

  const setPairingToken = useCallback((token) => {
    dispatch({ type: actions.SET_PAIRING_TOKEN, payload: token })
  }, [])

  const loadSessions = useCallback(async () => {
    dispatch({ type: actions.SET_SESSIONS_LOADING, payload: true })
    try {
      const sessions = await api.getSessions()
      dispatch({ type: actions.SET_SESSIONS, payload: sessions })
    } catch (error) {
      console.error('Failed to load sessions:', error)
      dispatch({ type: actions.SET_SESSIONS, payload: [] })
    }
  }, [])

  const createSession = useCallback(async (model = null, project = null) => {
    try {
      const session = await api.createSessionWithProject(model, project)
      dispatch({ type: actions.ADD_SESSION, payload: session })
      dispatch({ type: actions.SET_CURRENT_SESSION, payload: session.sessionId })
      return session
    } catch (error) {
      console.error('Failed to create session:', error)
      throw error
    }
  }, [])

  const selectSession = useCallback((sessionId) => {
    dispatch({ type: actions.SET_CURRENT_SESSION, payload: sessionId })
  }, [])

  const deleteSession = useCallback(async (sessionId) => {
    try {
      await api.deleteSession(sessionId)
      dispatch({ type: actions.REMOVE_SESSION, payload: sessionId })
      
      // If deleting current session, clear it
      if (sessionId === state.currentSessionId) {
        localStorage.removeItem('currentSessionId')
        dispatch({ type: actions.SET_CURRENT_SESSION, payload: null })
        dispatch({ type: actions.SET_MESSAGES, payload: [] })
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
      throw error
    }
  }, [state.currentSessionId])

  // Update session title
  const updateSessionTitle = useCallback(async (sessionId, title) => {
    try {
      await api.updateSessionTitle(sessionId, title)
      // Refresh sessions to get updated title
      await loadSessions()
    } catch (error) {
      console.error('Failed to update session title:', error)
      throw error
    }
  }, [])

  const loadMessages = useCallback(async (sessionId) => {
    dispatch({ type: actions.SET_MESSAGES_LOADING, payload: true })
    try {
      const messages = await api.getMessages(sessionId)
      dispatch({ type: actions.SET_MESSAGES, payload: messages })
    } catch (error) {
      console.error('Failed to load messages:', error)
      dispatch({ type: actions.SET_MESSAGES, payload: [] })
    }
  }, [])

  const sendMessage = useCallback(async (message, options = {}) => {
    let sessionId = state.currentSessionId
    const selectedProject = options?.project || null
    const selectedModel = options?.model || null
    dispatch({ type: actions.SET_SENDING, payload: true })

    try {
      const currentSession = state.sessions.find((s) => s.sessionId === sessionId)

      // If user switched model while in an active chat, start a new session with that model.
      if (
        sessionId &&
        selectedModel &&
        currentSession?.model &&
        selectedModel !== currentSession.model
      ) {
        const session = await api.createSessionWithProject(
          selectedModel,
          selectedProject || currentSession.project || null,
        )
        dispatch({ type: actions.ADD_SESSION, payload: session })
        dispatch({ type: actions.SET_CURRENT_SESSION, payload: session.sessionId })
        sessionId = session.sessionId
      }

      // Create a session lazily only when user sends the first message.
      if (!sessionId) {
        const session = await api.createSessionWithProject(selectedModel, selectedProject)
        dispatch({ type: actions.ADD_SESSION, payload: session })
        dispatch({ type: actions.SET_CURRENT_SESSION, payload: session.sessionId })
        sessionId = session.sessionId
      }

      dispatch({ type: actions.SET_SENDING_SESSION, payload: sessionId })

      // Add user message optimistically
      const userMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      }
      dispatch({ type: actions.ADD_MESSAGE, payload: userMessage })

      const result = await api.sendMessage(sessionId, message)

      // Add assistant message
      const assistantMessage = {
        role: 'assistant',
        content: result.response,
        toolsUsed: result.toolsUsed || [],
        model: result.model || null,
        timestamp: new Date().toISOString(),
      }
      dispatch({ type: actions.ADD_MESSAGE, payload: assistantMessage })

      // Refresh sessions so auto-generated titles from backend appear immediately.
      try {
        const latestSessions = await api.getSessions()
        dispatch({ type: actions.SET_SESSIONS, payload: latestSessions })
      } catch (sessionRefreshError) {
        console.error('Failed to refresh sessions after send:', sessionRefreshError)
      }

      dispatch({ type: actions.SET_SENDING, payload: false })

      return result
    } catch (error) {
      dispatch({ type: actions.SET_SEND_ERROR, payload: error.message })
      throw error
    }
  }, [state.currentSessionId, state.sessions])

  const approvePermission = useCallback((id) => {
    ws.sendPermissionResponse(id, true)
    dispatch({ type: actions.REMOVE_PERMISSION_REQUEST, payload: id })
  }, [])

  const denyPermission = useCallback((id) => {
    ws.sendPermissionResponse(id, false)
    dispatch({ type: actions.REMOVE_PERMISSION_REQUEST, payload: id })
  }, [])

  const value = {
    ...state,
    checkConnection,
    setServerUrl,
    setPairingToken,
    loadSessions,
    createSession,
    selectSession,
    deleteSession,
    updateSessionTitle,
    loadMessages,
    sendMessage,
    approvePermission,
    denyPermission,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// Hook to use the context
export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
