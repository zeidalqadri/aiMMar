"use client"

import React, { useState, useRef, useEffect } from 'react'

interface ResizablePanelsProps {
  leftPanel: React.ReactNode
  rightPanel: React.ReactNode
  defaultLeftWidth?: number
  minLeftWidth?: number
  maxLeftWidth?: number
}

export const ResizablePanels: React.FC<ResizablePanelsProps> = ({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 50,
  minLeftWidth = 20,
  maxLeftWidth = 80
}) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

    if (newLeftWidth >= minLeftWidth && newLeftWidth <= maxLeftWidth) {
      setLeftWidth(newLeftWidth)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging])

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden">
      {/* Left Panel */}
      <div 
        style={{ width: `${leftWidth}%` }}
        className="flex flex-col overflow-hidden"
      >
        {leftPanel}
      </div>

      {/* Resizer */}
      <div
        className={`w-1 bg-black cursor-col-resize hover:bg-gray-600 active:bg-gray-800 transition-colors ${
          isDragging ? 'bg-gray-600' : ''
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="h-full w-full relative">
          <div className="absolute inset-y-0 left-[-2px] w-1 hover:bg-gray-400 transition-colors" />
        </div>
      </div>

      {/* Right Panel */}
      <div 
        style={{ width: `${100 - leftWidth}%` }}
        className="flex flex-col overflow-hidden"
      >
        {rightPanel}
      </div>
    </div>
  )
}