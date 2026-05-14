import type { Metadata, Viewport } from 'next'
import './globals.css'
import SwRegister from '@/components/SwRegister'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title: 'Πριν Πατήσεις',
  description: 'Έλεγξε αν ένα μήνυμα είναι ύποπτο πριν πατήσεις link ή δώσεις στοιχεία.',
  appleWebApp: {
    capable: true,
    title: 'Πριν Πατήσεις',
    statusBarStyle: 'default',
  },
  icons: { apple: '/favicon.ico' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="el" className="h-full">
      <body className="min-h-full">
        {children}
        <SwRegister />
        <Analytics />
      </body>
    </html>
  )
}
