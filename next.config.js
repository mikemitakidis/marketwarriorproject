/**
 * Next.js configuration
 *
 * This project is configured to use static file serving for pages in
 * `public` as well as API routes defined under `pages/api`.  See
 * README.md for details on environment variables required to run
 * server‑side logic such as Supabase and Stripe integration.
 */

module.exports = {
  reactStrictMode: true,
  // By default next/image optimises images. Disable to allow local
  // images in static HTML pages.
  images: {
    unoptimized: true,
  },
};