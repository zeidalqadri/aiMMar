"use client"

import React, { useState } from 'react'
import { Download, FileText, Copy, ChevronDown } from 'lucide-react'
import type { NoteSession } from '../types'
import { exportService } from '../services/exportService'

interface ExportControlProps {
  session: NoteSession
}

export const ExportControl: React.FC<ExportControlProps> = ({ session }) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (type: 'markdown' | 'pdf' | 'clipboard') => {
    setLoading(type)
    setError(null)
    
    try {
      switch (type) {
        case 'markdown':
          exportService.exportAsMarkdown(session)
          break
        case 'pdf':
          await exportService.exportAsPDF(session)
          break
        case 'clipboard':
          await exportService.copyToClipboard(session)
          break
      }
      setShowDropdown(false)
    } catch (err) {
      setError(`Failed to export as ${type}`)
      console.error('Export error:', err)
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
        <Download className="w-3 h-3" />
        <span>Export</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      
      {showDropdown && (
        <div className="absolute top-full right-0 mt-1 bg-white border-2 border-black shadow-lg z-50 min-w-[180px]">
          <div className="p-2 border-b border-gray-200">
            <div className="text-xs font-bold">Export Options</div>
          </div>
          
          {error && (
            <div className="p-2 bg-red-50 border-b border-red-200">
              <div className="text-xs text-red-600">{error}</div>
            </div>
          )}
          
          <div className="py-1">
            <button
              onClick={() => handleExport('markdown')}
              disabled={loading === 'markdown'}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-xs disabled:opacity-50"
            >
              <FileText className="w-3 h-3" />
              <span>{loading === 'markdown' ? 'Exporting...' : 'Download as Markdown'}</span>
            </button>
            
            <button
              onClick={() => handleExport('pdf')}
              disabled={loading === 'pdf'}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-xs disabled:opacity-50"
            >
              <FileText className="w-3 h-3" />
              <span>{loading === 'pdf' ? 'Generating...' : 'Download as PDF'}</span>
            </button>
            
            <button
              onClick={() => handleExport('clipboard')}
              disabled={loading === 'clipboard'}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-xs disabled:opacity-50"
            >
              <Copy className="w-3 h-3" />
              <span>{loading === 'clipboard' ? 'Copying...' : 'Copy to Clipboard'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}