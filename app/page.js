'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [leadMessage, setLeadMessage] = useState('');

  useEffect(() => {
    // Capture affiliate code from URL
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('affiliate_code', ref);
    }
  }, []);

  async function handleLeadSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setLeadMessage('');

    try {
      const res = await fetch('/api/journal-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, source: 'landing_page' })
      });

      const data = await res.json();
      setLeadMessage(data.message || 'Thanks for signing up!');
      if (data.success) {
        setEmail('');
        setName('');
      }
    } catch (err) {
      setLeadMessage('Something went wrong. Please try again.');
    }

    setSubmitting(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Hero Section */}
      <header style={{ 
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
        color: 'white',
        padding: '80px 24px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '24px', lineHeight: 1.2 }}>
            📈 Become a Market Warrior in 30 Days
          </h1>
          <p style={{ fontSize: '1.25rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto 32px', lineHeight: 1.6 }}>
            Master the stock market with our proven 30-day challenge. Daily lessons, quizzes, and hands-on tasks to transform your trading skills.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{
              padding: '16px 32px',
              background: '#ffc107',
              color: '#1e3a5f',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '1.125rem'
            }}>
              Start Your Journey →
            </Link>
            <Link href="/login" style={{
              padding: '16px 32px',
              background: 'transparent',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.5)',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600
            }}>
              Already a Member? Login
            </Link>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: '48px', color: '#1e3a5f' }}>
            What You'll Learn
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
            {[
              { icon: '📊', title: 'Technical Analysis', desc: 'Master chart patterns, indicators, and price action' },
              { icon: '💰', title: 'Risk Management', desc: 'Learn to protect your capital and maximize returns' },
              { icon: '🧠', title: 'Trading Psychology', desc: 'Control emotions and develop a winning mindset' },
              { icon: '📈', title: 'Strategy Development', desc: 'Build and test your own trading strategies' },
              { icon: '📱', title: 'Market Fundamentals', desc: 'Understand how markets work and what moves them' },
              { icon: '🏆', title: 'Real Practice', desc: 'Daily tasks to apply what you learn immediately' }
            ].map((feature, i) => (
              <div key={i} style={{ background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{feature.icon}</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: '#1e3a5f' }}>{feature.title}</h3>
                <p style={{ color: '#64748b', lineHeight: 1.6 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Magnet Section */}
      <section style={{ padding: '80px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ color: 'white', fontSize: '2rem', fontWeight: 700, marginBottom: '16px' }}>
            📊 Get Your FREE Trading Journal Template
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '32px', lineHeight: 1.6 }}>
            Start tracking your trades like a pro. Our template includes P&L tracking, emotion logging, and performance analytics.
          </p>
          <form onSubmit={handleLeadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px', margin: '0 auto' }}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              style={{ padding: '14px 16px', borderRadius: '8px', border: 'none', fontSize: '1rem' }}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your Email"
              required
              style={{ padding: '14px 16px', borderRadius: '8px', border: 'none', fontSize: '1rem' }}
            />
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '14px 16px',
                background: '#ffc107',
                color: '#1e3a5f',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Sending...' : 'Get Free Template →'}
            </button>
          </form>
          {leadMessage && (
            <p style={{ color: 'white', marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px' }}>
              {leadMessage}
            </p>
          )}
        </div>
      </section>

      {/* Pricing Section */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '16px', color: '#1e3a5f' }}>
            Simple Pricing
          </h2>
          <p style={{ color: '#64748b', marginBottom: '32px' }}>
            One payment. Lifetime knowledge.
          </p>
          <div style={{ background: 'white', padding: '48px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#1e3a5f', marginBottom: '8px' }}>
              $39.99
            </div>
            <div style={{ color: '#64748b', marginBottom: '24px' }}>One-time payment</div>
            <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, marginBottom: '32px' }}>
              {[
                '30 days of structured lessons',
                'Video tutorials',
                'Daily quizzes & tasks',
                'Progress tracking',
                'Completion certificate',
                '120 days of access'
              ].map((item, i) => (
                <li key={i} style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  <span style={{ color: '#374151' }}>{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup" style={{
              display: 'block',
              padding: '16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '1.125rem'
            }}>
              Get Started Now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#1e3a5f', color: 'white', padding: '48px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px' }}>
          <div>
            <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>📈 Market Warrior</h3>
            <p style={{ opacity: 0.8, maxWidth: '300px', lineHeight: 1.6 }}>
              Your 30-day journey to becoming a confident trader.
            </p>
          </div>
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: '12px' }}>Links</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link href="/login" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>Login</Link>
              <Link href="/signup" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>Sign Up</Link>
              <Link href="/terms" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>Terms</Link>
              <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>Privacy</Link>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: '1200px', margin: '32px auto 0', paddingTop: '32px', borderTop: '1px solid rgba(255,255,255,0.2)', textAlign: 'center', opacity: 0.6 }}>
          © 2025 Market Warrior. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
