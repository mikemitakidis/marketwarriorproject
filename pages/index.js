import fs from 'fs';
import path from 'path';
import { getServiceSupabase } from '../lib/serverAuth';
import AnnouncementBanner from '../components/AnnouncementBanner';

/**
 * Landing page.
 *
 * Renders the index template with dynamic price, logo, and site name
 * fetched from app_settings table. Updates automatically when admin
 * changes settings.
 */
export async function getServerSideProps() {
  const filePath = path.join(process.cwd(), 'templates', 'index.html');
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
  const price = settings.challenge_price || '39.99';
  const logoUrl = settings.logo_url || '/logo.png';
  const siteName = settings.site_name || 'Market Warrior';
  const faviconUrl = settings.favicon_url || logoUrl || '/logo.png';

  // Replace dynamic values in HTML
  // Replace all price occurrences
  html = html.replace(/\$39\.99/g, `$${price}`);
  html = html.replace(/Start Your Journey - \$[\d.]+/g, `Start Your Journey - $${price}`);

  // Replace logo URL
  html = html.replace(/src="\/logo\.png"/g, `src="${logoUrl}"`);
  html = html.replace(/href="\/logo\.png"/g, `href="${faviconUrl}"`);

  // Replace site name in title and headers
  html = html.replace(/Market Warrior - 30-Day Trading Challenge/g, `${siteName} - 30-Day Trading Challenge`);
  html = html.replace(/<div class="logo-text">Market Warrior<\/div>/g, `<div class="logo-text">${siteName}</div>`);

  return { props: { html } };
}

export default function IndexPage({ html }) {
  return (
    <>
      <AnnouncementBanner type="public" />
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
