"use client"

import React, { useState, useEffect } from 'react'
import { Brain, Zap, Target, Layers, Sparkles } from 'lucide-react'

interface ChainOfThoughtProps {
  isVisible: boolean
  userMessage?: string
  modelName?: string
}

interface ThoughtNode {
  id: string
  type: 'analysis' | 'connection' | 'reasoning' | 'synthesis' | 'validation'
  content: string
  confidence: number
  connections?: string[]
}

export const ChainOfThought: React.FC<ChainOfThoughtProps> = ({ 
  isVisible, 
  userMessage = '',
  modelName = 'AI Assistant'
}) => {
  const [thoughts, setThoughts] = useState<ThoughtNode[]>([])
  const [currentThoughtIndex, setCurrentThoughtIndex] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  // Generate realistic chain of thoughts based on user message
  const generateThoughts = (message: string): ThoughtNode[] => {
    const baseThoughts: ThoughtNode[] = [
      {
        id: '1',
        type: 'analysis',
        content: `Parsing user input: "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}"`,
        confidence: 95,
      },
      {
        id: '2',
        type: 'analysis',
        content: 'Identifying key concepts and entities...',
        confidence: 88,
      },
      {
        id: '3',
        type: 'connection',
        content: 'Accessing relevant knowledge domains...',
        confidence: 92,
        connections: ['previous_context', 'domain_knowledge', 'user_patterns']
      },
      {
        id: '4',
        type: 'reasoning',
        content: 'Applying logical reasoning to user\'s specific situation...',
        confidence: 89,
      },
      {
        id: '5',
        type: 'connection',
        content: 'Cross-referencing with similar past interactions...',
        confidence: 84,
        connections: ['conversation_history', 'pattern_matching']
      },
      {
        id: '6',
        type: 'synthesis',
        content: 'Synthesizing information from multiple sources...',
        confidence: 91,
      },
      {
        id: '7',
        type: 'reasoning',
        content: 'Evaluating response quality and relevance...',
        confidence: 87,
      },
      {
        id: '8',
        type: 'validation',
        content: 'Checking for accuracy and helpfulness...',
        confidence: 94,
      },
      {
        id: '9',
        type: 'synthesis',
        content: 'Structuring final response for optimal clarity...',
        confidence: 96,
      }
    ]

    // Add some contextual thoughts based on message content
    if (message.toLowerCase().includes('help') || message.includes('?')) {
      baseThoughts.splice(3, 0, {
        id: '3a',
        type: 'analysis',
        content: 'Detected help request - prioritizing actionable guidance...',
        confidence: 93,
      })
    }

    if (message.toLowerCase().includes('explain') || message.toLowerCase().includes('how')) {
      baseThoughts.splice(4, 0, {
        id: '4a',
        type: 'reasoning',
        content: 'Preparing step-by-step explanation approach...',
        confidence: 90,
      })
    }

    return baseThoughts
  }

  // Animation logic
  useEffect(() => {
    if (!isVisible) {
      setThoughts([])
      setCurrentThoughtIndex(0)
      setIsProcessing(false)
      return
    }

    setIsProcessing(true)
    const generatedThoughts = generateThoughts(userMessage)
    setThoughts(generatedThoughts)
    setCurrentThoughtIndex(0)

    // Animate through thoughts
    const thoughtInterval = setInterval(() => {
      setCurrentThoughtIndex(prev => {
        if (prev < generatedThoughts.length - 1) {
          return prev + 1
        } else {
          clearInterval(thoughtInterval)
          setTimeout(() => setIsProcessing(false), 1000)
          return prev
        }
      })
    }, 800)

    return () => clearInterval(thoughtInterval)
  }, [isVisible, userMessage])

  const getThoughtIcon = (type: ThoughtNode['type']) => {
    switch (type) {
      case 'analysis': return <Target className="w-3 h-3" />
      case 'connection': return <Layers className="w-3 h-3" />
      case 'reasoning': return <Brain className="w-3 h-3" />
      case 'synthesis': return <Sparkles className="w-3 h-3" />
      case 'validation': return <Zap className="w-3 h-3" />
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600'
    if (confidence >= 80) return 'text-yellow-600'
    return 'text-orange-600'
  }

  if (!isVisible) return null

  return (
    <div className="text-left">
      <div className="inline-block p-4 border-2 border-black bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 text-black max-w-[85%] min-w-[350px]">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-3">
          <Brain className="w-4 h-4 animate-pulse text-purple-600" />
          <div className="text-xs font-bold">{modelName.toUpperCase()}</div>
          <div className="text-xs text-gray-600">• Chain of Thought</div>
        </div>

        {/* Thought Stream */}
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {thoughts.slice(0, currentThoughtIndex + 1).map((thought, index) => (
            <div
              key={thought.id}
              className={`flex items-start space-x-2 p-2 rounded transition-all duration-300 ${
                index === currentThoughtIndex 
                  ? 'bg-white shadow-sm border border-purple-200 animate-pulse' 
                  : 'bg-transparent'
              }`}
            >
              <div className={`mt-0.5 ${index === currentThoughtIndex ? 'animate-bounce' : ''}`}>
                {getThoughtIcon(thought.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-700 leading-relaxed">
                  {thought.content}
                </div>
                
                {thought.connections && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {thought.connections.map(conn => (
                      <span 
                        key={conn}
                        className="px-1 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                      >
                        {conn.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className={`text-xs font-mono ${getConfidenceColor(thought.confidence)}`}>
                {thought.confidence}%
              </div>
            </div>
          ))}
        </div>

        {/* Progress Indicator */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">
              Processing: {currentThoughtIndex + 1}/{thoughts.length}
            </span>
            {isProcessing ? (
              <span className="text-purple-600 animate-pulse">● Thinking</span>
            ) : (
              <span className="text-green-600">✓ Complete</span>
            )}
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-1 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${((currentThoughtIndex + 1) / thoughts.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}