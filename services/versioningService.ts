import type { NoteSession, ChatVersion, NoteContext } from '../types'

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL 
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : 'https://1b0a2511-3534-469b-ab29-6101faa9a591.preview.emergentagent.com/api'

export const versioningService = {
  // Create a new checkpoint version
  createCheckpoint: async (sessionId: string, checkpointName?: string, autoCheckpoint: boolean = false): Promise<ChatVersion> => {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        checkpoint_name: checkpointName,
        auto_checkpoint: autoCheckpoint
      })
    })

    if (!response.ok) {
      throw new Error('Failed to create checkpoint')
    }

    return response.json()
  },

  // Get all versions for a session
  getVersions: async (sessionId: string): Promise<ChatVersion[]> => {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/versions`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch versions')
    }

    return response.json()
  },

  // Restore a specific version
  restoreVersion: async (sessionId: string, versionId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        version_id: versionId
      })
    })

    if (!response.ok) {
      throw new Error('Failed to restore version')
    }
  },

  // Switch model and optionally create checkpoint
  switchModel: async (sessionId: string, newModel: string, createCheckpoint: boolean = true): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/switch-model`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        new_model: newModel,
        create_checkpoint: createCheckpoint
      })
    })

    if (!response.ok) {
      throw new Error('Failed to switch model')
    }
  },

  // Delete a version
  deleteVersion: async (sessionId: string, versionId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/versions/${versionId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error('Failed to delete version')
    }
  },

  // Create auto-checkpoint before AI response
  createAutoCheckpoint: async (sessionId: string, modelUsed: string): Promise<ChatVersion> => {
    const timestamp = new Date().toISOString()
    return versioningService.createCheckpoint(
      sessionId, 
      `Auto-checkpoint (${modelUsed}) - ${timestamp}`,
      true
    )
  },

  // Format version display name
  formatVersionName: (version: ChatVersion): string => {
    if (version.checkpoint_name) {
      return version.checkpoint_name
    }
    
    const date = new Date(version.timestamp).toLocaleString()
    return `Version ${version.version_number} - ${date}`
  },

  // Get version summary for display
  getVersionSummary: (version: ChatVersion): string => {
    const chatCount = version.chatHistory.length
    const docLength = version.livingDocument.length
    const model = version.modelUsed.split('/').pop() || version.modelUsed
    
    return `${chatCount} messages • ${docLength} chars • ${model}`
  }
}