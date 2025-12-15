import { useEffect, useState } from 'react';
import { supabaseClient } from '../lib/supabase';
import { getUserFromJwt } from '../lib/auth';
import { getServiceSupabase } from '../lib/supabase';
import Head from 'next/head';

/**
 * Paid trading journal page.
 *
 * This page is available to paid users and integrates with the
 * `trading_journal` table in Supabase.  Users must be authenticated
 * and have an active subscription (has_paid && access_expires_at > now)
 * to access this page.  Entries are synced across devices via
 * Supabase.
 */
export async function getServerSideProps({ req }) {
  try {
    const user = await getUserFromJwt(req);
    const supabase = getServiceSupabase();
    // Fetch user profile to verify payment
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error || !profile) throw new Error('Profile not found');
    const now = new Date().toISOString();
    const hasAccess = profile.has_paid && (!profile.access_expires_at || profile.access_expires_at >= now);
    if (!hasAccess) {
      return {
        redirect: {
          destination: '/free-journal',
          permanent: false,
        },
      };
    }
    return { props: {} };
  } catch (err) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }
}

export default function JournalPage() {
  const [session, setSession] = useState(null);
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ symbol: '', direction: '', result: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    const sess = supabaseClient.auth.session();
    setSession(sess);
    const { data: listener } = supabaseClient.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener?.unsubscribe();
  }, []);
  useEffect(() => {
    async function loadEntries() {
      if (!session) return;
      const { data, error } = await supabaseClient
        .from('trading_journal')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) setError(error.message);
      else setEntries(data);
    }
    loadEntries();
  }, [session]);
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const { symbol, direction, result } = form;
    const { data, error } = await supabaseClient
      .from('trading_journal')
      .insert({ user_id: session.user.id, symbol, direction, result });
    if (error) setError(error.message);
    else setEntries([data[0], ...entries]);
    setForm({ symbol: '', direction: '', result: '' });
    setLoading(false);
  }
  return (
    <div className="container mx-auto p-4">
      <Head>
        <title>Trading Journal</title>
      </Head>
      <h1 className="text-3xl font-bold mb-4">Your Trading Journal</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Symbol"
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            required
            className="border p-2"
          />
          <input
            type="text"
            placeholder="Direction (Buy/Sell)"
            value={form.direction}
            onChange={(e) => setForm({ ...form, direction: e.target.value })}
            required
            className="border p-2"
          />
          <input
            type="text"
            placeholder="Result"
            value={form.result}
            onChange={(e) => setForm({ ...form, result: e.target.value })}
            required
            className="border p-2"
          />
          <button type="submit" disabled={loading} className="bg-green-600 text-white px-4 py-2">
            {loading ? 'Saving…' : 'Add Entry'}
          </button>
        </div>
      </form>
      <h2 className="text-2xl font-bold mb-2">Entries</h2>
      {entries.length === 0 ? (
        <p>No entries yet.</p>
      ) : (
        <ul>
          {entries.map((entry) => (
            <li key={entry.id} className="border-b py-2">
              <span className="font-medium">{entry.symbol}</span> – {entry.direction} ({entry.result})
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-red-600 mt-4">{error}</p>}
    </div>
  );
}