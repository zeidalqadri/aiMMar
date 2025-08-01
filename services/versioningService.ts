import type { NoteSession, ChatVersion, NoteContext } from '../types'

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL
  ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api`
  : null // No default backend URL - will use localStorage only

// Debug logging
if (typeof window !== 'undefined') {
  console.log('VersioningService - NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL)
  console.log('VersioningService - API_BASE_URL:', API_BASE_URL)
}

export const versioningService = {
  // Create a new checkpoint version
  createCheckpoint: async (sessionId: string, checkpointName?: string, autoCheckpoint: boolean = false): Promise<ChatVersion> => {
    if (!API_BASE_URL) {
      throw new Error('Backend not configured - checkpoint creation not available')
    }

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
    if (!API_BASE_URL) {
      console.log('Backend not configured, returning empty versions')
      return []
    }

    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/versions`)
      
      if (response.status === 404) {
        // Session doesn't exist in backend yet, return empty array
        console.log('Session not found in backend, returning empty versions')
        return []
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch versions: ${response.status}`)
      }

      return response.json()
    } catch (error) {
      console.warn('Failed to fetch versions from API:', error)
      return []
    }
  },

  // Restore a specific version
  restoreVersion: async (sessionId: string, versionId: string): Promise<void> => {
    if (!API_BASE_URL) {
      throw new Error('Backend not configured - version restore not available')
    }

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
    if (!API_BASE_URL) {
      throw new Error('Backend not configured - model switching not available')
    }

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
    if (!API_BASE_URL) {
      throw new Error('Backend not configured - version deletion not available')
    }

    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/versions/${versionId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error('Failed to delete version')
    }
  },

  // Create auto-checkpoint before AI response
  createAutoCheckpoint: async (sessionId: string, modelUsed: string): Promise<ChatVersion | null> => {
    const timestamp = new Date().toISOString()
    try {
      return await versioningService.createCheckpoint(
        sessionId, 
        `Auto-checkpoint (${modelUsed}) - ${timestamp}`,
        true
      )
    } catch (error) {
      console.warn('Failed to create auto-checkpoint (session may not exist in backend yet):', error)
      return null
    }
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