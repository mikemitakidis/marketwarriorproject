/**
 * Masked Affiliate Redirect System
 * /go/{id} -> redirects to affiliate URL
 *
 * Supports: etoro, etoro-{symbol}, etc.
 */

import { getServiceSupabase } from '../../lib/journalAuth';

export async function getServerSideProps({ params }) {
  const { id } = params;

  // Get affiliate base URL from app_settings
  const supabase = getServiceSupabase();
  const { data: settings } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['etoro_affiliate_url']);

  const etoroAffiliateUrl = settings?.find(s => s.key === 'etoro_affiliate_url')?.value;

  // Default eToro URL if not configured
  const defaultEtoroUrl = 'https://www.etoro.com';

  let destination = null;

  // Handle different redirect types
  if (id === 'etoro') {
    // Main eToro redirect
    destination = etoroAffiliateUrl || defaultEtoroUrl;
  } else if (id.startsWith('etoro-')) {
    // Asset-specific redirect: etoro-BTC, etoro-AAPL, etc.
    const symbol = id.replace('etoro-', '').toUpperCase();
    const baseUrl = etoroAffiliateUrl || defaultEtoroUrl;
    destination = `${baseUrl}/markets/${symbol.toLowerCase()}`;
  } else if (id === 'etoro-signup') {
    // Signup redirect
    const baseUrl = etoroAffiliateUrl || defaultEtoroUrl;
    destination = `${baseUrl}/register`;
  } else if (id === 'etoro-copytrader') {
    // CopyTrader redirect
    const baseUrl = etoroAffiliateUrl || defaultEtoroUrl;
    destination = `${baseUrl}/copytrader`;
  }

  if (destination) {
    return {
      redirect: {
        destination,
        permanent: false,
      },
    };
  }

  // If no valid redirect found, go to home
  return {
    redirect: {
      destination: '/',
      permanent: false,
    },
  };
}

export default function RedirectPage() {
  // This should never render due to getServerSideProps redirect
  return null;
}
