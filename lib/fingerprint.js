// lib/fingerprint.js - Device fingerprinting for 2-device limit
import { createAdminSupabase } from './supabase-server';

const MAX_DEVICES = 2;

/**
 * Generate a simple device fingerprint from request headers
 * In production, use FingerprintJS Pro for better accuracy
 */
export function generateFingerprint(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  // Create a simple hash from these values
  const raw = `${userAgent}|${acceptLanguage}|${ip}`;
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
    await supabase.from('device_fingerprints').insert({
      user_id: userId,
      fingerprint: fingerprint,
      user_agent: 'captured-on-registration'
    });
    
    return { allowed: true, devices: newDevices };
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
  
  return { success: true };
}
