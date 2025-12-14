// lib/fingerprint.js - Device fingerprinting for 2-device limit
import { getServiceClient } from './supabase-server';

const MAX_DEVICES = 2;

/**
 * Generate a device fingerprint from request headers
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
  
  // Extract stable parts from user agent
  const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)/i);
  const osMatch = userAgent.match(/(Windows|Mac|Linux|Android|iOS|iPhone|iPad)/i);
  const browser = browserMatch ? browserMatch[0] : 'unknown';
  const os = osMatch ? osMatch[0] : 'unknown';
  
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
 * 
 * NOTE: This feature requires device_ids column in user_profiles.
 * If the column doesn't exist, this will allow all devices.
 */
export async function checkDeviceLimit(userId, fingerprint) {
  const supabase = getServiceClient();
  
  try {
    // Try to get device_ids - this column may not exist
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('device_ids')
      .eq('user_id', userId)
      .single();

    // If error or no device_ids column, allow access (feature not enabled)
    if (error || !profile || profile.device_ids === undefined) {
      // Device limiting not enabled - allow all
      return { allowed: true };
    }

    const devices = profile.device_ids || [];

    // Check if this device is already registered
    if (devices.includes(fingerprint)) {
      return { allowed: true, devices };
    }

    // Check device limit
    if (devices.length >= MAX_DEVICES) {
      return {
        allowed: false,
        message: `You have reached the maximum of ${MAX_DEVICES} devices. Please contact support to reset your devices.`,
        devices
      };
    }

    // Add new device
    const newDevices = [...devices, fingerprint];
    await supabase
      .from('user_profiles')
      .update({ device_ids: newDevices })
      .eq('user_id', userId);

    return { allowed: true, devices: newDevices, newDevice: true };
  } catch (error) {
    // On any error, allow access (fail open)
    console.error('Device check error:', error);
    return { allowed: true };
  }
}

/**
 * Reset all devices for a user
 */
export async function resetDevices(userId) {
  const supabase = getServiceClient();
  
  try {
    await supabase
      .from('user_profiles')
      .update({ device_ids: [] })
      .eq('user_id', userId);
      
    return { success: true };
  } catch (error) {
    console.error('Reset devices error:', error);
    return { success: false, error: error.message };
  }
}
