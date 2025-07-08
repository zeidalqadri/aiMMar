"use client"

import React, { useState } from 'react'
import type { NoteContext } from '../types'

interface ContextSetupProps {
  onComplete: (context: NoteContext) => void
  onBack: () => void
}

export const ContextSetup: React.FC<ContextSetupProps> = ({ onComplete, onBack }) => {
  const [context, setContext] = useState<NoteContext>({
    title: '',
    goal: '',
    keywords: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!context.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (context.title.length > 100) {
      newErrors.title = 'Title must be under 100 characters'
    }
    
    if (!context.goal.trim()) {
      newErrors.goal = 'Goal is required'
    } else if (context.goal.length > 500) {
      newErrors.goal = 'Goal must be under 500 characters'
    }
    
    if (context.keywords.length > 200) {
      newErrors.keywords = 'Keywords must be under 200 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    
    try {
      // Add small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500))
      onComplete(context)
    } catch (error) {
      console.error('Error creating session:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof NoteContext, value: string) => {
    setContext(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="h-screen flex flex-col bg-white text-black">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-6xl font-black tracking-tighter mb-4">iAmmr</h1>
            <div className="border-b-2 border-dashed border-black mb-4"></div>
            <p className="text-sm">Setup your note session</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Title Field */}
            <div>
              <label className="block text-sm font-bold mb-2">
                SESSION TITLE
              </label>
              <input
                type="text"
                value={context.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full p-3 border-2 border-black focus:outline-none focus:ring-0 bg-white"
                placeholder="e.g., Biology Study Session"
                disabled={isSubmitting}
              />
              {errors.title && (
                <div className="mt-1 text-sm border-l-4 border-black pl-2">
                  {errors.title}
                </div>
              )}
            </div>

            {/* Goal Field */}
            <div>
              <label className="block text-sm font-bold mb-2">
                SESSION GOAL
              </label>
              <textarea
                value={context.goal}
                onChange={(e) => handleInputChange('goal', e.target.value)}
                className="w-full p-3 border-2 border-black focus:outline-none focus:ring-0 bg-white resize-none"
                rows={4}
                placeholder="e.g., Create comprehensive study notes for upcoming exam"
                disabled={isSubmitting}
              />
              {errors.goal && (
                <div className="mt-1 text-sm border-l-4 border-black pl-2">
                  {errors.goal}
                </div>
              )}
            </div>

            {/* Keywords Field */}
            <div>
              <label className="block text-sm font-bold mb-2">
                KEYWORDS <span className="font-normal text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                value={context.keywords}
                onChange={(e) => handleInputChange('keywords', e.target.value)}
                className="w-full p-3 border-2 border-black focus:outline-none focus:ring-0 bg-white"
                placeholder="e.g., photosynthesis, cell structure, DNA"
                disabled={isSubmitting}
              />
              {errors.keywords && (
                <div className="mt-1 text-sm border-l-4 border-black pl-2">
                  {errors.keywords}
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="border-b border-dashed border-black"></div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 py-3 px-4 border-2 border-black text-sm font-bold bg-white text-black hover:bg-black hover:text-white focus:outline-none focus:ring-0 transition-colors duration-200"
                disabled={isSubmitting}
              >
                ← BACK TO HISTORY
              </button>
              
              <button
                type="submit"
                className="flex-1 py-3 px-4 border-2 border-black text-sm font-bold bg-black text-white hover:bg-white hover:text-black focus:outline-none focus:ring-0 transition-colors duration-200 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'CREATING SESSION...' : 'START SESSION →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}