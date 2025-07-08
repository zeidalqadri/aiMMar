import type { NoteSession, ChatVersion } from '../types.ts';
import { modelService } from './modelService.ts';

const SESSIONS_KEY = 'aiAmmar_sessions';
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL 
  ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api`
  : 'https://1b0a2511-3534-469b-ab29-6101faa9a591.preview.emergentagent.com/api';

// Debug logging
if (typeof window !== 'undefined') {
  console.log('StorageService - NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL)
  console.log('StorageService - API_BASE_URL:', API_BASE_URL)
}

export const storageService = {
  // Get sessions from API first, fallback to localStorage
  getSessions: async (): Promise<NoteSession[]> => {
    try {
      // Try to get sessions from API
      const response = await fetch(`${API_BASE_URL}/sessions`);
      if (response.ok) {
        const sessions = await response.json();
        return sessions;
      }
    } catch (error) {
      console.warn("Failed to load sessions from API, falling back to localStorage:", error);
    }

    // Fallback to localStorage
    try {
      const storedSessions = localStorage.getItem(SESSIONS_KEY);
      if (storedSessions) {
        const sessions = JSON.parse(storedSessions);
        
        // Migrate old sessions to new format
        const migratedSessions = sessions.map((session: any) => {
          // Add versioning fields if missing
          if (!session.current_version) {
            session.current_version = 1;
          }
          if (!session.versions) {
            session.versions = [{
              id: `${session.id}_v1`,
              version_number: 1,
              timestamp: new Date().toISOString(),
              chatHistory: session.chatHistory || [],
              livingDocument: session.livingDocument || '',
              modelUsed: session.context?.selectedModel || modelService.getDefaultModel(),
              checkpoint_name: 'Initial Version',
              auto_checkpoint: false
            }];
          }
          if (!session.context?.selectedModel) {
            session.context.selectedModel = modelService.getDefaultModel();
          }
          return session;
        });
        
        return migratedSessions;
      }
    } catch (error) {
      console.error("Failed to load sessions from local storage:", error);
    }
    return [];
  },

  // Save session to API first, then localStorage
  saveSession: async (session: NoteSession): Promise<void> => {
    try {
      // Try to save to API
      const response = await fetch(`${API_BASE_URL}/sessions/${session.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(session)
      });

      if (response.ok) {
        return; // Successfully saved to API
      }
    } catch (error) {
      console.warn("Failed to save session to API, falling back to localStorage:", error);
    }

    // Fallback to localStorage
    try {
      const sessions = await storageService.getSessions();
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      if (existingIndex > -1) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error("Failed to save session to local storage:", error);
    }
  },

  // Create new session via API
  createSession: async (session: Omit<NoteSession, 'id' | 'lastModified' | 'current_version' | 'versions'>): Promise<NoteSession> => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: session.context,
          chatHistory: session.chatHistory,
          livingDocument: session.livingDocument
        })
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn("Failed to create session via API, falling back to localStorage:", error);
    }

    // Fallback to localStorage
    const newSession: NoteSession = {
      id: Date.now().toString(),
      lastModified: Date.now(),
      current_version: 1,
      versions: [{
        id: `${Date.now()}_v1`,
        version_number: 1,
        timestamp: new Date().toISOString(),
        chatHistory: session.chatHistory,
        livingDocument: session.livingDocument,
        modelUsed: session.context.selectedModel,
        checkpoint_name: 'Initial Version',
        auto_checkpoint: false
      }],
      ...session
    };

    await storageService.saveSession(newSession);
    return newSession;
  },

  // Get single session
  getSession: async (sessionId: string): Promise<NoteSession | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn("Failed to get session from API, falling back to localStorage:", error);
    }

    // Fallback to localStorage
    const sessions = await storageService.getSessions();
    return sessions.find(s => s.id === sessionId) || null;
  },

  // Delete session
  deleteSession: async (sessionId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        return; // Successfully deleted from API
      }
    } catch (error) {
      console.warn("Failed to delete session from API, falling back to localStorage:", error);
    }

    // Fallback to localStorage
    try {
      const sessions = await storageService.getSessions();
      const filteredSessions = sessions.filter(s => s.id !== sessionId);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(filteredSessions));
    } catch (error) {
      console.error("Failed to delete session from local storage:", error);
    }
  },

  // Create auto-checkpoint before AI response
  createAutoCheckpoint: async (session: NoteSession): Promise<ChatVersion> => {
    const checkpoint: ChatVersion = {
      id: `${session.id}_${Date.now()}`,
      version_number: session.current_version + 1,
      timestamp: new Date().toISOString(),
      chatHistory: [...session.chatHistory],
      livingDocument: session.livingDocument,
      modelUsed: session.context.selectedModel,
      checkpoint_name: `Auto-checkpoint before AI response`,
      auto_checkpoint: true
    };

    // Add to session versions
    const updatedSession = {
      ...session,
      versions: [...session.versions, checkpoint],
      current_version: checkpoint.version_number
    };

    await storageService.saveSession(updatedSession);
    return checkpoint;
  }
};