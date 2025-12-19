import { getServiceSupabase, getUserFromRequest } from '../../../lib/serverAuth';
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

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

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

    // Read file content
    const fileBuffer = fs.readFileSync(file.filepath);
    const fileName = file.originalFilename || 'file';
    const fileExt = fileName.split('.').pop();

    // Generate unique file path
    const timestamp = Date.now();
    const storagePath = `task-submissions/${user.id}/day-${day}/${timestamp}-${fileName}`;

    const supabase = getServiceSupabase();

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('user-uploads')
      .upload(storagePath, fileBuffer, {
        contentType: file.mimetype || 'application/octet-stream',
        upsert: false,
      });

    // Clean up temp file
    try {
      fs.unlinkSync(file.filepath);
    } catch (e) {
      // Ignore cleanup errors
    }

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file: ' + uploadError.message });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('user-uploads')
      .getPublicUrl(storagePath);

    return res.status(200).json({
      success: true,
      url: urlData.publicUrl,
      path: storagePath,
      fileName: fileName,
    });

  } catch (err) {
    console.error('File upload error:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
}
