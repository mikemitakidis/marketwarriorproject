'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const navItems = [
  { href: '/admin', icon: '📊', label: 'Dashboard' },
  { href: '/admin/users', icon: '👥', label: 'Users' },
  { href: '/admin/content', icon: '📝', label: 'Content' },
  { href: '/admin/promo', icon: '🎟️', label: 'Promo Codes' },
  { href: '/admin/affiliates', icon: '🤝', label: 'Affiliates' },
  { href: '/admin/payments', icon: '💳', label: 'Payments' },
  { href: '/admin/emails', icon: '📧', label: 'Email Campaigns' },
  { href: '/admin/live-feed', icon: '📢', label: 'Live Feed' },
  { href: '/admin/settings', icon: '⚙️', label: 'Settings' },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      router.push('/dashboard');
      return;
    }

    setIsAdmin(true);
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        background: '#1e3a5f',
        color: 'white',
        padding: '24px 0',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '0 24px', marginBottom: '32px' }}>
          <Link href="/admin" style={{ color: 'white', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            📈 Admin Panel
          </Link>
        </div>
        <nav style={{ flex: 1 }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 24px',
                color: pathname === item.href ? '#ffc107' : 'rgba(255,255,255,0.8)',
                background: pathname === item.href ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderLeft: pathname === item.href ? '3px solid #ffc107' : '3px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.2s',
                fontSize: '0.95rem'
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div style={{ padding: '24px' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', textDecoration: 'none' }}>
            ← Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
