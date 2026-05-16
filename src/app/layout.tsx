import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Scrub-A-Dub CRM',
  description: 'Scrub-A-Dub Home Services CRM',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ScrubDub CRM',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="theme-color" content="#1e3a5f" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script dangerouslySetInnerHTML={{
          __html: `if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')`
        }} />
      </head>
      <body className="h-full">{children}</body>
    </html>
  )
}
