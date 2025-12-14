// lib/api-middleware.js - API helpers and auth middleware
import { createServerSupabase, createAdminSupabase } from './supabase-server';

// Standard JSON response helper
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Error response helper
export function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

// Extract bearer token from request
export function getAuthToken(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

// Get authenticated user from request
export async function getUser(request) {
  const token = getAuthToken(request);
  if (!token) return null;
  
  try {
    const supabase = createServerSupabase(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

// Check if user has paid access
export async function hasUserPaidAccess(userId) {
  try {
    const supabase = createAdminSupabase();
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_paid, access_expires_at')
      .eq('id', userId)
      .single();
    
    if (!profile?.is_paid) return false;
    
    // Check expiration if set
    if (profile.access_expires_at) {
      const expiresAt = new Date(profile.access_expires_at);
      if (expiresAt < new Date()) return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking paid access:', error);
    return false;
  }
}

// Check if user is admin
export async function isUserAdmin(userId) {
  try {
    const supabase = createAdminSupabase();
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
    
    return profile?.is_admin === true;
  } catch (error) {
    return false;
  }
}

// Require authentication middleware
export async function requireAuth(request) {
  const user = await getUser(request);
  if (!user) {
    return { user: null, error: errorResponse('Unauthorized', 401) };
  }
  return { user, error: null };
}

// Require paid access middleware
export async function requirePaidAccess(request) {
  const { user, error } = await requireAuth(request);
  if (error) return { user: null, error };
  
  const hasPaid = await hasUserPaidAccess(user.id);
  if (!hasPaid) {
    return { user: null, error: errorResponse('Payment required', 403) };
  }
  
  return { user, error: null };
}

// Require admin access middleware
export async function requireAdmin(request) {
  const { user, error } = await requireAuth(request);
  if (error) return { user: null, error };
  
  const isAdmin = await isUserAdmin(user.id);
  if (!isAdmin) {
    return { user: null, error: errorResponse('Admin access required', 403) };
  }
  
  return { user, error: null };
}

// Log user activity
export async function logActivity(userId, action, details = {}) {
  try {
    const supabase = createAdminSupabase();
    await supabase.from('activity_log').insert({
      user_id: userId,
      action,
      details,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

// Export for compatibility
export { hasUserPaidAccess as checkPaidAccess };
