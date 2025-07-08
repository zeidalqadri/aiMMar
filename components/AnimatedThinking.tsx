"use client"

import React, { useState, useEffect } from 'react'
import { Brain, Lightbulb, Search, PenTool, CheckCircle } from 'lucide-react'

interface AnimatedThinkingProps {
  isVisible: boolean
  modelName?: string
}

interface ThinkingStage {
  id: string
  icon: React.ReactNode
  label: string
  thoughts: string[]
  duration: number
}

export const AnimatedThinking: React.FC<AnimatedThinkingProps> = ({ 
  isVisible, 
  modelName = 'AI' 
}) => {
  const [currentStage, setCurrentStage] = useState(0)
  const [currentThought, setCurrentThought] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const thinkingStages: ThinkingStage[] = [
    {
      id: 'analyzing',
      icon: <Search className="w-4 h-4" />,
      label: 'Analyzing your input',
      thoughts: [
        'Reading and understanding your message...',
        'Identifying key concepts and context...',
        'Considering the conversation history...',
        'Determining the best approach to respond...'
      ],
      duration: 2000
    },
    {
      id: 'reasoning',
      icon: <Brain className="w-4 h-4" />,
      label: 'Processing and reasoning',
      thoughts: [
        'Connecting ideas and concepts...',
        'Applying knowledge to your specific situation...',
        'Considering multiple perspectives...',
        'Evaluating different response strategies...',
        'Synthesizing information from various sources...'
      ],
      duration: 3000
    },
    {
      id: 'ideating',
      icon: <Lightbulb className="w-4 h-4" />,
      label: 'Generating ideas',
      thoughts: [
        'Brainstorming relevant solutions...',
        'Exploring creative approaches...',
        'Considering practical implications...',
        'Weighing pros and cons of different options...'
      ],
      duration: 2500
    },
    {
      id: 'composing',
      icon: <PenTool className="w-4 h-4" />,
      label: 'Crafting response',
      thoughts: [
        'Organizing thoughts into coherent structure...',
        'Selecting the most helpful information...',
        'Ensuring clarity and accuracy...',
        'Adding relevant examples and context...',
        'Finalizing the response...'
      ],
      duration: 2000
    }
  ]

  // Typewriter effect for individual thoughts
  useEffect(() => {
    if (!isVisible) {
      setCurrentStage(0)
      setCurrentThought(0)
      setDisplayedText('')
      return
    }

    const stage = thinkingStages[currentStage]
    if (!stage) return

    const thought = stage.thoughts[currentThought]
    if (!thought) return

    setIsTyping(true)
    setDisplayedText('')

    let charIndex = 0
    const typeInterval = setInterval(() => {
      if (charIndex < thought.length) {
        setDisplayedText(thought.slice(0, charIndex + 1))
        charIndex++
      } else {
        clearInterval(typeInterval)
        setIsTyping(false)
        
        // Move to next thought after a brief pause
        setTimeout(() => {
          if (currentThought < stage.thoughts.length - 1) {
            setCurrentThought(prev => prev + 1)
          } else {
            // Move to next stage
            setTimeout(() => {
              if (currentStage < thinkingStages.length - 1) {
                setCurrentStage(prev => prev + 1)
                setCurrentThought(0)
              }
            }, 800)
          }
        }, 1200)
      }
    }, 30) // Typing speed

    return () => clearInterval(typeInterval)
  }, [isVisible, currentStage, currentThought])

  // Reset when thinking stops
  useEffect(() => {
    if (!isVisible) {
      const resetTimer = setTimeout(() => {
        setCurrentStage(0)
        setCurrentThought(0)
        setDisplayedText('')
        setIsTyping(false)
      }, 500)
      return () => clearTimeout(resetTimer)
    }
  }, [isVisible])

  if (!isVisible) return null

  const stage = thinkingStages[currentStage]
  const progress = ((currentStage + 1) / thinkingStages.length) * 100

  return (
    <div className="text-left animate-fade-in">
      <div className="inline-block p-4 border-2 border-black bg-gradient-to-br from-blue-50 to-purple-50 text-black max-w-[80%] min-w-[300px]">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-3">
          <div className="animate-pulse">
            {stage?.icon}
          </div>
          <div className="text-xs font-bold">{modelName.toUpperCase()}</div>
          <div className="text-xs text-gray-600">• {stage?.label}</div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-1 mb-3">
          <div 
            className="bg-blue-600 h-1 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Current Thought */}
        <div className="text-sm mb-3 min-h-[20px]">
          <span className="text-gray-700">{displayedText}</span>
          {isTyping && (
            <span className="animate-pulse text-blue-600 font-bold">|</span>
          )}
        </div>

        {/* Stage Indicators */}
        <div className="flex space-x-2">
          {thinkingStages.map((stageItem, index) => (
            <div
              key={stageItem.id}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentStage
                  ? 'bg-blue-600 animate-pulse'
                  : index < currentStage
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Completion indicator */}
        {currentStage >= thinkingStages.length - 1 && 
         currentThought >= thinkingStages[currentStage]?.thoughts.length - 1 && (
          <div className="flex items-center space-x-2 mt-2 text-green-600">
            <CheckCircle className="w-3 h-3" />
            <span className="text-xs font-medium">Response ready!</span>
          </div>
        )}
      </div>
    </div>
  )
}