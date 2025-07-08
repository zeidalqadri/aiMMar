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
      const content = exportService.generatePDFContent(session)
      
      // Add title
      doc.setFontSize(20)
      doc.text(session.context.title, 20, 30)
      
      // Add metadata
      doc.setFontSize(12)
      doc.text(`Goal: ${session.context.goal}`, 20, 45)
      doc.text(`Keywords: ${session.context.keywords}`, 20, 55)
      doc.text(`Model: ${session.context.selectedModel}`, 20, 65)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 75)
      
      // Add content
      doc.setFontSize(14)
      const lines = doc.splitTextToSize(content, 170)
      doc.text(lines, 20, 90)
      
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