import fs from 'fs';
import path from 'path';

export async function getStaticProps() {
  const filePath = path.join(process.cwd(), 'templates', 'privacy.html');
  const html = fs.readFileSync(filePath, 'utf8');
  return { props: { html } };
}

export default function PrivacyPage({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}