import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Market Warrior - 30-Day Trading Challenge',
  description: 'Transform from complete beginner to confident trader in 30 days.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/logo.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
