'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isAffiliateOnly, setIsAffiliateOnly] = useState(false);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref);
      sessionStorage.setItem('referral_code', ref);
    } else {
      const storedRef = sessionStorage.getItem('referral_code');
      if (storedRef) setReferralCode(storedRef);
    }
    
    const affiliate = searchParams.get('affiliate');
    if (affiliate === 'true') {
      setIsAffiliateOnly(true);
    }
  }, [searchParams]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
          referralCode: referralCode || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      sessionStorage.removeItem('referral_code');

      if (data.requiresConfirmation) {
        // Show success message - user needs to check email
        setSuccess('✓ Account created! Please check your email and click the confirmation link to continue.');
        setEmail('');
        setPassword('');
        setFullName('');
      } else {
        // Already confirmed - redirect to login
        router.push('/login?message=Account created! Please login.');
      }
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '400px',
      background: 'white',
      borderRadius: '16px',
      padding: '40px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
    }}>
      <Link href="/" style={{ display: 'block', textAlign: 'center', marginBottom: '24px' }}>
        <img src="/logo.png" alt="Market Warrior" style={{ width: '60px', height: '60px', borderRadius: '12px', margin: '0 auto' }} />
      </Link>
      
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '8px', color: '#1e3a5f' }}>
        {isAffiliateOnly ? 'Join as Affiliate' : 'Create Your Account'}
      </h1>
      
      {isAffiliateOnly && (
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '24px', fontSize: '0.9rem' }}>
          Sign up free to get your affiliate link and start earning 25% commission!
        </p>
      )}

      {referralCode && !isAffiliateOnly && (
        <div style={{ 
          padding: '12px', 
          background: '#f0fdf4', 
          border: '1px solid #86efac', 
          borderRadius: '8px', 
          color: '#15803d', 
          marginBottom: '16px', 
          fontSize: '0.875rem',
          textAlign: 'center'
        }}>
          🎉 Referred by a friend! Welcome aboard!
        </div>
      )}

      {error && (
        <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', marginBottom: '16px', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', color: '#15803d', marginBottom: '16px', fontSize: '0.9rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📧</div>
          {success}
          <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#6b7280' }}>
            Didn't receive it? Check your spam folder.
          </div>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSignup}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="John Smith"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Creating account...' : isAffiliateOnly ? 'Create Free Affiliate Account' : 'Create Account'}
          </button>
        </form>
      )}

      <p style={{ textAlign: 'center', marginTop: '24px', color: '#6b7280' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: '#667eea', fontWeight: 500 }}>Sign in</Link>
      </p>

      {!isAffiliateOnly && (
        <p style={{ textAlign: 'center', marginTop: '12px', color: '#9ca3af', fontSize: '0.85rem' }}>
          Want to earn money?{' '}
          <Link href="/signup?affiliate=true" style={{ color: '#10b981', fontWeight: 500 }}>Join as affiliate (free)</Link>
        </p>
      )}
    </div>
  );
}

export default function SignupPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a, #1e293b)',
      padding: '24px'
    }}>
      <Suspense fallback={
        <div style={{ color: 'white', textAlign: 'center' }}>Loading...</div>
      }>
        <SignupForm />
      </Suspense>
    </div>
  );
}
