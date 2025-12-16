import fs from 'fs';
import path from 'path';

/**
 * Landing page.
 *
 * This page renders the canonical index template provided in
 * `templates/index.html`.  The content is loaded at build time using
 * getStaticProps and injected into the DOM via
 * `dangerouslySetInnerHTML` to preserve the exact markup and
 * structure defined by the designer.  Any interactive functionality
 * (e.g. referral preservation, journal CTA) should be implemented
 * within the template using inline scripts or replaced with React
 * handlers as the project evolves.
 */
export async function getStaticProps() {
  const filePath = path.join(process.cwd(), 'templates', 'index.html');
  const html = fs.readFileSync(filePath, 'utf8');
  return { props: { html } };
}

export default function IndexPage({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}