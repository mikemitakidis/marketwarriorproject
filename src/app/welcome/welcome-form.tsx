'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type Profile = {
  user_id: string;
  has_paid: boolean;
  full_name: string | null;
  full_name_locked?: boolean;
  welcome_completed: boolean;
};

export default function WelcomeForm({ instructionsHtml }: { instructionsHtml: string }) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [fullName, setFullName] = useState('');
  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);
  const [agree3, setAgree3] = useState(false);
  const [agree4, setAgree4] = useState(false);
  const [agree5, setAgree5] = useState(false);

  const allAgreed = useMemo(() => agree1 && agree2 && agree3 && agree4 && agree5, [agree1, agree2, agree3, agree4, agree5]);

  async function load() {
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data, error: pErr } = await supabase
      .from('user_profiles')
      // Use `*` so this doesn't break if your current Supabase schema doesn't yet
      // include the new `full_name_locked` column (we also ship a patch SQL).
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (pErr || !data) {
      setError('Profile not found. Please log out and log in again.');
      setLoading(false);
      return;
    }

    const p = {
      user_id: data.user_id,
      has_paid: Boolean(data.has_paid),
      full_name: (data.full_name ?? null) as string | null,
      full_name_locked: Boolean(data.full_name_locked ?? false),
      welcome_completed: Boolean(data.welcome_completed),
    } as Profile;
    setProfile(p);

    if (p.welcome_completed) {
      router.replace('/dashboard');
      return;
    }

    // Prefill name if available (but only lock it once Welcome is submitted).
    setFullName(p.full_name ?? '');
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function submit() {
    setError(null);

    if (!profile) return;
    if (!profile.has_paid) {
      router.push('/pay');
      return;
    }

    const trimmed = fullName.trim();
    if (!trimmed) {
      setError('Please enter your full name.');
      return;
    }

    if (!allAgreed) {
      setError('Please tick all 5 boxes to continue.');
      return;
    }

    // Enforce name immutability client-side (DB will also enforce if you run the patch SQL).
    if (profile.full_name_locked && profile.full_name && trimmed !== profile.full_name) {
      setError('Your certificate name is already locked and cannot be changed.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();

      const payload = {
        certificate_name: trimmed,
        agree1,
        agree2,
        agree3,
        agree4,
        agree5,
        version: 'v1',
        submitted_at: now,
      };

      const update: any = {
        welcome_completed: true,
        welcome_completed_at: now,
        terms_accepted_at: now,
        welcome_payload: payload,
        full_name_locked: true,
      };

      // Allow editing until the lock is set.
      if (!profile.full_name_locked) {
        update.full_name = trimmed;
      }

      // Try the update with full_name_locked. If your current DB doesn't have the
      // column yet, retry without it (so the flow still works).
      let { error: uErr } = await supabase
        .from('user_profiles')
        .update(update)
        .eq('user_id', profile.user_id);

      if (uErr && /full_name_locked/i.test(uErr.message)) {
        const { full_name_locked, ...fallback } = update;
        const retry = await supabase
          .from('user_profiles')
          .update(fallback)
          .eq('user_id', profile.user_id);
        uErr = retry.error;
      }

      if (uErr) throw uErr;

      router.replace('/dashboard');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ opacity: .85 }}>Loading…</div>;
  }

  if (!profile) {
    return <div style={{ color: 'salmon' }}>Could not load profile.</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {instructionsHtml ? (
        <div dangerouslySetInnerHTML={{ __html: instructionsHtml }} />
      ) : null}

      <div className="card" style={{ margin: 0 }}>
        <h2 style={{ margin: '0 0 6px 0' }}>📝 Certificate name</h2>
        <div style={{ opacity: .85 }}>
          This name will appear on your Certificate of Completion. It will be locked after you submit this page.
        </div>

        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <input
            className="input"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={Boolean(profile.full_name_locked)}
          />

          <div style={{
            border: '1px solid rgba(255, 80, 80, .45)',
            background: 'rgba(255, 80, 80, .10)',
            padding: 12,
            borderRadius: 12,
            opacity: .95,
          }}>
            <strong>⚠️ IMPORTANT:</strong> Your name cannot be changed later. Make sure it's spelled correctly.
          </div>
        </div>
      </div>

      <div className="card" style={{ margin: 0 }}>
        <h2 style={{ margin: '0 0 10px 0' }}>✅ I agree to</h2>

        <label className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
          <input type="checkbox" checked={agree1} onChange={(e) => setAgree1(e.target.checked)} />
          <span>I have read and agree to all Terms & Conditions.</span>
        </label>

        <label className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
          <input type="checkbox" checked={agree2} onChange={(e) => setAgree2(e.target.checked)} />
          <span>I understand this is education only (not financial advice) and I will use demo accounts until I am ready.</span>
        </label>

        <label className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
          <input type="checkbox" checked={agree3} onChange={(e) => setAgree3(e.target.checked)} />
          <span>I understand my certificate name is permanent once submitted.</span>
        </label>

        <label className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
          <input type="checkbox" checked={agree4} onChange={(e) => setAgree4(e.target.checked)} />
          <span>I understand the refund/access policy (3-day refunds, 120-day access).</span>
        </label>

        <label className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
          <input type="checkbox" checked={agree5} onChange={(e) => setAgree5(e.target.checked)} />
          <span>I understand trading involves risk and I may lose money.</span>
        </label>
      </div>

      {error && (
        <div style={{ color: 'salmon' }}>{error}</div>
      )}

      <button className="btn btnPrimary" onClick={submit} disabled={saving || !allAgreed}>
        {saving ? 'Saving…' : 'Continue to Dashboard'}
      </button>
    </div>
  );
}
