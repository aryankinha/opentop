// WebSocket client for OpenTop backend
// Handles real-time permission requests and connection status

const DEFAULT_WS_URL = 'ws://localhost:3000'

class WebSocketClient {
  constructor() {
    this.ws = null
    this.url = DEFAULT_WS_URL
    this.sessionId = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
    this.listeners = new Map()
    this.isConnected = false
  }

  setUrl(url) {
    // Convert http(s) to ws(s)
    this.url = url.replace(/^http/, 'ws')
  }

  connect(sessionId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Already connected, just subscribe to new session
      if (sessionId !== this.sessionId) {
        this.subscribe(sessionId)
      }
      return
    }

    this.sessionId = sessionId

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        this.isConnected = true
        this.reconnectAttempts = 0
        this.emit('connection', { connected: true })

        if (this.sessionId) {
          this.subscribe(this.sessionId)
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleMessage(data)
        } catch (error) {
          console.error('WebSocket message parse error:', error)
        }
      }

      this.ws.onclose = () => {
        this.isConnected = false
        this.emit('connection', { connected: false })
        this.attemptReconnect()
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.emit('error', { error: 'WebSocket connection error' })
      }
    } catch (error) {
      console.error('WebSocket connection failed:', error)
      this.emit('error', { error: error.message })
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
    this.sessionId = null
    this.reconnectAttempts = this.maxReconnectAttempts // Prevent reconnect
  }

  subscribe(sessionId) {
    this.sessionId = sessionId
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        sessionId,
      }))
    }
  }

  sendPermissionResponse(id, approved) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'permission_response',
        id,
        approved,
      }))
    }
  }

  handleMessage(data) {
    switch (data.type) {
      case 'subscribed':
        this.emit('subscribed', { sessionId: data.sessionId })
        break

      case 'permission_request':
        this.emit('permission_request', data)
        // Vibrate on mobile if supported
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200])
        }
        break

      case 'permission_acknowledged':
        this.emit('permission_acknowledged', { id: data.id })
        break

      case 'error':
        this.emit('error', { error: data.message })
        break

      default:
        console.log('Unknown WebSocket message type:', data.type)
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', { error: 'Max reconnection attempts reached' })
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    setTimeout(() => {
      if (!this.isConnected && this.sessionId) {
        this.connect(this.sessionId)
      }
    }, delay)
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback)
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data)
      } catch (error) {
        console.error(`Error in ${event} listener:`, error)
      }
    })
  }
}

// Singleton instance
export const ws = new WebSocketClient()

// Export class for testing
export { WebSocketClient }
