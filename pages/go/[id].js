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

  const baseUrl = etoroAffiliateUrl || defaultEtoroUrl;

  // Handle different redirect types
  if (id === 'etoro') {
    // Main eToro redirect
    destination = baseUrl;
  } else if (id === 'etoro-signup') {
    // Signup redirect
    destination = `${baseUrl}/register`;
  } else if (id === 'etoro-copytrader') {
    // CopyTrader main page redirect
    destination = `${baseUrl}/copytrader`;
  } else if (id.startsWith('etoro-trader-')) {
    // Specific trader profile: etoro-trader-username
    const username = id.replace('etoro-trader-', '');
    destination = `${baseUrl}/people/${username}`;
  } else if (id.startsWith('etoro-')) {
    // Asset-specific redirect: etoro-BTC, etoro-AAPL, etc.
    const symbol = id.replace('etoro-', '').toUpperCase();
    destination = `${baseUrl}/markets/${symbol.toLowerCase()}`;
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
