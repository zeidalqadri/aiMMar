"use client"

import React from "react"
import { useState, useEffect } from "react"
import type { NoteSession, NoteContext } from "./types"
import { storageService } from "./services/storageService"
import { ContextSetup } from "./components/ContextSetup"
import { NoteTaking } from "./components/NoteTaking"

// Simple Header
const SimpleHeader = () => (
  React.createElement('div', { className: "p-4 border-b-2 border-black bg-white" },
    React.createElement('h1', { className: "text-xl font-bold" }, "aiAmmar")
  )
)

// History View
const SimpleHistoryView = ({ sessions, onNew, onSelectSession }: { 
  sessions: NoteSession[], 
  onNew: () => void,
  onSelectSession: (session: NoteSession) => void 
}) => (
  React.createElement('div', { className: "flex items-center justify-center h-full w-full" },
    React.createElement('div', { className: "w-full max-w-2xl p-8 space-y-6 bg-white border-2 border-black" },
      React.createElement('div', { className: "text-center" },
        React.createElement('h1', { className: "text-6xl font-black tracking-tighter" }, "aiAmmar"),
        React.createElement('p', { className: "mt-2 text-sm" }, "Session History")
      ),
      
      // Session List
      sessions.length > 0 ? (
        React.createElement('div', { className: "space-y-3" },
          sessions.map(session => 
            React.createElement('div', { 
              key: session.id,
              className: "p-4 border-2 border-dashed border-black cursor-pointer hover:bg-gray-50 transition-colors",
              onClick: () => onSelectSession(session)
            },
              React.createElement('div', { className: "flex justify-between items-start" },
                React.createElement('div', { className: "flex-1" },
                  React.createElement('h3', { className: "font-bold text-sm" }, session.context.title),
                  React.createElement('p', { className: "text-xs text-gray-600 mt-1" }, session.context.goal.substring(0, 100) + '...'),
                  React.createElement('p', { className: "text-xs text-gray-500 mt-2" }, 
                    `${session.chatHistory.length} messages • ${new Date(session.lastModified).toLocaleDateString()}`
                  )
                ),
                React.createElement('div', { className: "text-xs text-gray-500" }, "→")
              )
            )
          )
        )
      ) : (
        React.createElement('p', { className: "text-center text-gray-500 py-8" }, "No previous sessions found.")
      ),
      
      // Separator
      React.createElement('div', { className: "border-b border-dashed border-black" }),
      
      // New Session Button
      React.createElement('button', {
        onClick: onNew,
        className: "w-full flex justify-center py-3 px-4 border-2 border-black text-sm font-bold bg-black text-white hover:bg-white hover:text-black focus:outline-none focus:ring-0 transition-colors duration-200"
      }, "START NEW SESSION")
    )
  )
)

// Main App Component
export const App: React.FC = () => {
  const [sessions, setSessions] = useState<NoteSession[]>([])
  const [view, setView] = useState<string>("history")
  const [currentSession, setCurrentSession] = useState<NoteSession | null>(null)

  useEffect(() => {
    const loadSessions = async () => {
      const loadedSessions = await storageService.getSessions()
      setSessions(loadedSessions)
    }
    loadSessions()
  }, [])

  const handleStartNew = () => {
    setView("context")
  }

  const handleBackToHistory = () => {
    setView("history")
    setCurrentSession(null)
    // Refresh sessions list
    setSessions(storageService.getSessions())
  }

  const handleContextComplete = async (context: NoteContext) => {
    try {
      // Create session using the proper createSession method that syncs to backend
      const newSession = await storageService.createSession({
        context,
        chatHistory: [],
        livingDocument: ''
      })
      
      setCurrentSession(newSession)
      setView("notetaking")
    } catch (error) {
      console.error('Failed to create session:', error)
      
      // Fallback to local creation if backend fails
      const fallbackSession: NoteSession = {
        id: Date.now().toString(),
        lastModified: Date.now(),
        context,
        chatHistory: [],
        livingDocument: '',
        current_version: 1,
        versions: [{
          id: `${Date.now()}_v1`,
          version_number: 1,
          timestamp: new Date().toISOString(),
          chatHistory: [],
          livingDocument: '',
          modelUsed: context.selectedModel,
          checkpoint_name: 'Initial Version',
          auto_checkpoint: false
        }]
      }
      
      setCurrentSession(fallbackSession)
      setView("notetaking")
    }
  }

  const handleSelectSession = (session: NoteSession) => {
    setCurrentSession(session)
    setView("notetaking")
  }

  const handleSaveSession = async (session: NoteSession) => {
    await storageService.saveSession(session)
    // Refresh sessions list
    const refreshedSessions = await storageService.getSessions()
    setSessions(refreshedSessions)
  }

  return React.createElement('div', { className: "h-screen flex flex-col bg-white text-black" },
    view === "history" && React.createElement('main', { className: "flex-1 overflow-auto p-4" },
      React.createElement(SimpleHistoryView, { 
        sessions, 
        onNew: handleStartNew,
        onSelectSession: handleSelectSession
      })
    ),
    view === "context" && React.createElement(ContextSetup, {
      onComplete: handleContextComplete,
      onBack: handleBackToHistory
    }),
    view === "notetaking" && currentSession && React.createElement(NoteTaking, {
      initialSession: currentSession,
      onBack: handleBackToHistory,
      onSave: handleSaveSession
    })
  )
}

export default App