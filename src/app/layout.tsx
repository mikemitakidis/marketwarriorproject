import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Market Warrior - 30 Day Trading Challenge',
  description: 'Master trading fundamentals in 30 days with our comprehensive course',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        {children}
      </body>
    </html>
  )
}
