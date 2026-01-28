import '../styles/template-content.css';

/**
 * Custom App component.
 *
 * PromoteKit tracking script is loaded in _document.js <head> section.
 * The script captures ?ref=[ID] from URLs and stores it in a browser cookie.
 * It also populates window.promotekit_referral for use in checkout.
 */
export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
