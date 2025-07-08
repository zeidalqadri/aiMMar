"use client"

import React, { useState, useEffect, useRef } from 'react'
import type { NoteSession, NoteContext, ChatEntry, ImageFile, ChatVersion } from '../types'
import { chatService } from '../services/openRouterService'
import { storageService } from '../services/storageService'
import { versioningService } from '../services/versioningService'
import { HeaderVersionControl } from './HeaderVersionControl'
import { ResizablePanels } from './ResizablePanels'
import { ExportControl } from './ExportControl'
import { GoogleDocsControl } from './GoogleDocsControl'
import { AnimatedThinking } from './AnimatedThinking'
import { ChainOfThought } from './ChainOfThought'

interface NoteTakingProps {
  initialSession: NoteSession
  onBack: () => void
  onSave: (session: NoteSession) => void
}

export const NoteTaking: React.FC<NoteTakingProps> = ({ 
  initialSession, 
  onBack, 
  onSave 
}) => {
  const [session, setSession] = useState<NoteSession>(initialSession)
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatSession, setChatSession] = useState<any>(null)
  const [lastUserMessage, setLastUserMessage] = useState('')
  const [showChainOfThought, setShowChainOfThought] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Initialize AI chat session
    const initChat = chatService.startChat(session.context)
    setChatSession(initChat)
    
    // If this is a new session, send initial message
    if (session.chatHistory.length === 0) {
      sendInitialMessage(initChat)
    }
  }, [])

  // Reinitialize chat when model changes
  useEffect(() => {
    if (chatSession) {
      const newChat = chatService.startChat(session.context)
      setChatSession(newChat)
    }
  }, [session.context.selectedModel])

  useEffect(() => {
    // Auto-scroll to bottom of chat
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session.chatHistory])

  // Versioning handlers
  const handleSessionUpdate = (updatedSession: NoteSession) => {
    setSession(updatedSession)
    onSave(updatedSession)
  }

  const handleVersionRestore = async (version: ChatVersion) => {
    try {
      // Refresh session data after restore
      const refreshedSession = await storageService.getSession(session.id)
      if (refreshedSession) {
        setSession(refreshedSession)
        onSave(refreshedSession)
        
        // Reinitialize chat with restored model
        const newChat = chatService.startChat(refreshedSession.context)
        setChatSession(newChat)
      }
    } catch (err) {
      console.error('Error handling version restore:', err)
      setError('Failed to restore version. Please try again.')
    }
  }

  const handleModelSwitch = async (newModel: string) => {
    try {
      // Refresh session data after model switch
      const refreshedSession = await storageService.getSession(session.id)
      if (refreshedSession) {
        setSession(refreshedSession)
        onSave(refreshedSession)
        
        // Reinitialize chat with new model
        const newChat = chatService.startChat(refreshedSession.context)
        setChatSession(newChat)
      }
    } catch (err) {
      console.error('Error handling model switch:', err)
      setError('Failed to switch model. Please try again.')
    }
  }

  const sendInitialMessage = async (chat: any) => {
    try {
      setIsLoading(true)
      
      // Ensure session is saved to backend before sending initial message
      try {
        await storageService.saveSession(session)
        console.log('Session saved to backend before initial message')
      } catch (saveErr) {
        console.warn('Failed to save session to backend, continuing with localStorage:', saveErr)
      }
      
      const response = await chatService.sendMessage(chat, "Hello, I'm ready to start taking notes!", null)
      
      const newChatEntry: ChatEntry = {
        id: Date.now().toString(),
        role: 'model',
        text: response.reply,
        image: null
      }
      
      const updatedSession = {
        ...session,
        chatHistory: [newChatEntry],
        livingDocument: response.document,
        lastModified: Date.now()
      }
      
      setSession(updatedSession)
      await storageService.saveSession(updatedSession)
      onSave(updatedSession)
      
    } catch (err) {
      console.error('Error sending initial message:', err)
      setError('Failed to initialize AI chat. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isLoading || !chatSession) return

    const userMessage: ChatEntry = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      image: null
    }

    // Add user message immediately
    const updatedHistoryWithUser = [...session.chatHistory, userMessage]
    setSession(prev => ({ ...prev, chatHistory: updatedHistoryWithUser }))
    setInputText('')
    setIsLoading(true)
    setError(null)

    try {
      // Create auto-checkpoint before AI response (only if session exists in backend)
      try {
        await versioningService.createAutoCheckpoint(session.id, session.context.selectedModel)
      } catch (checkpointErr) {
        console.log('Auto-checkpoint skipped (session not in backend yet):', checkpointErr)
      }
      
      const response = await chatService.sendMessage(chatSession, inputText, null)
      
      const aiMessage: ChatEntry = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.reply,
        image: null
      }
      
      const finalSession = {
        ...session,
        chatHistory: [...updatedHistoryWithUser, aiMessage],
        livingDocument: response.document,
        lastModified: Date.now()
      }
      
      setSession(finalSession)
      await storageService.saveSession(finalSession)
      onSave(finalSession)
      
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.metaKey || e.ctrlKey) {
        // Cmd+Enter or Ctrl+Enter = submit
        e.preventDefault()
        if (!isLoading && inputText.trim()) {
          handleSendMessage(e as any)
        }
      }
      // Regular Enter = new line (default behavior)
    }
  }

  const formatMessage = (text: string) => {
    // Simple text formatting - convert line breaks to <br> tags
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ))
  }

  const formatDocument = (markdown: string) => {
    // Simple markdown rendering - convert basic markdown to JSX
    return markdown.split('\n').map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold mb-4 border-b-2 border-black pb-2">{line.slice(2)}</h1>
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-bold mb-3 mt-6">{line.slice(3)}</h2>
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-bold mb-2 mt-4">{line.slice(4)}</h3>
      }
      if (line.startsWith('- ')) {
        return <li key={index} className="ml-4 mb-1">• {line.slice(2)}</li>
      }
      if (line.includes('<GAP>')) {
        return <div key={index} className="my-2 p-2 border-2 border-dashed border-black bg-gray-50">{line}</div>
      }
      if (line.trim() === '') {
        return <div key={index} className="mb-2"></div>
      }
      return <p key={index} className="mb-2">{line}</p>
    })
  }

  return (
    <div className="h-screen flex flex-col bg-white text-black">
      {/* Header */}
      <div className="p-4 border-b-2 border-black">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="px-4 py-2 border-2 border-black text-sm font-bold bg-white text-black hover:bg-black hover:text-white focus:outline-none focus:ring-0 transition-colors duration-200"
          >
            ← BACK
          </button>
          
          <div className="flex items-center space-x-6">
            <HeaderVersionControl
              session={session}
              onSessionUpdate={handleSessionUpdate}
              onVersionRestore={handleVersionRestore}
              onModelSwitch={handleModelSwitch}
            />
            <ExportControl session={session} />
            <GoogleDocsControl 
              session={session} 
              onSessionUpdate={handleSessionUpdate}
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">aiAmmar</h1>
            <div className="text-sm">
              {session.context.title}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <ResizablePanels
        leftPanel={
          <div className="flex flex-col h-full">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {session.chatHistory.map((entry) => (
                <div key={entry.id} className={`${entry.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block max-w-[80%] p-3 border-2 border-black ${
                    entry.role === 'user' 
                      ? 'bg-black text-white' 
                      : 'bg-white text-black'
                  }`}>
                    <div className="text-xs font-bold mb-1">
                      {entry.role === 'user' ? 'YOU' : 'AI'}
                    </div>
                    <div className="text-sm">
                      {formatMessage(entry.text)}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="text-left">
                  <div className="inline-block p-3 border-2 border-black bg-white text-black">
                    <div className="text-xs font-bold mb-1">AI</div>
                    <div className="text-sm">Thinking...</div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-200">
              {error && (
                <div className="mb-2 p-2 border-2 border-black bg-red-50 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your note... (Cmd+Enter to send)"
                    className="w-full p-3 border-2 border-black focus:outline-none focus:ring-0 bg-white resize-none min-h-[50px] max-h-[150px]"
                    disabled={isLoading}
                    rows={2}
                  />
                  <div className="absolute bottom-1 right-2 text-xs text-gray-400">
                    Cmd+Enter to send
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !inputText.trim()}
                  className="px-6 py-3 border-2 border-black text-sm font-bold bg-black text-white hover:bg-white hover:text-black focus:outline-none focus:ring-0 transition-colors duration-200 disabled:opacity-50 self-end"
                >
                  SEND
                </button>
              </form>
            </div>
          </div>
        }
        rightPanel={
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold">LIVING DOCUMENT</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {session.livingDocument ? (
                <div className="prose max-w-none">
                  {formatDocument(session.livingDocument)}
                </div>
              ) : (
                <div className="text-center text-gray-500 mt-8">
                  <p>Your living document will appear here</p>
                  <p className="text-sm mt-2">Start taking notes to see it grow!</p>
                </div>
              )}
            </div>
          </div>
        }
      />
    </div>
  )
}