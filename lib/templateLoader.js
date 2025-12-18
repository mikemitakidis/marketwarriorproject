const fs = require('fs');
const path = require('path');

const ROUTE_REWRITES = [
  [/\bindex\.html\b/gi, '/'],
  [/\blogin\.html\b/gi, '/login'],
  [/\bsignup\.html\b/gi, '/signup'],
  [/\bregister\.html\b/gi, '/signup'],
  [/\bwelcome\.html\b/gi, '/welcome'],
  [/\bdashboard\.html\b/gi, '/dashboard'],
  [/\bprivacy\.html\b/gi, '/privacy'],
  [/\bterms\.html\b/gi, '/terms'],
];

function stripScripts(html) {
  // Remove ALL <script> blocks to avoid leaking keys and because scripts inside dangerouslySetInnerHTML won't execute reliably.
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

function normalizeAssets(html) {
  return html
    .replace(/logo\.(jpg|jpeg)/gi, 'logo.png')
    .replace(/\.\//g, '/');
}

function rewriteLinks(html) {
  let out = html;
  for (const [re, to] of ROUTE_REWRITES) out = out.replace(re, to);
  // Common purchase CTA
  out = out.replace(/Purchase\s+Challenge[^\"']*(\$[0-9]+\.[0-9]{2})?/gi, (m) => m);
  return out;
}

function loadTemplate(templateName) {
  const p = path.join(process.cwd(), 'templates', templateName);
  if (!fs.existsSync(p)) {
    throw new Error(`Template not found: ${templateName} at ${p}`);
  }
  const raw = fs.readFileSync(p, 'utf8');
  return rewriteLinks(normalizeAssets(stripScripts(raw)));
}

module.exports = { loadTemplate, stripScripts, rewriteLinks, normalizeAssets };
