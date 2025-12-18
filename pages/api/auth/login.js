const { getAnonSupabase, setAuthCookies, getGateStatus, determineNextRoute } = require('../../../lib/serverAuth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

    const supabase = getAnonSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.session || !data?.user) {
      return res.status(401).json({ error: error?.message || 'Invalid credentials' });
    }

    setAuthCookies(res, data.session);

    const gate = await getGateStatus(data.user.id);
    const next = determineNextRoute(gate);

    return res.status(200).json({ ok: true, next });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
};
