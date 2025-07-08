"use client"

import React, { useState } from 'react'
import { Settings, Brain, Eye, EyeOff, ChevronDown } from 'lucide-react'

interface ThinkingSettingsProps {
  onSettingsChange: (settings: ThinkingSettings) => void
}

export interface ThinkingSettings {
  showThinking: boolean
  thinkingMode: 'simple' | 'detailed' | 'chain-of-thought'
  animationSpeed: 'slow' | 'normal' | 'fast'
}

export const ThinkingSettings: React.FC<ThinkingSettingsProps> = ({ onSettingsChange }) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const [settings, setSettings] = useState<ThinkingSettings>({
    showThinking: true,
    thinkingMode: 'chain-of-thought',
    animationSpeed: 'normal'
  })

  const updateSettings = (newSettings: Partial<ThinkingSettings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)
    onSettingsChange(updatedSettings)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-1 px-3 py-1 border border-black text-xs font-medium hover:bg-gray-50"
      >
        <Brain className="w-3 h-3" />
        <span>Thinking</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      
      {showDropdown && (
        <div className="absolute top-full right-0 mt-1 bg-white border-2 border-black shadow-lg z-50 min-w-[250px]">
          <div className="p-3 border-b border-gray-200">
            <div className="text-xs font-bold">AI Thinking Display</div>
            <div className="text-xs text-gray-500 mt-1">
              Customize how AI thinking is shown
            </div>
          </div>
          
          <div className="p-3 space-y-3">
            {/* Toggle Thinking Display */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Show Thinking Process</label>
              <button
                onClick={() => updateSettings({ showThinking: !settings.showThinking })}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                  settings.showThinking
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {settings.showThinking ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>{settings.showThinking ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            {/* Thinking Mode */}
            {settings.showThinking && (
              <>
                <div>
                  <label className="text-xs font-medium block mb-1">Thinking Mode</label>
                  <div className="space-y-1">
                    {[
                      { value: 'simple', label: 'Simple', desc: 'Basic thinking indicator' },
                      { value: 'detailed', label: 'Detailed', desc: 'Step-by-step process' },
                      { value: 'chain-of-thought', label: 'Chain of Thought', desc: 'Full reasoning chain' }
                    ].map(mode => (
                      <button
                        key={mode.value}
                        onClick={() => updateSettings({ thinkingMode: mode.value as any })}
                        className={`w-full text-left p-2 rounded text-xs ${
                          settings.thinkingMode === mode.value
                            ? 'bg-blue-100 border border-blue-300'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="font-medium">{mode.label}</div>
                        <div className="text-gray-600">{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Animation Speed */}
                <div>
                  <label className="text-xs font-medium block mb-1">Animation Speed</label>
                  <div className="flex space-x-1">
                    {[
                      { value: 'slow', label: 'Slow' },
                      { value: 'normal', label: 'Normal' },
                      { value: 'fast', label: 'Fast' }
                    ].map(speed => (
                      <button
                        key={speed.value}
                        onClick={() => updateSettings({ animationSpeed: speed.value as any })}
                        className={`flex-1 px-2 py-1 rounded text-xs ${
                          settings.animationSpeed === speed.value
                            ? 'bg-purple-100 border border-purple-300'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        {speed.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="p-2 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-600">
              {settings.showThinking 
                ? `Showing ${settings.thinkingMode} thinking at ${settings.animationSpeed} speed`
                : 'AI thinking process is hidden'
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}