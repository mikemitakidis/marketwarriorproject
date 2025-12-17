'use client';

import { useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { getSiteUrl } from '@/lib/env';

type Profile = {
  user_id: string;
  has_paid: boolean;
};

export default function AffiliateClient({ profile }: { profile: Profile }) {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);

  const modeLabel = useMemo(() => (profile.has_paid ? 'Paid member affiliate (30%)' : 'Affiliate-only (25%)'), [profile.has_paid]);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('affiliate_profiles')
      .select('referral_code, active, mode')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data?.referral_code) setRefCode(data.referral_code);
  }

  useEffect(() => { load(); }, []);

  async function enableAffiliate() {
    setLoading(true);
    setMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in.');

      // Insert affiliate profile if missing
      const { error } = await supabase
        .from('affiliate_profiles')
        .upsert({
          user_id: user.id,
          mode: profile.has_paid ? 'paid_member' : 'affiliate_only',
          active: true,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setMsg('Affiliate access enabled.');
      await load();
    } catch (e: any) {
      setMsg(e.message ?? 'Failed.');
    } finally {
      setLoading(false);
    }
  }

  const link = refCode ? `${getSiteUrl()}/register?ref=${refCode}` : null;

  return (
    <div className="row">
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Your affiliate status</div>
        <div style={{ opacity: .9 }}>{modeLabel}</div>

        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          {!refCode ? (
            <button className="btn btnPrimary" onClick={enableAffiliate} disabled={loading}>
              {loading ? 'Enabling…' : 'Enable affiliate link'}
            </button>
          ) : (
            <>
              <div style={{ opacity: .9 }}>Your referral link:</div>
              <input className="input" value={link ?? ''} readOnly />
              <button className="btn" onClick={() => { if (link) navigator.clipboard.writeText(link); }}>
                Copy
              </button>
            </>
          )}
        </div>

        {msg && <div style={{ marginTop: 10, opacity: .9 }}>{msg}</div>}
      </div>
    </div>
  );
}
