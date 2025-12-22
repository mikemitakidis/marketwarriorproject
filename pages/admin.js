import fs from 'fs';
import path from 'path';
import { getServiceSupabase } from '../lib/supabase';
import { getUserFromJwt, getUserProfile } from '../lib/auth';
import { useState } from 'react';
import { supabaseClient } from '../lib/supabase';

/**
 * Admin panel page.
 *
 * This page uses `getServerSideProps` to verify the user’s JWT,
 * enforce the admin email allow‑list and password gate, and load
 * initial admin data (e.g. list of users).  It renders the provided
 * `admin-panel-enhanced.html` template and overlays dynamic data
 * where appropriate.  Only users with `is_admin` set to true and
 * emails in the allow list may view this page.
 */
export async function getServerSideProps({ req }) {
  try {
    const user = await getUserFromJwt(req);
    const supabase = getServiceSupabase();
    // Fetch profile
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (profileErr || !profile) throw new Error('User profile not found');
    // Check email allow list
    const allowList = process.env.ADMIN_EMAIL_ALLOWLIST ? process.env.ADMIN_EMAIL_ALLOWLIST.split(',') : [];
    const emailAllowed = allowList.includes(user.email);
    const isAdmin = profile.is_admin === true;
    // Check admin password gate: look for cookie or header.  Use
    // bcrypt comparison rather than plain equality.
    const providedPassword = req.headers['x-admin-password'] || req.headers['admin-password'];
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;
    let passwordOk = false;
    if (passwordHash && providedPassword) {
      const bcrypt = require('bcryptjs');
      try {
        passwordOk = await bcrypt.compare(providedPassword, passwordHash);
      } catch (e) {
        passwordOk = false;
      }
    }
    if (!emailAllowed || !isAdmin || !passwordOk) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }
    // Load template
    const filePath = path.join(process.cwd(), 'templates', 'admin-panel-enhanced.html');
    const html = fs.readFileSync(filePath, 'utf8');
    // Load users list as an example of dynamic admin data
    const { data: users, error: usersErr } = await supabase
      .from('user_profiles')
      .select('id, email, is_admin, created_at')
      .order('created_at', { ascending: false });
    if (usersErr) throw new Error('Unable to load users');
    return {
      props: {
        html,
        users,
      },
    };
  } catch (err) {
    console.error(err);
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }
}

export default function AdminPage({ html, users }) {
  const [priceId, setPriceId] = useState('');
  const [priceMessage, setPriceMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [loadingAction, setLoadingAction] = useState(null);

  async function updatePrice() {
    if (!priceId.startsWith('price_')) {
      setPriceMessage('Price ID must start with price_');
      return;
    }
    const adminPassword = window.prompt('Enter admin password to update price');
    if (!adminPassword) return;
    const { data: { session } } = await supabaseClient.auth.getSession();
    const token = session?.access_token;
    const res = await fetch('/api/admin/settings/stripe-price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ priceId, adminPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      setPriceMessage('Price updated successfully');
      setPriceId('');
    } else {
      setPriceMessage(data.error || 'Failed to update price');
    }
  }

  async function handleUserAction(userId, action, userEmail) {
    const actionLabels = {
      'unlock_all': 'unlock all 30 days for',
      'reset_user': 'reset all progress for'
    };
    if (!confirm(`Are you sure you want to ${actionLabels[action]} ${userEmail}?`)) {
      return;
    }
    setLoadingAction(`${action}-${userId}`);
    setActionMessage('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, userId }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`✓ ${data.message}`);
      } else {
        setActionMessage(`✗ Error: ${data.error}`);
      }
    } catch (err) {
      setActionMessage(`✗ Error: ${err.message}`);
    }
    setLoadingAction(null);
  }

  return (
    <div>
      {/* Render the static admin template */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <div style={{ padding: '20px', background: '#f9fafb' }}>
        <h2>User Management</h2>
        {actionMessage && (
          <div style={{ padding: '10px', marginBottom: '15px', background: actionMessage.startsWith('✓') ? '#d1fae5' : '#fee2e2', borderRadius: '5px' }}>
            {actionMessage}
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <thead>
            <tr style={{ background: '#e5e7eb' }}>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #d1d5db' }}>Email</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #d1d5db' }}>Admin</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #d1d5db' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users && users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '10px' }}>{u.email}</td>
                <td style={{ padding: '10px' }}>{u.is_admin ? '✓' : ''}</td>
                <td style={{ padding: '10px' }}>
                  <button
                    onClick={() => handleUserAction(u.id, 'unlock_all', u.email)}
                    disabled={loadingAction === `unlock_all-${u.id}`}
                    style={{ padding: '5px 10px', marginRight: '5px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    {loadingAction === `unlock_all-${u.id}` ? '...' : '🔓 Unlock All Days'}
                  </button>
                  <button
                    onClick={() => handleUserAction(u.id, 'reset_user', u.email)}
                    disabled={loadingAction === `reset_user-${u.id}`}
                    style={{ padding: '5px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    {loadingAction === `reset_user-${u.id}` ? '...' : '🔄 Reset Progress'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <hr />
        <h2>Billing Settings</h2>
        <p>Update the active Stripe Price ID used for checkout.</p>
        <input
          type="text"
          placeholder="price_..."
          value={priceId}
          onChange={(e) => setPriceId(e.target.value)}
          style={{ width: '300px', padding: '8px', marginRight: '8px' }}
        />
        <button onClick={updatePrice} style={{ padding: '8px 12px' }}>Save Price ID</button>
        {priceMessage && <p>{priceMessage}</p>}
      </div>
    </div>
  );
}