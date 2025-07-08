import type { NoteSession } from '../types.ts';

const SESSIONS_KEY = 'aiAmmar_sessions';

export const storageService = {
  getSessions: (): NoteSession[] => {
    try {
      const storedSessions = localStorage.getItem(SESSIONS_KEY);
      if (storedSessions) {
        return JSON.parse(storedSessions);
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