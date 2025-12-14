'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function CertificatePage() {
  const router = useRouter();
  const supabase = createClient();
  const certificateRef = useRef(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    checkCompletion();
  }, []);

  async function checkCompletion() {
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

    // Check if all 30 days completed
    const { data: progress } = await supabase
      .from('challenge_progress')
      .select('day_number, quiz_passed, task_completed')
      .eq('user_id', user.id);

    const completedDays = progress?.filter(p => p.quiz_passed && p.task_completed).length || 0;

    if (completedDays < 30) {
      router.push('/dashboard');
      return;
    }

    setUser({ ...user, profile });
    setLoading(false);
  }

  async function downloadCertificate() {
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(certificateRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.download = `Market-Warrior-Certificate-${user.profile.full_name.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
    }
    setDownloading(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div className="spinner" />
      </div>
    );
  }

  const completionDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <Link href="/dashboard" style={{ color: '#667eea', fontWeight: 500 }}>
            ← Back to Dashboard
          </Link>
          <button
            onClick={downloadCertificate}
            disabled={downloading}
            style={{
              padding: '12px 24px',
              background: downloading ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: downloading ? 'not-allowed' : 'pointer'
            }}
          >
            {downloading ? 'Downloading...' : '📥 Download Certificate'}
          </button>
        </div>

        {/* Certificate */}
        <div
          ref={certificateRef}
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
            borderRadius: '16px',
            padding: '60px',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Decorative elements */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            background: 'rgba(255,193,7,0.1)',
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-30px',
            left: '-30px',
            width: '150px',
            height: '150px',
            background: 'rgba(102,126,234,0.1)',
            borderRadius: '50%'
          }} />

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '40px', position: 'relative' }}>
            <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🏆</div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '2px' }}>
              CERTIFICATE
            </h1>
            <p style={{ fontSize: '1.25rem', opacity: 0.8 }}>of Completion</p>
          </div>

          {/* Body */}
          <div style={{ textAlign: 'center', marginBottom: '40px', position: 'relative' }}>
            <p style={{ fontSize: '1rem', opacity: 0.7, marginBottom: '16px' }}>This is to certify that</p>
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #ffc107, #ff9800)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '16px'
            }}>
              {user?.profile?.full_name}
            </h2>
            <p style={{ fontSize: '1rem', opacity: 0.7, marginBottom: '24px' }}>
              has successfully completed the
            </p>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '8px' }}>
              30-Day Market Warrior Challenge
            </h3>
            <p style={{ opacity: 0.7 }}>
              Demonstrating proficiency in trading fundamentals, technical analysis,<br />
              risk management, and strategy development.
            </p>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginTop: '60px',
            position: 'relative'
          }}>
            <div>
              <div style={{ fontSize: '0.875rem', opacity: 0.6 }}>Date of Completion</div>
              <div style={{ fontWeight: 600 }}>{completionDate}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '4px' }}>📈 Market Warrior</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Trading Education Platform</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', opacity: 0.6 }}>Certificate ID</div>
              <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                MW-{user?.id?.slice(0, 8).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
