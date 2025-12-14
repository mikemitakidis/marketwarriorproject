import './globals.css';

export const metadata = {
  title: 'Market Warrior - 30-Day Trading Challenge',
  description: 'Master trading fundamentals in 30 days with our comprehensive course. Learn stocks, forex, crypto, technical analysis, and risk management.',
  keywords: 'trading course, stock market, forex, cryptocurrency, technical analysis, day trading',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <div id="toast-container" className="toast-container" />
      </body>
    </html>
  );
}
