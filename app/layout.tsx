import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/providers/query-provider'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Brikii — Outils métiers immobilier',
  description: 'La plateforme modulaire des professionnels de l\'immobilier',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--brikii-bg)',
                color: 'var(--brikii-text)',
                border: 'var(--brikii-border-width) solid var(--brikii-border)',
                borderRadius: 'var(--brikii-radius-card)',
                fontSize: '14px',
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  )
}
