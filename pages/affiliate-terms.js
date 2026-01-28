import fs from 'fs';
import path from 'path';
import { getServiceSupabase } from '../lib/serverAuth';

/**
 * Affiliate Programme Terms & Conditions page.
 *
 * Public page displaying the full terms and conditions
 * for the MarketWarrior affiliate programme.
 */
export async function getServerSideProps() {
  const filePath = path.join(process.cwd(), 'templates', 'affiliate-terms.html');
  let html = fs.readFileSync(filePath, 'utf8');

  // Fetch settings from database
  const supabase = getServiceSupabase();
  const { data: settingsData } = await supabase
    .from('app_settings')
    .select('key, value');

  // Convert to object
  const settings = {};
  (settingsData || []).forEach(row => {
    settings[row.key] = row.value;
  });

  // Get values with defaults
  const logoUrl = settings.logo_url || '/logo.png';
  const siteName = settings.site_name || 'Market Warrior';
  const faviconUrl = settings.favicon_url || logoUrl || '/logo.png';

  // Replace dynamic values in HTML
  html = html.replace(/src="\/logo\.png"/g, `src="${logoUrl}"`);
  html = html.replace(/href="\/logo\.png"/g, `href="${faviconUrl}"`);
  html = html.replace(/>Market Warrior</g, `>${siteName}<`);

  return { props: { html } };
}

export default function AffiliateTermsPage({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
