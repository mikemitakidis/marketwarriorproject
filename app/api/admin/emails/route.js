import { NextResponse } from 'next/server';
import { getUser, jsonResponse, errorResponse, isUserAdmin } from '@/lib/api-middleware';
import { createAdminSupabase } from '@/lib/supabase-server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// GET - List campaigns and stats
export async function GET(request) {
  try {
    const user = await getUser(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const admin = await isUserAdmin(user.id);
    if (!admin) return errorResponse('Admin access required', 403);

    const supabase = createAdminSupabase();

    // Get audience stats
    const { data: users } = await supabase.from('user_profiles').select('id, is_paid');
    const { data: leads } = await supabase.from('journal_leads').select('id');

    const stats = {
      total_users: users?.length || 0,
      paid_users: users?.filter(u => u.is_paid).length || 0,
      leads: leads?.length || 0
    };

    // Get campaign history
    const { data: campaigns } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(50);

    return jsonResponse({ campaigns: campaigns || [], stats });
  } catch (error) {
    console.error('Email campaigns error:', error);
    return errorResponse('Failed to load campaigns', 500);
  }
}

// POST - Send campaign
export async function POST(request) {
  try {
    const user = await getUser(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const admin = await isUserAdmin(user.id);
    if (!admin) return errorResponse('Admin access required', 403);

    const body = await request.json();
    const { action, subject, content, audience, custom_emails } = body;

    if (action !== 'send') {
      return errorResponse('Invalid action', 400);
    }

    if (!subject || !content) {
      return errorResponse('Subject and content required', 400);
    }

    const supabase = createAdminSupabase();
    let recipients = [];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://marketwarrior.club';

    // Get recipients based on audience
    switch (audience) {
      case 'all_users': {
        const { data } = await supabase.from('user_profiles').select('email, full_name');
        recipients = data || [];
        break;
      }
      case 'paid_users': {
        const { data } = await supabase.from('user_profiles').select('email, full_name').eq('is_paid', true);
        recipients = data || [];
        break;
      }
      case 'unpaid_users': {
        const { data } = await supabase.from('user_profiles').select('email, full_name').eq('is_paid', false);
        recipients = data || [];
        break;
      }
      case 'leads': {
        const { data } = await supabase.from('journal_leads').select('email, name');
        recipients = (data || []).map(l => ({ email: l.email, full_name: l.name }));
        break;
      }
      case 'custom': {
        const emails = custom_emails?.split('\n').map(e => e.trim()).filter(e => e);
        recipients = emails?.map(e => ({ email: e, full_name: '' })) || [];
        break;
      }
      default:
        return errorResponse('Invalid audience', 400);
    }

    if (recipients.length === 0) {
      return errorResponse('No recipients found', 400);
    }

    // Send emails (batch)
    let sentCount = 0;
    let errors = [];

    // Process in batches of 50
    for (let i = 0; i < recipients.length; i += 50) {
      const batch = recipients.slice(i, i + 50);
      
      for (const recipient of batch) {
        try {
          // Replace variables in content
          let personalizedContent = content
            .replace(/{name}/g, recipient.full_name || 'Trader')
            .replace(/{email}/g, recipient.email)
            .replace(/{app_url}/g, appUrl)
            .replace(/{current_day}/g, '1')
            .replace(/{promo_code}/g, 'WARRIOR20')
            .replace(/{discount}/g, '20');

          let personalizedSubject = subject
            .replace(/{name}/g, recipient.full_name || 'Trader');

          await resend.emails.send({
            from: process.env.FROM_EMAIL || 'Market Warrior <noreply@marketwarrior.club>',
            to: recipient.email,
            subject: personalizedSubject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">📈 Market Warrior</h1>
                </div>
                <div style="padding: 32px; background: #ffffff;">
                  ${personalizedContent}
                </div>
                <div style="padding: 20px; background: #f8fafc; text-align: center; border-radius: 0 0 12px 12px;">
                  <p style="color: #6b7280; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Market Warrior. All rights reserved.
                  </p>
                </div>
              </div>
            `
          });

          sentCount++;
        } catch (emailError) {
          console.error(`Failed to send to ${recipient.email}:`, emailError);
          errors.push(recipient.email);
        }
      }

      // Small delay between batches to avoid rate limits
      if (i + 50 < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Record campaign
    await supabase.from('email_campaigns').insert({
      subject,
      content,
      audience,
      sent_count: sentCount,
      failed_count: errors.length,
      status: 'sent',
      sent_by: user.id,
      sent_at: new Date().toISOString()
    });

    return jsonResponse({ 
      success: true, 
      sent_count: sentCount,
      failed_count: errors.length 
    });
  } catch (error) {
    console.error('Send campaign error:', error);
    return errorResponse('Failed to send campaign', 500);
  }
}
