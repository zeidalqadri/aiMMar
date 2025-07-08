"use client"

import React, { useState, useEffect } from 'react'
import { History, Save, RotateCcw, ChevronDown } from 'lucide-react'
import type { ChatVersion, NoteSession, ModelOption } from '../types'
import { versioningService } from '../services/versioningService'
import { modelService } from '../services/modelService'

interface HeaderVersionControlProps {
  session: NoteSession
  onSessionUpdate: (session: NoteSession) => void
  onVersionRestore: (version: ChatVersion) => void
  onModelSwitch: (newModel: string) => void
}

export const HeaderVersionControl: React.FC<HeaderVersionControlProps> = ({
  session,
  onSessionUpdate,
  onVersionRestore,
  onModelSwitch
}) => {
  const [versions, setVersions] = useState<ChatVersion[]>([])
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([])
  const [selectedModel, setSelectedModel] = useState(session.context.selectedModel)
  const [showVersionDropdown, setShowVersionDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadVersions()
    loadModels()
  }, [session.id])

  const loadVersions = async () => {
    try {
      const fetchedVersions = await versioningService.getVersions(session.id)
      setVersions(fetchedVersions)
    } catch (err) {
      console.log('Session not yet synced to backend, using local versions')
      if (session.versions && session.versions.length > 0) {
        setVersions(session.versions)
      }
    }
  }

  const loadModels = async () => {
    try {
      const models = await modelService.fetchFreeModels()
      setAvailableModels(models)
    } catch (err) {
      console.error('Error loading models:', err)
    }
  }

  const handleCreateCheckpoint = async () => {
    setLoading(true)
    try {
      await storageService.saveSession(session)
      const newVersion = await versioningService.createCheckpoint(
        session.id,
        `Manual checkpoint - ${new Date().toLocaleTimeString()}`,
        false
      )
      setVersions([...versions, newVersion])
      onSessionUpdate({ ...session, current_version: newVersion.version_number })
    } catch (err) {
      console.error('Error creating checkpoint:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreVersion = async (version: ChatVersion) => {
    try {
      await versioningService.restoreVersion(session.id, version.id)
      onVersionRestore(version)
      await loadVersions()
      setShowVersionDropdown(false)
    } catch (err) {
      console.error('Error restoring version:', err)
    }
  }

  const handleModelSwitch = async () => {
    if (selectedModel === session.context.selectedModel) return
    
    try {
      await versioningService.switchModel(session.id, selectedModel, true)
      onModelSwitch(selectedModel)
      await loadVersions()
      setShowModelDropdown(false)
    } catch (err) {
      console.error('Error switching model:', err)
    }
  }

  const getCurrentModelName = () => {
    const model = availableModels.find(m => m.id === session.context.selectedModel)
    return model ? model.name.split(' ')[0] : session.context.selectedModel.split('/').pop()?.replace(':free', '') || 'Unknown'
  }

  return (
    <div className="flex items-center space-x-4">
      {/* Version Control */}
      <div className="relative">
        <button
          onClick={() => setShowVersionDropdown(!showVersionDropdown)}
          className="flex items-center space-x-1 px-3 py-1 border border-black text-xs font-medium hover:bg-gray-50"
        >
          <History className="w-3 h-3" />
          <span>v{session.current_version || 1}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        
        {showVersionDropdown && (
          <div className="absolute top-full left-0 mt-1 bg-white border-2 border-black shadow-lg z-50 min-w-[250px]">
            <div className="p-2 border-b border-gray-200">
              <div className="text-xs font-bold">Versions</div>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {versions.map(version => (
                <div
                  key={version.id}
                  className={`p-2 hover:bg-gray-50 cursor-pointer text-xs ${
                    version.version_number === session.current_version ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleRestoreVersion(version)}
                >
                  <div className="font-medium">
                    {versioningService.formatVersionName(version)}
                  </div>
                  <div className="text-gray-500 mt-1">
                    {new Date(version.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Current Model */}
      <div className="relative">
        <button
          onClick={() => setShowModelDropdown(!showModelDropdown)}
          className="flex items-center space-x-1 px-3 py-1 border border-black text-xs font-medium hover:bg-gray-50"
        >
          <span>{getCurrentModelName()}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        
        {showModelDropdown && (
          <div className="absolute top-full left-0 mt-1 bg-white border-2 border-black shadow-lg z-50 min-w-[200px]">
            <div className="p-2 border-b border-gray-200">
              <div className="text-xs font-bold">Switch Model</div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {availableModels.map(model => (
                <div
                  key={model.id}
                  className={`p-2 hover:bg-gray-50 cursor-pointer text-xs ${
                    model.id === selectedModel ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    setSelectedModel(model.id)
                    if (model.id !== session.context.selectedModel) {
                      handleModelSwitch()
                    } else {
                      setShowModelDropdown(false)
                    }
                  }}
                >
                  <div className="font-medium">{model.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Checkpoint */}
      <button
        onClick={handleCreateCheckpoint}
        disabled={loading}
        className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        <Save className="w-3 h-3" />
        <span>{loading ? 'Saving...' : 'Checkpoint'}</span>
      </button>
    </div>
  )
}