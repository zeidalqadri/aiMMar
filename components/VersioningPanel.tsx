"use client"

import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, History, Save, RotateCcw, Trash2, AlertCircle } from 'lucide-react'
import type { ChatVersion, NoteSession, ModelOption, VersioningState } from '../types'
import { versioningService } from '../services/versioningService'
import { modelService } from '../services/modelService'

interface VersioningPanelProps {
  session: NoteSession
  onSessionUpdate: (session: NoteSession) => void
  onVersionRestore: (version: ChatVersion) => void
  onModelSwitch: (newModel: string) => void
}

export const VersioningPanel: React.FC<VersioningPanelProps> = ({
  session,
  onSessionUpdate,
  onVersionRestore,
  onModelSwitch
}) => {
  const [state, setState] = useState<VersioningState>({
    showVersions: false,
    selectedVersion: null,
    isRestoring: false,
    isSwitchingModel: false
  })
  
  const [versions, setVersions] = useState<ChatVersion[]>([])
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([])
  const [selectedModel, setSelectedModel] = useState(session.context.selectedModel)
  const [checkpointName, setCheckpointName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Load versions and models on mount
  useEffect(() => {
    loadVersions()
    loadModels()
  }, [session.id])

  const loadVersions = async () => {
    try {
      const fetchedVersions = await versioningService.getVersions(session.id)
      setVersions(fetchedVersions)
    } catch (err) {
      setError('Failed to load versions')
      console.error('Error loading versions:', err)
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
    if (!checkpointName.trim()) {
      setError('Please enter a checkpoint name')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const newVersion = await versioningService.createCheckpoint(
        session.id,
        checkpointName,
        false
      )
      
      setVersions([...versions, newVersion])
      setCheckpointName('')
      
      // Update session current version
      const updatedSession = {
        ...session,
        current_version: newVersion.version_number
      }
      onSessionUpdate(updatedSession)
      
    } catch (err) {
      setError('Failed to create checkpoint')
      console.error('Error creating checkpoint:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreVersion = async (version: ChatVersion) => {
    setState(prev => ({ ...prev, isRestoring: true }))
    setError(null)

    try {
      await versioningService.restoreVersion(session.id, version.id)
      
      // Update local state
      onVersionRestore(version)
      
      // Reload versions to get the new backup version
      await loadVersions()
      
    } catch (err) {
      setError('Failed to restore version')
      console.error('Error restoring version:', err)
    } finally {
      setState(prev => ({ ...prev, isRestoring: false }))
    }
  }

  const handleModelSwitch = async () => {
    if (selectedModel === session.context.selectedModel) {
      setError('Model is already selected')
      return
    }

    setState(prev => ({ ...prev, isSwitchingModel: true }))
    setError(null)

    try {
      await versioningService.switchModel(session.id, selectedModel, true)
      
      // Update session context
      const updatedSession = {
        ...session,
        context: {
          ...session.context,
          selectedModel: selectedModel
        }
      }
      onSessionUpdate(updatedSession)
      onModelSwitch(selectedModel)
      
      // Reload versions to get the new checkpoint
      await loadVersions()
      
    } catch (err) {
      setError('Failed to switch model')
      console.error('Error switching model:', err)
    } finally {
      setState(prev => ({ ...prev, isSwitchingModel: false }))
    }
  }

  const handleDeleteVersion = async (versionId: string) => {
    if (versions.length <= 1) {
      setError('Cannot delete the only version')
      return
    }

    try {
      await versioningService.deleteVersion(session.id, versionId)
      setVersions(versions.filter(v => v.id !== versionId))
    } catch (err) {
      setError('Failed to delete version')
      console.error('Error deleting version:', err)
    }
  }

  const toggleVersionsPanel = () => {
    setState(prev => ({ ...prev, showVersions: !prev.showVersions }))
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Version Control</h3>
          <span className="text-sm text-gray-500">
            v{session.current_version} • {versions.length} versions
          </span>
        </div>
        
        <button
          onClick={toggleVersionsPanel}
          className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
        >
          <span>Versions</span>
          {state.showVersions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Panel */}
      <div className="p-4 space-y-4">
        {/* Model Selection */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Current Model:</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {availableModels.map(model => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleModelSwitch}
            disabled={state.isSwitchingModel || selectedModel === session.context.selectedModel}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{state.isSwitchingModel ? 'Switching...' : 'Switch'}</span>
          </button>
        </div>

        {/* Create Checkpoint */}
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Checkpoint name (optional)"
            value={checkpointName}
            onChange={(e) => setCheckpointName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleCreateCheckpoint}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Creating...' : 'Create Checkpoint'}</span>
          </button>
        </div>

        {/* Versions List */}
        {state.showVersions && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Versions History</h4>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {versions.map(version => (
                <div
                  key={version.id}
                  className={`p-3 border rounded-md ${
                    version.version_number === session.current_version
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-800">
                          {versioningService.formatVersionName(version)}
                        </span>
                        {version.version_number === session.current_version && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {versioningService.getVersionSummary(version)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(version.timestamp).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {version.version_number !== session.current_version && (
                        <button
                          onClick={() => handleRestoreVersion(version)}
                          disabled={state.isRestoring}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50 text-sm"
                        >
                          {state.isRestoring ? 'Restoring...' : 'Restore'}
                        </button>
                      )}
                      
                      {versions.length > 1 && version.version_number !== session.current_version && (
                        <button
                          onClick={() => handleDeleteVersion(version.id)}
                          className="px-2 py-1 text-red-600 hover:bg-red-50 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}