import { getServiceSupabase, getUserFromRequest, verifyAdminAccess } from '../../../../lib/serverAuth';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false, // Disable default body parser for file uploads
  },
};

/**
 * Admin API: Upload logo or favicon
 *
 * POST /api/admin/settings/upload
 * Body: multipart/form-data with 'file' and 'type' (logo or favicon)
 *
 * Uploads file to Supabase Storage and returns public URL
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // SECURITY: Verify admin authorization
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const isAdmin = await verifyAdminAccess(user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Parse multipart form data
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB max
      keepExtensions: true,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const file = files.file?.[0] || files.file;
    const type = fields.type?.[0] || fields.type || 'logo';

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type. Allowed: PNG, JPG, WEBP, ICO'
      });
    }

    // Read file
    const fileBuffer = fs.readFileSync(file.filepath);
    const fileName = `${type}-${Date.now()}${path.extname(file.originalFilename || file.newFilename)}`;
    const filePath = `branding/${fileName}`;

    // Upload to Supabase Storage
    const supabase = getServiceSupabase();

    // Check if bucket exists, create if not
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'assets');

    if (!bucketExists) {
      await supabase.storage.createBucket('assets', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: allowedMimeTypes,
      });
    }

    // Upload file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, fileBuffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file: ' + uploadError.message });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('assets')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update settings based on type
    const settingKey = type === 'favicon' ? 'favicon_url' : 'logo_url';
    await supabase.from('app_settings').upsert({
      key: settingKey,
      value: publicUrl,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

    // Clean up temp file
    try {
      fs.unlinkSync(file.filepath);
    } catch (e) {
      // Ignore cleanup errors
    }

    return res.status(200).json({
      success: true,
      url: publicUrl,
      type,
      message: `${type === 'favicon' ? 'Favicon' : 'Logo'} uploaded successfully`,
    });

  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
}
