import { getServiceSupabase, getUserFromRequest } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';
import formidable from 'formidable';
import fs from 'fs';

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * API route: /api/upload/task-file
 *
 * Handles file uploads for task submissions.
 * Uploads file to Supabase Storage and returns the public URL.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get user first for rate limiting
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Apply rate limiting per user
  const identifier = getIdentifier(req, user.id);
  const rateLimitResult = await applyRateLimit(req, res, rateLimiters.upload, identifier);
  if (rateLimitResult) return rateLimitResult;

  try {

    // Parse the form data
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB max
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const day = fields.day?.[0] || fields.day;
    const file = files.file?.[0] || files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!day) {
      return res.status(400).json({ error: 'Day number is required' });
    }

    // SECURITY: Validate file type
    const allowedMimeTypes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      // Text
      'text/plain',
      'text/csv',
      // Other
      'application/zip',
    ];

    const allowedExtensions = [
      'jpg', 'jpeg', 'png', 'gif', 'webp',
      'pdf', 'doc', 'docx', 'xls', 'xlsx',
      'txt', 'csv', 'zip'
    ];

    const fileName = file.originalFilename || 'file';
    const fileExt = fileName.split('.').pop()?.toLowerCase();
    const fileMimeType = file.mimetype || 'application/octet-stream';

    // Check both extension and MIME type for security
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      return res.status(400).json({
        error: `File type .${fileExt} not allowed. Allowed types: ${allowedExtensions.join(', ')}`
      });
    }

    if (!allowedMimeTypes.includes(fileMimeType)) {
      return res.status(400).json({
        error: `File MIME type ${fileMimeType} not allowed. Please upload a valid file.`
      });
    }

    // Additional file size check (already set in formidable, but double-check)
    if (file.size > 50 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds 50MB limit' });
    }

    // Read file content
    const fileBuffer = fs.readFileSync(file.filepath);

    // Generate unique file path
    const timestamp = Date.now();
    const storagePath = `task-submissions/${user.id}/day-${day}/${timestamp}-${fileName}`;

    const supabase = getServiceSupabase();

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('user-uploads')
      .upload(storagePath, fileBuffer, {
        contentType: fileMimeType,
        upsert: false,
      });

    // Clean up temp file
    try {
      fs.unlinkSync(file.filepath);
    } catch (e) {
      // Ignore cleanup errors
    }

    if (uploadError) {
      logger.error('Upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file: ' + uploadError.message });
    }

    // Generate signed URL (private, expires in 7 days)
    // This ensures user submissions are not publicly accessible
    const { data: signedData, error: signError } = await supabase.storage
      .from('user-uploads')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 days expiry

    if (signError) {
      logger.error('Error creating signed URL:', signError);
      return res.status(500).json({ error: 'Failed to create file URL' });
    }

    return res.status(200).json({
      success: true,
      url: signedData.signedUrl,
      path: storagePath,
      fileName: fileName,
    });

  } catch (err) {
    logger.error('File upload error:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
}
