import { Html, Head, Main, NextScript } from 'next/document';

/**
 * Custom Document for MarketWarrior.
 *
 * Note: PromoteKit tracking script is loaded in _app.js using Next.js Script
 * component with afterInteractive strategy for proper initialization timing.
 */
export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" type="image/png" href="/logo.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
