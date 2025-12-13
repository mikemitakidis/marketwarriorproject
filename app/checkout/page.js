'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

const PRICE = 39.99;

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkUser();
    // Get affiliate code from localStorage
    const aff = localStorage.getItem('affiliate_code');
    if (aff) setAffiliateCode(aff);
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

    if (profile?.is_paid) {
      router.push('/dashboard');
      return;
    }

    setUser(user);
    setLoading(false);
  }

  async function validatePromoCode() {
    if (!promoCode.trim()) return;
    
    setValidatingPromo(true);
    setPromoError('');
    setPromoSuccess('');
    
    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode })
      });
      
      const data = await res.json();
      
      if (data.valid) {
        setPromoDiscount(data.discount_percent);
        setPromoSuccess(data.message);
        setPromoError('');
      } else {
        setPromoDiscount(0);
        setPromoError(data.message || 'Invalid promo code');
        setPromoSuccess('');
      }
    } catch (err) {
      setPromoError('Failed to validate promo code');
    }
    
    setValidatingPromo(false);
  }

  async function handleCheckout() {
    setProcessing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/checkout/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          promo_code: promoDiscount > 0 ? promoCode : null,
          affiliate_code: affiliateCode || null
        })
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Checkout failed');
      }
    } catch (err) {
      alert(err.message);
      setProcessing(false);
    }
  }

  const finalPrice = PRICE * (1 - promoDiscount / 100);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', padding: '40px 24px' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <Link href="/" style={{ color: '#667eea', marginBottom: '24px', display: 'inline-block' }}>
          ← Back to Home
        </Link>

        <div style={{ background: 'white', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <span style={{ fontSize: '3rem' }}>📈</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '16px', color: '#1e3a5f' }}>
              Complete Your Purchase
            </h1>
            <p style={{ color: '#64748b', marginTop: '8px' }}>
              30-Day Market Warrior Challenge
            </p>
          </div>

          {/* Price Display */}
          <div style={{ 
            background: '#f8fafc', 
            borderRadius: '12px', 
            padding: '24px', 
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            {promoDiscount > 0 ? (
              <>
                <div style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '1.25rem' }}>
                  ${PRICE.toFixed(2)}
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981' }}>
                  ${finalPrice.toFixed(2)}
                </div>
                <div style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
                  You save ${(PRICE - finalPrice).toFixed(2)} ({promoDiscount}% off)
                </div>
              </>
            ) : (
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1e3a5f' }}>
                ${PRICE.toFixed(2)}
              </div>
            )}
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '8px' }}>
              One-time payment • Lifetime access
            </div>
          </div>

          {/* Promo Code */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.875rem' }}>
              Promo Code (optional)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  textTransform: 'uppercase'
                }}
              />
              <button
                onClick={validatePromoCode}
                disabled={validatingPromo || !promoCode.trim()}
                style={{
                  padding: '12px 20px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: validatingPromo ? 'not-allowed' : 'pointer',
                  opacity: validatingPromo || !promoCode.trim() ? 0.6 : 1
                }}
              >
                {validatingPromo ? '...' : 'Apply'}
              </button>
            </div>
            {promoError && (
              <div style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '8px' }}>
                {promoError}
              </div>
            )}
            {promoSuccess && (
              <div style={{ color: '#10b981', fontSize: '0.875rem', marginTop: '8px' }}>
                ✓ {promoSuccess}
              </div>
            )}
          </div>

          {/* What's Included */}
          <div style={{ marginBottom: '24px', padding: '16px', background: '#f0fdf4', borderRadius: '8px' }}>
            <div style={{ fontWeight: 600, marginBottom: '12px', color: '#166534' }}>What's Included:</div>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#15803d', fontSize: '0.875rem', lineHeight: 1.8 }}>
              <li>30 structured trading lessons</li>
              <li>Daily quizzes to test your knowledge</li>
              <li>Hands-on trading tasks</li>
              <li>Progress tracking dashboard</li>
              <li>Completion certificate</li>
              <li>120 days of access</li>
            </ul>
          </div>

          {affiliateCode && (
            <div style={{ marginBottom: '16px', padding: '12px', background: '#fef3c7', borderRadius: '8px', fontSize: '0.875rem' }}>
              Referred by: <strong>{affiliateCode}</strong>
            </div>
          )}

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={processing}
            style={{
              width: '100%',
              padding: '16px',
              background: processing ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.125rem',
              fontWeight: 700,
              cursor: processing ? 'not-allowed' : 'pointer'
            }}
          >
            {processing ? 'Processing...' : `Pay $${finalPrice.toFixed(2)} with Stripe`}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '16px' }}>
            🔒 Secure payment powered by Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
