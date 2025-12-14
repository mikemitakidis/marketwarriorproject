import { jsonResponse, errorResponse } from '@/lib/api-middleware';
import { getServiceClient } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const { email, name } = await request.json();
    
    if (!email) return errorResponse('Email is required', 400);

    const supabase = getServiceClient();

    try {
      // Check if already subscribed
      const { data: existing } = await supabase
        .from('journal_leads')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (existing) {
        return jsonResponse({ success: true, message: 'You are already subscribed!' });
      }

      // Add new lead
      const { error } = await supabase.from('journal_leads').insert({
        email: email.toLowerCase(),
        name: name || null,
        subscribed_at: new Date().toISOString()
      });

      if (error) throw error;

      return jsonResponse({ success: true, message: 'Successfully subscribed!' });
    } catch (e) {
      // Table doesn't exist - just return success (don't break the signup flow)
      console.log('Journal leads table not configured');
      return jsonResponse({ success: true, message: 'Thanks for your interest!' });
    }
  } catch (error) {
    console.error('Journal signup error:', error);
    return errorResponse('Failed to subscribe', 500);
  }
}
