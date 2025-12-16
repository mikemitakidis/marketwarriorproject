import fs from 'fs';
import path from 'path';

/**
 * Welcome / onboarding page.
 *
 * Renders the provided `welcome.html` template exactly.  This page
 * introduces users to the challenge and prompts them to accept terms
 * and continue to signup or login.  Dynamic behaviours (e.g.
 * storing terms acceptance, redirecting after login) should be
 * implemented by enhancing this template with React components or
 * replacing inline scripts.
 */
export async function getStaticProps() {
  const filePath = path.join(process.cwd(), 'templates', 'welcome.html');
  const html = fs.readFileSync(filePath, 'utf8');
  return { props: { html } };
}

export default function WelcomePage({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}