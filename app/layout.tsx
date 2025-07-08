import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'aiAmmar - AI Note Taking',
  description: 'Intelligent note-taking with AI-powered living documents by aiAmmar',
  generator: 'aiAmmar',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-mono antialiased">{children}</body>
    </html>
  )
}