import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Πριν Πατήσεις',
  description: 'Έλεγξε αν ένα μήνυμα είναι ύποπτο πριν πατήσεις link ή δώσεις στοιχεία.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="el" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  )
}
