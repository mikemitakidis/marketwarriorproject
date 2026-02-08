import { getServiceSupabase, getUserFromRequest, getGateStatus } from '../../../lib/serverAuth';
import logger from '../../../lib/logger';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import { checkForumBan } from '../../../lib/forumSpamCheck';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * API route: /api/community/upload
 *
 * POST: Upload an image for a forum post
 *   Returns: { success: true, url: string }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const identifier = getIdentifier(req, user.id);
  const rateLimitResult = await applyRateLimit(req, res, rateLimiters.upload, identifier);
  if (rateLimitResult) return rateLimitResult;

  const gate = await getGateStatus(user.id);
  if (!gate.hasPaid) {
    return res.status(403).json({ error: 'Payment required' });
  }

  const supabase = getServiceSupabase();

  // Check forum ban
  const banStatus = await checkForumBan(supabase, user.id);
  if (banStatus.banned) {
    return res.status(403).json({ error: banStatus.reason });
  }

  try {
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const file = files.image?.[0] || files.image;

    if (!file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const fileName = file.originalFilename || 'image';
    const fileExt = fileName.split('.').pop()?.toLowerCase();
    const fileMimeType = file.mimetype || 'application/octet-stream';

    // Validate extension
    if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
      return res.status(400).json({
        error: `File type .${fileExt} not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      });
    }

    // Validate MIME type
    if (!ALLOWED_IMAGE_TYPES.includes(fileMimeType)) {
      return res.status(400).json({
        error: 'Only image files (JPG, PNG, GIF, WebP) are allowed.',
      });
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ error: 'Image must be under 5MB' });
    }

    // Read file
    const fileBuffer = fs.readFileSync(file.filepath);

    // Sanitize filename
    const sanitizedFileName = fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .substring(0, 100);

    const timestamp = Date.now();
    const storagePath = `forum/${user.id}/${timestamp}-${sanitizedFileName}`;

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('forum-uploads')
      .upload(storagePath, fileBuffer, {
        contentType: fileMimeType,
        upsert: false,
      });

    // Clean up temp file
    try {
      fs.unlinkSync(file.filepath);
    } catch (e) { /* ignore */ }

    if (uploadError) {
      logger.error('Forum upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    // Get public URL (bucket is public)
    const { data: urlData } = supabase.storage
      .from('forum-uploads')
      .getPublicUrl(storagePath);

    return res.status(200).json({
      success: true,
      url: urlData.publicUrl,
      path: storagePath,
    });
  } catch (err) {
    if (err.code === 1009 || err.message?.includes('maxFileSize')) {
      return res.status(400).json({ error: 'Image must be under 5MB' });
    }
    logger.error('Forum upload error:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
}
