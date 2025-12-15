import { useState, useEffect } from 'react';
import { supabaseClient } from '../lib/supabase';
import Head from 'next/head';

/**
 * Marketing trading journal page.
 *
 * This version of the journal is accessible without payment and
 * requires only an email address for registration.  Entries are
 * stored in a separate `leads_journal` table and will not confer
 * access to the paid course.  Users sign in via magic link or
 * Google; once authenticated they can add and view their own
 * journal entries.
 */
export default function FreeJournal() {
  const [email, setEmail] = useState('');
  const [session, setSession] = useState(null);
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ symbol: '', direction: '', result: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sess = supabaseClient.auth.session();
    setSession(sess);
    const { data: listener } = supabaseClient.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => {
      listener?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function loadEntries() {
      if (!session) return;
      const { data, error } = await supabaseClient
        .from('leads_journal')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) setError(error.message);
      else setEntries(data);
    }
    loadEntries();
  }, [session]);

  async function handleSignIn(e) {
    e.preventDefault();
    const { error } = await supabaseClient.auth.signInWithOtp({ email });
    if (error) setError(error.message);
  }
  async function handleGoogle() {
    const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
    if (error) setError(error.message);
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const { symbol, direction, result } = form;
    const { data, error } = await supabaseClient
      .from('leads_journal')
      .insert({ user_id: session.user.id, email: session.user.email, symbol, direction, result });
    if (error) setError(error.message);
    else setEntries([data[0], ...entries]);
    setForm({ symbol: '', direction: '', result: '' });
    setLoading(false);
  }
  return (
    <div className="container mx-auto p-4">
      <Head>
        <title>Free Trading Journal</title>
      </Head>
      <h1 className="text-3xl font-bold mb-4">Free Trading Journal</h1>
      {!session ? (
        <div>
          <form onSubmit={handleSignIn} className="mb-4">
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border p-2 mr-2"
            />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2">
              Send Sign‑In Link
            </button>
          </form>
          <button onClick={handleGoogle} className="bg-red-500 text-white px-4 py-2">
            Continue with Google
          </button>
        </div>
      ) : (
        <div>
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
          <h2 className="text-2xl font-bold mb-2">Your Entries</h2>
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
        </div>
      )}
      {error && <p className="text-red-600 mt-4">{error}</p>}
    </div>
  );
}