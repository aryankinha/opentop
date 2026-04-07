// API client for OpenTop backend
// Handles all REST API calls to the server

const DEFAULT_SERVER_URL = 'http://localhost:3000'

class ApiClient {
  constructor(serverUrl = DEFAULT_SERVER_URL) {
    this.serverUrl = serverUrl
    this.pairingToken = null
  }

  setServerUrl(url) {
    this.serverUrl = url
  }

  setPairingToken(token) {
    this.pairingToken = token
  }

  async request(endpoint, options = {}) {
    const url = `${this.serverUrl}${endpoint}`
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    // Add pairing token to all requests (except health which doesn't require it)
    if (this.pairingToken && endpoint !== '/health') {
      headers['Authorization'] = `Bearer ${this.pairingToken}`
    }

    const config = {
      headers,
      ...options,
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}`)
      }

      return data
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Is OpenTop running?')
      }
      throw error
    }
  }

  // Health check
  async getHealth() {
    return this.request('/health')
  }

  // Sessions
  async createSession(model = null) {
    return this.createSessionWithProject(model, null)
  }

  async createSessionWithProject(model = null, project = null) {
    const payload = {}
    if (model) payload.model = model
    if (project?.path) {
      payload.project = {
        name: project.name || undefined,
        path: project.path,
      }
    }

    return this.request('/session', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async getSessions() {
    return this.request('/sessions')
  }

  async getSession(sessionId) {
    return this.request(`/session/${sessionId}`)
  }

  async deleteSession(sessionId) {
    return this.request(`/session/${sessionId}`, {
      method: 'DELETE',
    })
  }

  async updateSessionTitle(sessionId, title) {
    return this.request(`/session/${sessionId}/title`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    })
  }

  // Chat
  async sendMessage(sessionId, message) {
    return this.request(`/session/${sessionId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  }

  async getMessages(sessionId) {
    return this.request(`/session/${sessionId}/messages`)
  }

  // Memory
  async getSessionMemory(sessionId) {
    return this.request(`/session/${sessionId}/memory`)
  }

  async compactSession(sessionId) {
    return this.request(`/session/${sessionId}/compact`, {
      method: 'POST',
    })
  }

  // Global Memory
  async getGlobalMemory() {
    return this.request('/memory')
  }

  async saveGlobalMemory(content) {
    return this.request('/memory', {
      method: 'POST',
      body: JSON.stringify({ content }),
    })
  }

  async appendGlobalMemory(fact) {
    return this.request('/memory/append', {
      method: 'POST',
      body: JSON.stringify({ fact }),
    })
  }

  async clearGlobalMemory() {
    return this.request('/memory', {
      method: 'DELETE',
    })
  }

  // Usage tracking
  async getUsage() {
    return this.request('/usage')
  }

  async getUsageHistory(days = 7) {
    return this.request(`/usage/history?days=${days}`)
  }

  async getSessionUsage(sessionId) {
    return this.request(`/usage/session/${sessionId}`)
  }

  // User context
  async getUser() {
    return this.request('/user')
  }

  // Projects
  async getProjects() {
    return this.request('/projects')
  }

  async addCustomProject(path, name = null) {
    return this.request('/projects/custom', {
      method: 'POST',
      body: JSON.stringify({ path, name }),
    })
  }

  async pickProjectFolder() {
    return this.request('/projects/pick-folder', {
      method: 'POST',
    })
  }
}

// Singleton instance
export const api = new ApiClient()

// Export class for testing or multiple instances
export { ApiClient }
