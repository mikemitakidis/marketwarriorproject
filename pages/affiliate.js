import fs from 'fs';
import path from 'path';
import { getServiceSupabase } from '../lib/serverAuth';
import AnnouncementBanner from '../components/AnnouncementBanner';

/**
 * Public Affiliate Programme page.
 *
 * Displays the 20% commission tier information for public affiliates.
 * Open to everyone - no authentication required.
 */
export async function getServerSideProps() {
  const filePath = path.join(process.cwd(), 'templates', 'affiliate-public.html');
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
  html = html.replace(/<span class="logo-text">Market Warrior<\/span>/g, `<span class="logo-text">${siteName}</span>`);

  return { props: { html } };
}

export default function AffiliatePage({ html }) {
  return (
    <>
      <AnnouncementBanner type="public" />
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
