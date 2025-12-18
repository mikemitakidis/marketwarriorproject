import fs from 'fs';
import path from 'path';

/**
 * Login page.
 *
 * This page renders the provided `login.html` template which includes
 * its own JavaScript for handling authentication (login, register,
 * password reset, and Google OAuth). The template has full functionality
 * built-in, so we just need to serve it as-is.
 */
export async function getStaticProps() {
  const filePath = path.join(process.cwd(), 'templates', 'login.html');
  let html = fs.readFileSync(filePath, 'utf8');

  // Replace hardcoded Supabase credentials with environment variables
  // The template has hardcoded values that we need to replace
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Replace the hardcoded values in the template
  html = html.replace(
    /const SUPABASE_URL = '[^']*';/,
    `const SUPABASE_URL = '${supabaseUrl}';`
  );
  html = html.replace(
    /const SUPABASE_ANON_KEY = '[^']*';/,
    `const SUPABASE_ANON_KEY = '${supabaseAnonKey}';`
  );

  return { props: { html } };
}

export default function LoginPage({ html }) {
  // Just render the template - it has all the JavaScript functionality built in
  return (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  );
}
