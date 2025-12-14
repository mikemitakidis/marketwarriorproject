'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(null);
  const [price, setPrice] = useState(39.99);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('has_paid')
      .eq('user_id', user.id)
      .single();

    if (profile?.has_paid) { router.push('/welcome'); return; }
    setUser(user);
    setLoading(false);
  }

  async function applyPromo() {
    if (!promoCode.trim()) return;
    
    const res = await fetch('/api/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: promoCode })
    });
    
    const data = await res.json();
    if (data.valid) {
      setPromoApplied(data);
      setPrice(39.99 * (1 - data.discount_percent / 100));
    } else {
      alert('Invalid or expired promo code');
    }
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
        body: JSON.stringify({ promo_code: promoApplied?.code })
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

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea, #764ba2)' }}><div className="spinner" /></div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '40px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '24px', padding: '48px', maxWidth: '500px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚔️</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Complete Your Purchase</h1>
          <p style={{ color: '#64748b' }}>Unlock the 30-Day Trading Challenge</p>
        </div>

        {/* What's Included */}
        <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>What's Included:</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {['30 days of structured lessons', 'Daily quizzes & practical tasks', 'Trading journal tool', 'Certificate of completion', '120 days access', '30% affiliate commissions'].map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', color: '#475569' }}>
                <span style={{ color: '#10b981' }}>✓</span> {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Promo Code */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>Promo Code</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Enter code"
              disabled={promoApplied}
              style={{ flex: 1, padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
            />
            <button
              onClick={applyPromo}
              disabled={promoApplied}
              style={{ padding: '12px 20px', background: promoApplied ? '#10b981' : '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              {promoApplied ? '✓ Applied' : 'Apply'}
            </button>
          </div>
          {promoApplied && (
            <p style={{ color: '#10b981', marginTop: '8px', fontSize: '0.9rem' }}>
              {promoApplied.discount_percent}% discount applied!
            </p>
          )}
        </div>

        {/* Price */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          {promoApplied && (
            <div style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '1.25rem' }}>$39.99</div>
          )}
          <div style={{ fontSize: '3rem', fontWeight: 800, color: '#1e293b' }}>${price.toFixed(2)}</div>
          <div style={{ color: '#64748b' }}>One-time payment</div>
        </div>

        {/* Checkout Button */}
        <button
          onClick={handleCheckout}
          disabled={processing}
          style={{
            width: '100%',
            padding: '18px',
            background: processing ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1.25rem',
            fontWeight: 700,
            cursor: processing ? 'not-allowed' : 'pointer',
            boxShadow: !processing && '0 10px 40px rgba(16, 185, 129, 0.4)'
          }}
        >
          {processing ? 'Processing...' : '💳 Pay with Stripe'}
        </button>

        {/* Guarantee */}
        <div style={{ textAlign: 'center', marginTop: '24px', padding: '16px', background: '#fef3c7', borderRadius: '12px' }}>
          <p style={{ color: '#92400e', fontWeight: 600, marginBottom: '4px' }}>🛡️ 3-Day Money-Back Guarantee</p>
          <p style={{ color: '#a16207', fontSize: '0.9rem' }}>Not satisfied? Get a full refund within 3 days.</p>
        </div>
      </div>
    </div>
  );
}
