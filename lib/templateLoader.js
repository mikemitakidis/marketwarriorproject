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
  // Remove ALL <script> blocks (case-insensitive, handles nested/encoded variants)
  let cleaned = html;
  // Remove standard script tags
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script\s*>/gi, '');
  // Remove orphaned opening script tags
  cleaned = cleaned.replace(/<script\b[^>]*>/gi, '');
  // Remove event handler attributes (onclick, onerror, onload, etc.)
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  return cleaned;
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
  // SECURITY: Prevent path traversal attacks
  const templatesDir = path.resolve(process.cwd(), 'templates');
  const resolved = path.resolve(templatesDir, templateName);
  if (!resolved.startsWith(templatesDir + path.sep) && resolved !== templatesDir) {
    throw new Error('Invalid template path');
  }

  if (!fs.existsSync(resolved)) {
    throw new Error('Template not found');
  }
  const raw = fs.readFileSync(resolved, 'utf8');
  return rewriteLinks(normalizeAssets(stripScripts(raw)));
}

module.exports = { loadTemplate, stripScripts, rewriteLinks, normalizeAssets };
