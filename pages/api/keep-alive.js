/**
 * DEPRECATED: This endpoint used an insecure query parameter token.
 * Use /api/cron/keep-alive instead (uses secure Authorization header).
 */
export default function handler(req, res) {
  return res.status(410).json({
    error: 'This endpoint has been deprecated. Use /api/cron/keep-alive instead.',
  });
}
