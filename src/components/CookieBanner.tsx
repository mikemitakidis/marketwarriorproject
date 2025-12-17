'use client';

import { useEffect, useState } from 'react';

type Consent = {
  essential: true;
  analytics: boolean;
};

const KEY = 'mw_cookie_consent_v1';

export default function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      setOpen(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Consent;
      setAnalytics(!!parsed.analytics);
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  const save = (value: Consent) => {
    localStorage.setItem(KEY, JSON.stringify(value));
    setOpen(false);
  };

  return (
    <div style={{
      position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 50,
      border: '1px solid rgba(255,255,255,.16)', borderRadius: 16, padding: 16,
      background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(8px)'
    }}>
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontWeight: 700 }}>Cookies</div>
        <div style={{ opacity: .9, lineHeight: 1.35 }}>
          We use essential cookies to run the site. You can optionally allow analytics cookies.
        </div>

        <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={analytics}
            onChange={(e) => setAnalytics(e.target.checked)}
          />
          Allow analytics cookies (optional)
        </label>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btnPrimary" onClick={() => save({ essential: true, analytics: true })}>
            Accept all
          </button>
          <button className="btn" onClick={() => save({ essential: true, analytics: false })}>
            Reject non-essential
          </button>
          <button className="btn" onClick={() => save({ essential: true, analytics })}>
            Save preferences
          </button>
        </div>
      </div>
    </div>
  );
}
