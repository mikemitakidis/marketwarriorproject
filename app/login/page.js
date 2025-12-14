'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isAffiliateSignup, setIsAffiliateSignup] = useState(false);

  useEffect(() => {
    const msg = searchParams.get('message');
    if (msg) setMessage(msg);
    
    const register = searchParams.get('register');
    if (register === 'true') {
      router.push('/signup');
    }
    
    const affiliate = searchParams.get('affiliate');
    if (affiliate === 'true') {
      setIsAffiliateSignup(true);
    }
  }, [searchParams, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('has_paid, agreed_to_terms, is_admin')
        .eq('user_id', data.user.id)
        .single();

      if (profile?.is_admin) {
        router.push('/dashboard');
      } else if (!profile?.has_paid) {
        if (isAffiliateSignup) {
          router.push('/dashboard');
        } else {
          router.push('/checkout');
        }
      } else if (!profile?.agreed_to_terms) {
        router.push('/welcome');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
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
      
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '24px', color: '#1e3a5f' }}>
        Welcome Back
      </h1>

      {message && (
        <div style={{ 
          padding: '12px', 
          background: '#f0fdf4', 
          border: '1px solid #86efac', 
          borderRadius: '8px', 
          color: '#15803d', 
          marginBottom: '16px', 
          fontSize: '0.875rem' 
        }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', marginBottom: '16px', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin}>
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
            placeholder="Your password"
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
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '24px', color: '#6b7280' }}>
        Don't have an account?{' '}
        <Link href="/signup" style={{ color: '#667eea', fontWeight: 500 }}>Sign up</Link>
      </p>
      
      <p style={{ textAlign: 'center', marginTop: '12px', color: '#9ca3af', fontSize: '0.85rem' }}>
        Want to earn money?{' '}
        <Link href="/signup?affiliate=true" style={{ color: '#10b981', fontWeight: 500 }}>Join as affiliate (free)</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
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
        <LoginForm />
      </Suspense>
    </div>
  );
}
