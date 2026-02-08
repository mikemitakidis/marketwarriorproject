import Script from 'next/script';
import { useEffect } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import '../styles/template-content.css';

/**
 * Custom App component.
 *
 * PromoteKit tracking script is loaded with afterInteractive strategy
 * to ensure the URL (including query params like ?ref=ID) is fully resolved
 * before the script executes.
 */
export default function App({ Component, pageProps }) {
  // Fallback: Re-check for referral after hydration completes
  useEffect(() => {
    // Give PromoteKit script time to initialize after load
    const checkReferral = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const refParam = urlParams.get('ref');

      // If we have a ref param but PromoteKit hasn't captured it yet
      if (refParam && !window.promotekit_referral) {
        // Store in cookie manually as fallback (domain-wide)
        document.cookie = `promotekit_referral=${refParam}; domain=.marketwarrior.club; path=/; max-age=31536000; SameSite=Lax`;
        window.promotekit_referral = refParam;
      }
    };

    // Check after a short delay to let PromoteKit initialize
    const timer = setTimeout(checkReferral, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* PromoteKit Tracking Script - afterInteractive ensures URL is ready */}
      <Script
        src="https://cdn.promotekit.com/promotekit.js"
        data-promotekit="146b8488-69a9-452f-8258-e4a6c06c9ada"
        data-domain=".marketwarrior.club"
        strategy="afterInteractive"
        onLoad={() => {}}
      />
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </>
  );
}
