import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'iAmmr - AI Note Taking',
  description: 'Intelligent note-taking with AI-powered living documents',
  generator: 'iAmmr',
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