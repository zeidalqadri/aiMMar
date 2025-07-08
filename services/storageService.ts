import type { NoteSession } from '../types.ts';
import { modelService } from './modelService.ts';

const SESSIONS_KEY = 'aiAmmar_sessions';

export const storageService = {
  getSessions: (): NoteSession[] => {
    try {
      const storedSessions = localStorage.getItem(SESSIONS_KEY);
      if (storedSessions) {
        const sessions = JSON.parse(storedSessions);
        
        // Migrate old sessions that don't have selectedModel
        const migratedSessions = sessions.map((session: any) => {
          if (!session.context.selectedModel) {
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

  saveSession: (session: NoteSession): void => {
    try {
      const sessions = storageService.getSessions();
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

  deleteSession: (sessionId: string): void => {
    try {
      let sessions = storageService.getSessions();
      sessions = sessions.filter(s => s.id !== sessionId);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error("Failed to delete session from local storage:", error);
    }
  },
};