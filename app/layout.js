import './globals.css'

export const metadata = {
  title: 'Market Warrior - 30-Day Trading Challenge',
  description: 'Master trading in 30 days',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
