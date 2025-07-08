import type { NoteSession } from '../types'

export const exportService = {
  // Export as Markdown
  exportAsMarkdown: (session: NoteSession): void => {
    const content = exportService.generateMarkdownContent(session)
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `${session.context.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  // Export as PDF
  exportAsPDF: async (session: NoteSession): Promise<void> => {
    try {
      // Dynamic import to reduce bundle size
      const jsPDF = (await import('jspdf')).default
      
      const doc = new jsPDF()
      const pageHeight = doc.internal.pageSize.height
      const pageWidth = doc.internal.pageSize.width
      const margins = { top: 20, bottom: 20, left: 20, right: 20 }
      const contentWidth = pageWidth - margins.left - margins.right
      let currentY = margins.top
      
      // Helper function to add new page if needed
      const checkPageBreak = (additionalHeight: number = 0) => {
        if (currentY + additionalHeight > pageHeight - margins.bottom) {
          doc.addPage()
          currentY = margins.top
          return true
        }
        return false
      }
      
      // Helper function to add text with automatic pagination
      const addText = (text: string, fontSize: number, isBold: boolean = false, bottomMargin: number = 5) => {
        doc.setFontSize(fontSize)
        if (isBold) {
          doc.setFont(undefined, 'bold')
        } else {
          doc.setFont(undefined, 'normal')
        }
        
        const lines = doc.splitTextToSize(text, contentWidth)
        const lineHeight = fontSize * 0.5
        
        for (const line of lines) {
          checkPageBreak(lineHeight)
          doc.text(line, margins.left, currentY)
          currentY += lineHeight
        }
        currentY += bottomMargin
      }
      
      // Add title
      addText(session.context.title, 20, true, 10)
      
      // Add metadata
      addText(`Goal: ${session.context.goal}`, 12, false, 5)
      addText(`Keywords: ${session.context.keywords}`, 12, false, 5)
      addText(`Model: ${session.context.selectedModel}`, 12, false, 5)
      addText(`Generated: ${new Date().toLocaleString()}`, 12, false, 15)
      
      // Add separator line
      checkPageBreak(5)
      doc.setLineWidth(0.5)
      doc.line(margins.left, currentY, pageWidth - margins.right, currentY)
      currentY += 10
      
      // Add Living Document if exists
      if (session.livingDocument) {
        addText('LIVING DOCUMENT', 16, true, 10)
        
        // Clean and format the living document
        const cleanedDocument = session.livingDocument
          .replace(/[#*]/g, '') // Remove markdown formatting
          .replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
        
        addText(cleanedDocument, 11, false, 15)
        
        // Add separator
        checkPageBreak(5)
        doc.setLineWidth(0.5)
        doc.line(margins.left, currentY, pageWidth - margins.right, currentY)
        currentY += 10
      }
      
      // Add Chat History
      addText('CHAT HISTORY', 16, true, 10)
      
      session.chatHistory.forEach((entry, index) => {
        const role = entry.role === 'user' ? 'USER' : 'AI ASSISTANT'
        const messageNumber = index + 1
        
        // Add role header
        addText(`${role} (Message ${messageNumber}):`, 12, true, 5)
        
        // Add message content
        addText(entry.text, 11, false, 10)
        
        // Add small separator between messages
        if (index < session.chatHistory.length - 1) {
          currentY += 5
        }
      })
      
      // Add Version Information if available
      if (session.versions && session.versions.length > 0) {
        checkPageBreak(20)
        currentY += 10
        
        // Add separator
        doc.setLineWidth(0.5)
        doc.line(margins.left, currentY, pageWidth - margins.right, currentY)
        currentY += 10
        
        addText('VERSION INFORMATION', 16, true, 10)
        addText(`Current Version: ${session.current_version || 1}`, 12, false, 5)
        addText(`Total Versions: ${session.versions.length}`, 12, false, 10)
        
        addText('Version History:', 12, true, 5)
        session.versions.forEach(version => {
          const versionText = `• Version ${version.version_number}: ${version.checkpoint_name || 'Auto-checkpoint'} (${new Date(version.timestamp).toLocaleString()})`
          addText(versionText, 10, false, 3)
        })
      }
      
      // Save the PDF
      doc.save(`${session.context.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      throw new Error('Failed to export PDF. Please try again.')
    }
  },

  // Generate Markdown content
  generateMarkdownContent: (session: NoteSession): string => {
    let content = `# ${session.context.title}\n\n`
    
    // Metadata
    content += `**Goal:** ${session.context.goal}\n\n`
    content += `**Keywords:** ${session.context.keywords}\n\n`
    content += `**AI Model:** ${session.context.selectedModel}\n\n`
    content += `**Generated:** ${new Date().toLocaleString()}\n\n`
    content += `---\n\n`
    
    // Living Document
    if (session.livingDocument) {
      content += `## Living Document\n\n`
      content += `${session.livingDocument}\n\n`
      content += `---\n\n`
    }
    
    // Chat History
    content += `## Chat History\n\n`
    session.chatHistory.forEach((entry, index) => {
      const role = entry.role === 'user' ? 'User' : 'AI Assistant'
      content += `### ${role} (Message ${index + 1})\n\n`
      content += `${entry.text}\n\n`
    })
    
    // Version Information
    if (session.versions && session.versions.length > 0) {
      content += `---\n\n`
      content += `## Version History\n\n`
      content += `Current Version: ${session.current_version || 1}\n\n`
      content += `Total Versions: ${session.versions.length}\n\n`
      
      session.versions.forEach(version => {
        content += `- **Version ${version.version_number}**: ${version.checkpoint_name || 'Auto-checkpoint'} (${new Date(version.timestamp).toLocaleString()})\n`
      })
    }
    
    return content
  },

  // Generate PDF content (plain text)
  generatePDFContent: (session: NoteSession): string => {
    let content = ''
    
    // Living Document
    if (session.livingDocument) {
      content += 'LIVING DOCUMENT:\n\n'
      content += session.livingDocument.replace(/[#*]/g, '') + '\n\n'
      content += '---\n\n'
    }
    
    // Chat History
    content += 'CHAT HISTORY:\n\n'
    session.chatHistory.forEach((entry, index) => {
      const role = entry.role === 'user' ? 'USER' : 'AI'
      content += `${role} (${index + 1}):\n${entry.text}\n\n`
    })
    
    return content
  },

  // Copy to clipboard
  copyToClipboard: async (session: NoteSession): Promise<void> => {
    try {
      const content = exportService.generateMarkdownContent(session)
      await navigator.clipboard.writeText(content)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      throw new Error('Failed to copy to clipboard')
    }
  }
}