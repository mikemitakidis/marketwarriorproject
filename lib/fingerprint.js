// lib/fingerprint.js - Device fingerprinting for 2-device limit
import { createAdminSupabase } from './supabase-server';

const MAX_DEVICES = 2;

/**
 * Generate a device fingerprint from request headers
 * 
 * IMPORTANT: We do NOT include IP address because it changes:
 * - When switching between WiFi and mobile data
 * - When using VPNs
 * - When ISP reassigns IP
 * - With Safari/iOS privacy features
 * 
 * Instead, we prefer a client-generated device ID stored in localStorage
 */
export function generateFingerprint(request) {
  // PREFERRED: Client-generated stable device ID (from localStorage)
  const clientDeviceId = request.headers.get('x-device-id');
  if (clientDeviceId && clientDeviceId.length > 8) {
    return `dev_${clientDeviceId}`;
  }
  
  // FALLBACK: Generate from stable browser properties (no IP!)
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  
  // Extract stable parts from user agent (browser + OS, not version numbers)
  const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)/i);
  const osMatch = userAgent.match(/(Windows|Mac|Linux|Android|iOS|iPhone|iPad)/i);
  const browser = browserMatch ? browserMatch[0] : 'unknown';
  const os = osMatch ? osMatch[0] : 'unknown';
  
  // Create fingerprint from stable values only (NO IP ADDRESS!)
  const raw = `${browser}|${os}|${acceptLanguage}|${acceptEncoding}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

/**
 * Check and register device for user
 * Returns { allowed: boolean, message?: string, devices?: string[] }
 */
export async function checkDeviceLimit(userId, fingerprint) {
  const supabase = createAdminSupabase();
  
  try {
    // Get user's current devices
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('device_ids')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return { allowed: true }; // Fail open for now
    }
    
    const devices = profile?.device_ids || [];
    
    // Check if this device is already registered
    if (devices.includes(fingerprint)) {
      // Update last seen
      await supabase.from('device_fingerprints')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('fingerprint', fingerprint);
      return { allowed: true, devices };
    }
    
    // Check if user has reached device limit
    if (devices.length >= MAX_DEVICES) {
      return {
        allowed: false,
        message: `You have reached the maximum of ${MAX_DEVICES} devices. Please contact support to reset your devices.`,
        devices
      };
    }
    
    // Register new device
    const newDevices = [...devices, fingerprint];
    await supabase
      .from('user_profiles')
      .update({ device_ids: newDevices })
      .eq('id', userId);
    
    // Log device registration
    await supabase.from('device_fingerprints').upsert({
      user_id: userId,
      fingerprint: fingerprint,
      last_seen_at: new Date().toISOString()
    }, { onConflict: 'user_id,fingerprint' });
    
    return { allowed: true, devices: newDevices, newDevice: true };
  } catch (err) {
    console.error('Device check error:', err);
    return { allowed: true }; // Fail open
  }
}

/**
 * Reset user's devices (admin function)
 */
export async function resetUserDevices(userId) {
  const supabase = createAdminSupabase();
  
  await supabase
    .from('user_profiles')
    .update({ device_ids: [] })
    .eq('id', userId);
  
  // Also clear device fingerprints table
  await supabase
    .from('device_fingerprints')
    .delete()
    .eq('user_id', userId);
  
  return { success: true };
}
