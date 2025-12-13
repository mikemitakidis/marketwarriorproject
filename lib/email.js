// lib/email.js - Email service using Resend
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = process.env.FROM_EMAIL || 'Market Warrior <noreply@marketwarrior.club>';

export async function sendWelcomeEmail(to, name) {
  if (!resend) {
    console.log('Email service not configured - skipping welcome email');
    return;
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: '🎉 Welcome to the 30-Day Market Warrior Challenge!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3a5f, #0f172a); padding: 40px; text-align: center; color: white;">
            <h1 style="margin: 0;">📈 Market Warrior</h1>
          </div>
          <div style="padding: 40px; background: #f8fafc;">
            <h2>Welcome, ${name}! 🎉</h2>
            <p>You've just taken the first step towards becoming a confident trader. Your 30-day challenge starts now!</p>
            <p><strong>What's Next:</strong></p>
            <ul>
              <li>Day 1 is now unlocked and ready for you</li>
              <li>Complete each day's lesson, quiz, and task</li>
              <li>New days unlock as you progress</li>
              <li>Earn your certificate after completing all 30 days</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Start Day 1 →</a>
            </div>
            <p>Good luck, Warrior! 💪</p>
          </div>
        </div>
      `
    });
    console.log(`Welcome email sent to ${to}`);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
}

export async function sendDayUnlockEmail(to, name, dayNumber) {
  if (!resend) return;

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: `🔓 Day ${dayNumber} is Now Unlocked!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3a5f, #0f172a); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0;">📈 Market Warrior</h1>
          </div>
          <div style="padding: 40px; background: #f8fafc;">
            <h2>Day ${dayNumber} is Ready! 🎯</h2>
            <p>Great progress, ${name}! You've unlocked Day ${dayNumber} of your trading challenge.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/day/${dayNumber}" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Start Day ${dayNumber} →</a>
            </div>
          </div>
        </div>
      `
    });
  } catch (error) {
    console.error('Failed to send unlock email:', error);
  }
}

export async function sendCompletionEmail(to, name) {
  if (!resend) return;

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: '🏆 Congratulations! You Completed the 30-Day Challenge!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 40px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 3rem;">🏆</h1>
            <h1 style="margin: 10px 0 0;">CONGRATULATIONS!</h1>
          </div>
          <div style="padding: 40px; background: #f8fafc;">
            <h2>You Did It, ${name}! 🎉</h2>
            <p>You've successfully completed all 30 days of the Market Warrior Challenge!</p>
            <p>This is a huge accomplishment. You now have the foundation to trade with confidence and discipline.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/certificate" style="background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Download Your Certificate →</a>
            </div>
            <p>Keep learning, keep growing, and trade like a warrior! 💪</p>
          </div>
        </div>
      `
    });
  } catch (error) {
    console.error('Failed to send completion email:', error);
  }
}

export async function sendReminderEmail(to, name, lastDay) {
  if (!resend) return;

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: `📢 Continue Your Trading Journey - Day ${lastDay + 1} Awaits!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3a5f, #0f172a); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0;">📈 Market Warrior</h1>
          </div>
          <div style="padding: 40px; background: #f8fafc;">
            <h2>We Miss You, ${name}! 👋</h2>
            <p>You were making great progress on your 30-day trading challenge. You completed Day ${lastDay} - don't stop now!</p>
            <p>Day ${lastDay + 1} is waiting for you.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Continue Your Challenge →</a>
            </div>
          </div>
        </div>
      `
    });
  } catch (error) {
    console.error('Failed to send reminder email:', error);
  }
}
