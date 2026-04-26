import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/hooks/useAuth'

export const metadata: Metadata = {
  title: 'T&D Clinic CRM',
  description: 'Система управления T&D Aesthetic Medicine',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
