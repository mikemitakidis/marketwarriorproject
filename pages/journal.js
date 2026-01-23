import { useEffect, useState } from 'react';
import logger from '../lib/logger';
import { getSupabaseClient, getServiceSupabase } from '../lib/supabase';
import { getUserFromRequest } from '../lib/serverAuth';
import Head from 'next/head';

/**
 * Paid trading journal page.
 *
 * This page is available to paid users and integrates with the
 * `trading_journal_entries` table in Supabase.  Users must be authenticated
 * and have paid to access this page.
 */
export async function getServerSideProps({ req }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }

    const supabase = getServiceSupabase();
    // Fetch user profile to verify payment
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('has_paid')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }

    if (!profile.has_paid) {
      return {
        redirect: {
          destination: '/free-journal',
          permanent: false,
        },
      };
    }

    // Fetch existing journal entries
    const { data: entries } = await supabase
      .from('trading_journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return {
      props: {
        userId: user.id,
        initialEntries: entries || [],
      },
    };
  } catch (err) {
    logger.error('Journal error:', err);
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }
}

export default function JournalPage({ userId, initialEntries = [] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [form, setForm] = useState({ symbol: '', side: 'buy', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Unable to connect. Please refresh.');
      setLoading(false);
      return;
    }

    const { symbol, side, notes } = form;
    const { data, error: insertError } = await supabase
      .from('trading_journal_entries')
      .insert({ user_id: userId, symbol, side, notes })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
    } else if (data) {
      setEntries([data, ...entries]);
      setForm({ symbol: '', side: 'buy', notes: '' });
    }
    setLoading(false);
  }
  return (
    <div className="container mx-auto p-4">
      <Head>
        <title>Trading Journal</title>
      </Head>
      <h1 className="text-3xl font-bold mb-4">Your Trading Journal</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex space-x-2 flex-wrap gap-2">
          <input
            type="text"
            placeholder="Symbol (e.g., AAPL)"
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            required
            className="border p-2"
          />
          <select
            value={form.side}
            onChange={(e) => setForm({ ...form, side: e.target.value })}
            className="border p-2"
          >
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          <input
            type="text"
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="border p-2 flex-1"
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
              <span className="font-medium">{entry.symbol}</span> – {entry.side.toUpperCase()}
              {entry.notes && <span className="text-gray-500 ml-2">({entry.notes})</span>}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-red-600 mt-4">{error}</p>}
    </div>
  );
}