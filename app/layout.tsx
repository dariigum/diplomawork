import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'JobFlow - Find Your Dream Job',
  description: 'Discover thousands of job opportunities. Search, filter, and apply to your perfect role.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import { I18nProvider } from '@/lib/i18n/provider'
import { ChatSocketRoot } from '@/components/chat/chat-socket-root'
import { AuthProvider } from '@/components/auth/auth-provider'
import { FaviconLoadingIndicator } from '@/components/favicon-loading-indicator'
import { Suspense } from 'react'

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en'
  const session = await getSession()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <I18nProvider initialLocale={locale}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider initialUser={session?.user ?? null}>
              <ChatSocketRoot>
                <Suspense fallback={null}>
                  <FaviconLoadingIndicator />
                </Suspense>
                {children}
                <Analytics />
              </ChatSocketRoot>
            </AuthProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
