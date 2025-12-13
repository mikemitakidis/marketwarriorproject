'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function WelcomePage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile?.is_paid) {
      router.push('/checkout');
      return;
    }

    if (profile?.agreed_to_terms) {
      router.push('/dashboard');
      return;
    }

    setUser(user);
    setProfile(profile);
    setLoading(false);
  }

  async function handleStartChallenge() {
    if (!acceptTerms || !acceptPrivacy) {
      alert('Please accept both Terms of Service and Privacy Policy');
      return;
    }

    setSubmitting(true);

    try {
      const now = new Date().toISOString();
      const accessExpires = new Date();
      accessExpires.setDate(accessExpires.getDate() + 120);

      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          agreed_to_terms: true,
          challenge_start_date: now,
          access_expires_at: accessExpires.toISOString()
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Initialize Day 1 progress
      const { error: progressError } = await supabase
        .from('challenge_progress')
        .upsert({
          user_id: user.id,
          day_number: 1,
          unlocked_at: now
        }, { onConflict: 'user_id,day_number' });

      if (progressError) throw progressError;

      router.push('/dashboard');
    } catch (err) {
      console.error('Start challenge error:', err);
      alert('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', padding: '40px 24px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '48px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉</div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e3a5f', marginBottom: '8px' }}>
              Welcome to Market Warrior!
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.125rem' }}>
              {profile?.full_name ? `Hello ${profile.full_name}, y` : 'Y'}our journey begins here.
            </p>
          </div>

          {/* Challenge Rules */}
          <div style={{ background: '#f0f9ff', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0369a1', marginBottom: '16px' }}>
              📋 Challenge Rules
            </h2>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#0c4a6e', lineHeight: 2 }}>
              <li>Complete each day's lesson, quiz, and task</li>
              <li>Pass quizzes with 60% or higher</li>
              <li>New days unlock 24 hours after completing the previous day</li>
              <li>You have 120 days to complete the challenge</li>
              <li>Earn your certificate after completing all 30 days</li>
            </ul>
          </div>

          {/* Terms Checkboxes */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                style={{ marginTop: '4px', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ color: '#374151' }}>
                I have read and agree to the{' '}
                <Link href="/terms" target="_blank" style={{ color: '#667eea', textDecoration: 'underline' }}>
                  Terms of Service
                </Link>
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
                style={{ marginTop: '4px', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ color: '#374151' }}>
                I have read and agree to the{' '}
                <Link href="/privacy" target="_blank" style={{ color: '#667eea', textDecoration: 'underline' }}>
                  Privacy Policy
                </Link>
              </span>
            </label>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartChallenge}
            disabled={!acceptTerms || !acceptPrivacy || submitting}
            style={{
              width: '100%',
              padding: '16px',
              background: (!acceptTerms || !acceptPrivacy || submitting) 
                ? '#9ca3af' 
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.125rem',
              fontWeight: 700,
              cursor: (!acceptTerms || !acceptPrivacy || submitting) ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Starting...' : '🚀 Start Your 30-Day Challenge'}
          </button>
        </div>
      </div>
    </div>
  );
}
