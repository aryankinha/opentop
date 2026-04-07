import { useState, useEffect, useCallback } from 'react'
import { ws } from '@/lib/websocket'

export function useWebSocket(sessionId) {
  const [isConnected, setIsConnected] = useState(false)
  const [permissionRequests, setPermissionRequests] = useState([])

  useEffect(() => {
    if (!sessionId) return

    // Set up WebSocket listeners
    const unsubConnection = ws.on('connection', ({ connected }) => {
      setIsConnected(connected)
    })

    const unsubPermission = ws.on('permission_request', (request) => {
      setPermissionRequests((prev) => [...prev, request])
    })

    const unsubAcknowledged = ws.on('permission_acknowledged', ({ id }) => {
      setPermissionRequests((prev) => prev.filter((r) => r.id !== id))
    })

    // Connect to WebSocket
    ws.connect(sessionId)

    return () => {
      unsubConnection()
      unsubPermission()
      unsubAcknowledged()
    }
  }, [sessionId])

  const respondToPermission = useCallback((id, approved) => {
    ws.sendPermissionResponse(id, approved)
    // Optimistically remove from queue
    setPermissionRequests((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const approvePermission = useCallback((id) => {
    respondToPermission(id, true)
  }, [respondToPermission])

  const denyPermission = useCallback((id) => {
    respondToPermission(id, false)
  }, [respondToPermission])

  return {
    isConnected,
    permissionRequests,
    approvePermission,
    denyPermission,
    pendingCount: permissionRequests.length,
  }
}
