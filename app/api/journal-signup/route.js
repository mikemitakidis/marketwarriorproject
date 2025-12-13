import { NextResponse } from 'next/server';
import { jsonResponse, errorResponse } from '@/lib/api-middleware';
import { createAdminSupabase } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, name, source } = body;

    if (!email) {
      return errorResponse('Email is required', 400);
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse('Invalid email format', 400);
    }

    const supabase = createAdminSupabase();

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('journal_leads')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return jsonResponse({ 
        success: true, 
        message: 'You\'re already signed up! Check your email for the journal template.' 
      });
    }

    // Insert new lead
    const { error } = await supabase
      .from('journal_leads')
      .insert({
        email: email.toLowerCase(),
        name: name || null,
        source: source || 'website'
      });

    if (error) throw error;

    // Send welcome email with journal template
    try {
      await sendEmail({
        to: email,
        subject: '🎁 Your Free Trading Journal Template',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0;">📊 Your Trading Journal</h1>
            </div>
            <div style="padding: 32px; background: #f8fafc;">
              <p style="font-size: 18px; color: #1e3a5f;">Hey${name ? ' ' + name : ''}!</p>
              <p style="color: #64748b; line-height: 1.7;">
                Thank you for signing up! Here's your free trading journal template to help you track and improve your trading.
              </p>
              <div style="background: white; padding: 24px; border-radius: 8px; margin: 24px 0;">
                <h3 style="color: #1e3a5f; margin-top: 0;">What's included:</h3>
                <ul style="color: #64748b; line-height: 2;">
                  <li>Trade entry/exit tracking</li>
                  <li>P&L calculations</li>
                  <li>Emotion logging</li>
                  <li>Strategy notes</li>
                  <li>Performance analytics</li>
                </ul>
              </div>
              <p style="color: #64748b;">
                Ready to take your trading to the next level? Join our 30-Day Market Warrior Challenge!
              </p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://marketwarrior.club'}" 
                 style="display: inline-block; padding: 14px 28px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 16px;">
                Learn More →
              </a>
            </div>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Email send error:', emailError);
      // Don't fail the signup if email fails
    }

    return jsonResponse({ 
      success: true, 
      message: 'Success! Check your email for your free trading journal template.' 
    });
  } catch (error) {
    console.error('Journal signup error:', error);
    return errorResponse('Signup failed. Please try again.', 500);
  }
}
