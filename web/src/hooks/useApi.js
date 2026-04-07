import { useState, useCallback } from 'react'
import { api } from '@/lib/api'

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const callApi = useCallback(async (apiMethod, ...args) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiMethod(...args)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Wrapped API methods
  const getHealth = useCallback(() => callApi(api.getHealth.bind(api)), [callApi])
  
  const createSession = useCallback(
    (model) => callApi(api.createSession.bind(api), model),
    [callApi]
  )
  
  const getSessions = useCallback(() => callApi(api.getSessions.bind(api)), [callApi])
  
  const getSession = useCallback(
    (sessionId) => callApi(api.getSession.bind(api), sessionId),
    [callApi]
  )
  
  const deleteSession = useCallback(
    (sessionId) => callApi(api.deleteSession.bind(api), sessionId),
    [callApi]
  )
  
  const sendMessage = useCallback(
    (sessionId, message) => callApi(api.sendMessage.bind(api), sessionId, message),
    [callApi]
  )
  
  const getMessages = useCallback(
    (sessionId) => callApi(api.getMessages.bind(api), sessionId),
    [callApi]
  )

  return {
    loading,
    error,
    clearError: () => setError(null),
    getHealth,
    createSession,
    getSessions,
    getSession,
    deleteSession,
    sendMessage,
    getMessages,
  }
}
