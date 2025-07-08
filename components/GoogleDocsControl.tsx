"use client"

import React, { useState } from 'react'
import { FileText, Upload, Download, RefreshCw, ChevronDown } from 'lucide-react'
import type { NoteSession } from '../types'
import { googleDocsService } from '../services/googleDocsService'

interface GoogleDocsControlProps {
  session: NoteSession
  onSessionUpdate?: (session: NoteSession) => void
}

export const GoogleDocsControl: React.FC<GoogleDocsControlProps> = ({ 
  session, 
  onSessionUpdate 
}) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleAuth = async () => {
    setLoading('auth')
    try {
      const success = await googleDocsService.setupGoogleDocsAuth()
      setIsAuthenticated(success)
      if (!success) {
        setError('Google Docs authentication not yet available')
      }
    } catch (err) {
      setError('Failed to authenticate with Google Docs')
      console.error('Auth error:', err)
    } finally {
      setLoading('')
    }
  }

  const handleExportToGoogleDocs = async () => {
    setLoading('export')
    setError(null)
    
    try {
      const doc = await googleDocsService.exportToGoogleDocs(session)
      if (doc) {
        alert(`Successfully exported to Google Docs!\nDocument ID: ${doc.document_id}`)
      }
      setShowDropdown(false)
    } catch (err) {
      setError('Failed to export to Google Docs')
      console.error('Export error:', err)
    } finally {
      setLoading('')
    }
  }

  const handleImportFromGoogleDocs = async () => {
    const documentId = prompt('Enter Google Docs document ID:')
    if (!documentId) return

    setLoading('import')
    setError(null)
    
    try {
      const importedSession = await googleDocsService.importFromGoogleDocs(documentId)
      if (importedSession && onSessionUpdate) {
        onSessionUpdate(importedSession)
        alert('Successfully imported from Google Docs!')
      }
      setShowDropdown(false)
    } catch (err) {
      setError('Failed to import from Google Docs')
      console.error('Import error:', err)
    } finally {
      setLoading('')
    }
  }

  const handleSyncVersions = async () => {
    if (!isAuthenticated) {
      setError('Please authenticate with Google Docs first')
      return
    }

    setLoading('sync')
    setError(null)
    
    try {
      // This would sync versions between our app and Google Docs
      // Implementation depends on having a document ID associated with the session
      alert('Version sync feature coming soon!')
      setShowDropdown(false)
    } catch (err) {
      setError('Failed to sync versions')
      console.error('Sync error:', err)
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-1 px-3 py-1 border border-black text-xs font-medium hover:bg-gray-50"
      >
        <FileText className="w-3 h-3" />
        <span>Google Docs</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      
      {showDropdown && (
        <div className="absolute top-full right-0 mt-1 bg-white border-2 border-black shadow-lg z-50 min-w-[220px]">
          <div className="p-2 border-b border-gray-200">
            <div className="text-xs font-bold">Google Docs Integration</div>
            <div className="text-xs text-gray-500 mt-1">
              {isAuthenticated ? 'Connected' : 'Not connected'}
            </div>
          </div>
          
          {error && (
            <div className="p-2 bg-red-50 border-b border-red-200">
              <div className="text-xs text-red-600">{error}</div>
            </div>
          )}
          
          <div className="py-1">
            {!isAuthenticated && (
              <button
                onClick={handleAuth}
                disabled={loading === 'auth'}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-xs disabled:opacity-50"
              >
                <FileText className="w-3 h-3" />
                <span>{loading === 'auth' ? 'Connecting...' : 'Connect to Google Docs'}</span>
              </button>
            )}
            
            <button
              onClick={handleExportToGoogleDocs}
              disabled={loading === 'export'}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-xs disabled:opacity-50"
            >
              <Upload className="w-3 h-3" />
              <span>{loading === 'export' ? 'Exporting...' : 'Export to Google Docs'}</span>
            </button>
            
            <button
              onClick={handleImportFromGoogleDocs}
              disabled={loading === 'import' || !isAuthenticated}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-xs disabled:opacity-50"
            >
              <Download className="w-3 h-3" />
              <span>{loading === 'import' ? 'Importing...' : 'Import from Google Docs'}</span>
            </button>
            
            <button
              onClick={handleSyncVersions}
              disabled={loading === 'sync' || !isAuthenticated}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-xs disabled:opacity-50"
            >
              <Sync className="w-3 h-3" />
              <span>{loading === 'sync' ? 'Syncing...' : 'Sync Versions'}</span>
            </button>
          </div>
          
          <div className="p-2 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-600">
              Export creates a new Google Doc with your notes and chat history. 
              Import brings Google Docs content into a new session.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}