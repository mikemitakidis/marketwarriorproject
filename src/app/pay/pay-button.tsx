'use client';

import { useState } from 'react';

export default function PayButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/stripe/create-checkout-session', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create checkout session.');
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="row">
      {error && <div style={{ color: 'salmon' }}>{error}</div>}
      <button className="btn btnPrimary" onClick={startCheckout} disabled={loading}>
        {loading ? 'Redirecting…' : 'Pay now'}
      </button>
    </div>
  );
}
