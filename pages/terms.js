import fs from 'fs';
import path from 'path';

/**
 * Terms and conditions page.
 *
 * Uses the `terms.html` template from `templates`.  This page
 * outlines the challenge rules and must be accepted by the user
 * exactly once.  Terms acceptance should be persisted in
 * `user_profiles.terms_accepted_at` and enforced server‑side.
 */
export async function getStaticProps() {
  const filePath = path.join(process.cwd(), 'templates', 'terms.html');
  const html = fs.readFileSync(filePath, 'utf8');
  return { props: { html } };
}

export default function TermsPage({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}