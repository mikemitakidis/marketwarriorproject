'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

const navItems = [
  { href: '/admin', icon: '📊', label: 'Dashboard' },
  { href: '/admin/settings', icon: '⚙️', label: 'Site Settings' },
  { href: '/admin/content', icon: '📝', label: 'Content Editor' },
  { href: '/admin/users', icon: '👥', label: 'User Management' },
  { href: '/admin/promo', icon: '🎟️', label: 'Promo Codes' },
  { href: '/admin/affiliates', icon: '💰', label: 'Affiliates' },
  { href: '/admin/payments', icon: '💳', label: 'Payments' },
  { href: '/admin/emails', icon: '📧', label: 'Email Campaigns' },
  { href: '/admin/live-feed', icon: '📢', label: 'Live Feed' },
];

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single();

    if (!profile?.is_admin) {
      router.push('/dashboard');
      return;
    }

    setIsAdmin(true);
    setLoading(false);
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}><div className="spinner" /></div>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', background: 'linear-gradient(180deg, #1e293b 0%, #334155 100%)', padding: '30px 0', position: 'fixed', top: 0, bottom: 0, overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', padding: '0 20px 30px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '50px' }}>⚔️</div>
          <h2 style={{ color: 'white', fontSize: '1.5em', marginTop: '15px' }}>Market Warrior</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9em' }}>Admin Panel</p>
        </div>

        <nav style={{ padding: '30px 0' }}>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                padding: '15px 30px',
                color: pathname === item.href ? 'white' : '#cbd5e1',
                textDecoration: 'none',
                background: pathname === item.href ? '#667eea' : 'transparent',
                borderLeft: pathname === item.href ? '4px solid #fbbf24' : '4px solid transparent',
                transition: 'all 0.3s'
              }}
            >
              <span style={{ fontSize: '1.3em' }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div style={{ padding: '20px 30px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Link href="/dashboard" style={{ color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            ← Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: '260px', flex: 1, padding: '30px', background: '#f1f5f9' }}>
        {children}
      </main>
    </div>
  );
}
