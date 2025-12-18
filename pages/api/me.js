import { getUserFromRequest, getGateStatus } from '../../lib/serverAuth';

export default async function handler(req, res) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    const gate = await getGateStatus(user.id);
    return res.status(200).json({ user: { id: user.id, email: user.email }, gate });
  } catch (e) {
    console.error('me error:', e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
