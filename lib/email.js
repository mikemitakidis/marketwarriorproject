// Email service using Resend
// Note: RESEND_API_KEY must be set in environment variables

async function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured');
    return null;
  }
  const { Resend } = await import('resend');
  return new Resend(process.env.RESEND_API_KEY);
}

const fromEmail = process.env.FROM_EMAIL || 'Market Warrior <onboarding@resend.dev>';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://marketwarrior.club';

// Generic send email function
export async function sendEmail({ to, subject, html }) {
  const resend = await getResendClient();
  if (!resend) {
    console.log('Email skipped (no API key):', subject);
    return { success: false, error: 'No API key' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html
    });

    if (error) {
      console.error('Email error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Email exception:', err);
    return { success: false, error: err.message };
  }
}

export async function sendWelcomeEmail(to, name) {
  return sendEmail({
    to,
    subject: '🎉 Welcome to Market Warrior!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0;">Welcome to Market Warrior!</h1>
        </div>
        <div style="padding: 32px; background: #f8fafc;">
          <p style="font-size: 18px; color: #1e3a5f;">Hey ${name || 'Trader'}!</p>
          <p style="color: #64748b; line-height: 1.7;">
            Congratulations on taking the first step toward becoming a better trader! 
            Your 30-day journey starts now.
          </p>
          <div style="background: white; padding: 24px; border-radius: 8px; margin: 24px 0;">
            <h3 style="color: #1e3a5f; margin-top: 0;">What's Next?</h3>
            <p style="color: #64748b;">
              Day 1 is now unlocked! Each day brings new lessons, quizzes, and practical tasks 
              to build your trading skills step by step.
            </p>
          </div>
          <a href="${appUrl}/dashboard" 
             style="display: inline-block; padding: 14px 28px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Start Day 1 →
          </a>
        </div>
      </div>
    `
  });
}

export async function sendDayUnlockEmail(to, name, dayNumber) {
  return sendEmail({
    to,
    subject: `🔓 Day ${dayNumber} is now unlocked!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0;">Day ${dayNumber} Unlocked! 🎯</h1>
        </div>
        <div style="padding: 32px; background: #f8fafc;">
          <p style="font-size: 18px; color: #1e3a5f;">Hey ${name || 'Trader'}!</p>
          <p style="color: #64748b; line-height: 1.7;">
            Great progress! Day ${dayNumber} of your Market Warrior journey is now available.
          </p>
          <a href="${appUrl}/day/${dayNumber}" 
             style="display: inline-block; padding: 14px 28px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Continue to Day ${dayNumber} →
          </a>
        </div>
      </div>
    `
  });
}

export async function sendCompletionEmail(to, name) {
  return sendEmail({
    to,
    subject: '🏆 Congratulations! You completed the 30-Day Challenge!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #1e3a5f; margin: 0;">🏆 Challenge Complete!</h1>
        </div>
        <div style="padding: 32px; background: #f8fafc;">
          <p style="font-size: 18px; color: #1e3a5f;">Congratulations, ${name || 'Trader'}!</p>
          <p style="color: #64748b; line-height: 1.7;">
            You've successfully completed the 30-Day Market Warrior Challenge!
          </p>
          <a href="${appUrl}/certificate" 
             style="display: inline-block; padding: 14px 28px; background: #ffc107; color: #1e3a5f; text-decoration: none; border-radius: 8px; font-weight: bold;">
            View Your Certificate →
          </a>
        </div>
      </div>
    `
  });
}

export async function sendReminderEmail(to, name, lastDay) {
  return sendEmail({
    to,
    subject: '⏰ Don\'t lose your momentum!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0;">We Miss You! 👋</h1>
        </div>
        <div style="padding: 32px; background: #f8fafc;">
          <p style="font-size: 18px; color: #1e3a5f;">Hey ${name || 'Trader'}!</p>
          <p style="color: #64748b; line-height: 1.7;">
            We noticed you haven't logged in for a while. You're on Day ${lastDay} - don't let your progress go to waste!
          </p>
          <a href="${appUrl}/dashboard" 
             style="display: inline-block; padding: 14px 28px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Continue Your Journey →
          </a>
        </div>
      </div>
    `
  });
}
