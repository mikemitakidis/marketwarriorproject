'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function AdminClient() {
  const supabase = createSupabaseBrowserClient();
  const [paidRate, setPaidRate] = useState('0.30');
  const [affRate, setAffRate] = useState('0.25');
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from('affiliate_settings')
      .select('paid_member_rate, affiliate_only_rate')
      .eq('id', 1)
      .single();

    if (!error && data) {
      setPaidRate(String(data.paid_member_rate));
      setAffRate(String(data.affiliate_only_rate));
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setMsg(null);
    const paid = Number(paidRate);
    const aff = Number(affRate);

    if (Number.isNaN(paid) || Number.isNaN(aff)) {
      setMsg('Rates must be valid numbers.');
      return;
    }
    if (paid < 0 || paid > 1 || aff < 0 || aff > 1) {
      setMsg('Rates must be between 0 and 1 (e.g. 0.30).');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMsg('Not logged in.'); return; }

    const { error } = await supabase
      .from('affiliate_settings')
      .update({
        paid_member_rate: paid,
        affiliate_only_rate: aff,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', 1);

    setMsg(error ? error.message : 'Saved.');
  }

  return (
    <div className="row">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Affiliate commission settings</h2>
        <div className="row">
          <label>Paid members rate (default 0.30)</label>
          <input className="input" value={paidRate} onChange={(e) => setPaidRate(e.target.value)} />
        </div>
        <div className="row">
          <label>Affiliate-only rate (default 0.25)</label>
          <input className="input" value={affRate} onChange={(e) => setAffRate(e.target.value)} />
        </div>
        <button className="btn btnPrimary" onClick={save}>Save</button>
        {msg && <div style={{ opacity: .9 }}>{msg}</div>}
      </div>
    </div>
  );
}
