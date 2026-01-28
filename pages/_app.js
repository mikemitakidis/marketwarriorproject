import '../styles/template-content.css';
import Script from 'next/script';

/**
 * Custom App component with PromoteKit tracking integration.
 *
 * The PromoteKit script captures ?ref=[ID] from URLs and stores it in a cookie.
 * It also populates window.promotekit_referral for use in checkout.
 *
 * Replace PROMOTEKIT_PUBLIC_KEY with your actual PromoteKit public key.
 */
export default function App({ Component, pageProps }) {
  return (
    <>
      {/* PromoteKit Tracking Script - captures referral from ?ref= parameter */}
      <Script
        id="promotekit-tracking"
        strategy="afterInteractive"
        src="https://cdn.promotekit.com/promotekit.js"
        data-promotekit="146b8488-69a9-452f-8258-e4a6c06c9ada"
      />
      <Component {...pageProps} />
    </>
  );
}
