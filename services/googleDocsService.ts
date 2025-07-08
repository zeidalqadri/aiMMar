import type { NoteSession } from '../types'

interface GoogleDocsAuth {
  access_token: string | null
  isAuthenticated: boolean
}

interface GoogleDoc {
  document_id: string
  title: string
  created_at: string
  revisions: GoogleDocRevision[]
}

interface GoogleDocRevision {
  revision_id: string
  modified_at: string
  modified_by: string
}

class GoogleDocsService {
  private auth: GoogleDocsAuth = {
    access_token: null,
    isAuthenticated: false
  }

  private API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL 
    ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api`
    : 'https://1b0a2511-3534-469b-ab29-6101faa9a591.preview.emergentagent.com/api'

  // Authentication methods
  async authenticate(): Promise<boolean> {
    try {
      // For now, we'll implement a simplified auth flow
      // In production, this would use Google OAuth
      console.log('Google Docs authentication required')
      
      // Placeholder for actual Google OAuth implementation
      // This would typically open a popup or redirect to Google OAuth
      
      return false // Not implemented yet
    } catch (error) {
      console.error('Google Docs authentication failed:', error)
      return false
    }
  }

  isAuthenticated(): boolean {
    return this.auth.isAuthenticated
  }

  // Document operations
  async createDocument(session: NoteSession): Promise<GoogleDoc | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Docs')
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/google-docs/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.auth.access_token}`
        },
        body: JSON.stringify({
          title: session.context.title,
          content: this.formatSessionForGoogleDocs(session)
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create Google Doc')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating Google Doc:', error)
      return null
    }
  }

  async updateDocument(documentId: string, session: NoteSession): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Docs')
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/google-docs/update/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.auth.access_token}`
        },
        body: JSON.stringify({
          content: this.formatSessionForGoogleDocs(session),
          version: session.current_version
        })
      })

      return response.ok
    } catch (error) {
      console.error('Error updating Google Doc:', error)
      return false
    }
  }

  async syncVersions(documentId: string, session: NoteSession): Promise<GoogleDocRevision[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Docs')
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/google-docs/revisions/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${this.auth.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch Google Docs revisions')
      }

      return await response.json()
    } catch (error) {
      console.error('Error syncing versions:', error)
      return []
    }
  }

  async exportToGoogleDocs(session: NoteSession): Promise<GoogleDoc | null> {
    if (!this.isAuthenticated()) {
      // Fallback: Show instructions for manual export
      this.showManualExportInstructions(session)
      return null
    }

    return await this.createDocument(session)
  }

  async importFromGoogleDocs(documentId: string): Promise<NoteSession | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Docs')
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/google-docs/import/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${this.auth.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to import from Google Docs')
      }

      const data = await response.json()
      return this.parseGoogleDocsToSession(data)
    } catch (error) {
      console.error('Error importing from Google Docs:', error)
      return null
    }
  }

  // Helper methods
  private formatSessionForGoogleDocs(session: NoteSession): string {
    let content = `${session.context.title}\n\n`
    content += `Goal: ${session.context.goal}\n`
    content += `Keywords: ${session.context.keywords}\n`
    content += `AI Model: ${session.context.selectedModel}\n`
    content += `Generated: ${new Date().toLocaleString()}\n\n`
    content += `---\n\n`
    
    if (session.livingDocument) {
      content += `Living Document:\n\n${session.livingDocument}\n\n`
      content += `---\n\n`
    }
    
    content += `Chat History:\n\n`
    session.chatHistory.forEach((entry, index) => {
      content += `${entry.role.toUpperCase()} (${index + 1}):\n${entry.text}\n\n`
    })
    
    return content
  }

  private parseGoogleDocsToSession(data: any): NoteSession {
    // This would parse Google Docs content back to our session format
    // Implementation depends on the actual Google Docs API response structure
    
    return {
      id: Date.now().toString(),
      lastModified: Date.now(),
      context: {
        title: data.title || 'Imported from Google Docs',
        goal: 'Imported document',
        keywords: 'imported, google-docs',
        selectedModel: 'unknown'
      },
      chatHistory: [],
      livingDocument: data.content || '',
      current_version: 1,
      versions: []
    }
  }

  private showManualExportInstructions(session: NoteSession): void {
    const content = this.formatSessionForGoogleDocs(session)
    
    // Create a temporary textarea to copy content
    const textarea = document.createElement('textarea')
    textarea.value = content
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    
    alert(`Content copied to clipboard!\n\nTo create a Google Doc:\n1. Go to docs.google.com\n2. Create a new document\n3. Paste the content (Cmd+V)\n4. Save with title: "${session.context.title}"`)
  }

  // Public interface for components
  getAuthStatus(): GoogleDocsAuth {
    return { ...this.auth }
  }

  async setupGoogleDocsAuth(): Promise<boolean> {
    // This would implement the full Google OAuth flow
    // For now, we return false to indicate it's not yet implemented
    alert('Google Docs integration is coming soon!\n\nFor now, you can use the Export feature to download your notes and manually upload to Google Docs.')
    return false
  }
}

export const googleDocsService = new GoogleDocsService()