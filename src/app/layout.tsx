import './globals.css';
import CookieBanner from '@/components/CookieBanner';

export const metadata = {
  title: 'MarketWarrior',
  description: 'MarketWarrior Challenge',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
