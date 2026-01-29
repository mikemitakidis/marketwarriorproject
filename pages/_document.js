import { Html, Head, Main, NextScript } from 'next/document';

/**
 * Custom Document for MarketWarrior.
 *
 * Places the PromoteKit tracking script in the <head> of every page.
 * This script captures ?ref=[ID] from URLs and stores it in a browser cookie.
 * It also populates window.promotekit_referral for use in checkout.
 */
export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* PromoteKit Tracking Script - must be in <head> for all pages */}
        {/* data-domain ensures cookie is set on root domain for www/non-www compatibility */}
        <script
          async
          src="https://cdn.promotekit.com/promotekit.js"
          data-promotekit="146b8488-69a9-452f-8258-e4a6c06c9ada"
          data-domain=".marketwarrior.club"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
