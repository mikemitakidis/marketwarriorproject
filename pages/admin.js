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
  async function updatePrice() {
    if (!priceId.startsWith('price_')) {
      setPriceMessage('Price ID must start with price_');
      return;
    }
    // prompt for admin password; do not store it in state
    const adminPassword = window.prompt('Enter admin password to update price');
    if (!adminPassword) return;
    // Obtain current session to get JWT
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
  return (
    <div>
      {/* Render the static admin template */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <div style={{ padding: '20px', background: '#f9fafb' }}>
        <h2>Users</h2>
        <ul>
          {users && users.map((u) => (
            <li key={u.id}>{u.email} {u.is_admin ? '(admin)' : ''}</li>
          ))}
        </ul>
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