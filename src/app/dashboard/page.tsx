import { gateDashboard, requireProfile } from '@/lib/auth/guards';
import LogoutButton from './logout-button';

export default async function DashboardPage() {
  await gateDashboard();
  const { profile } = await requireProfile();

  return (
    <main className="container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ marginTop: 0 }}>Dashboard</h1>
          <LogoutButton />
        </div>

        <p style={{ opacity: .9 }}>
          Welcome{profile.full_name ? `, ${profile.full_name}` : ''}.
        </p>

        {/* PASTE YOUR TEMPLATE MARKUP HERE (keep 1:1 design) */}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a className="btn" href="/days/1">Start Day 1</a>
          <a className="btn" href="/community">Community Forum</a>
          <a className="btn" href="/journal">Trading Journal</a>
          <a className="btn" href="/affiliate">Refer & Earn</a>
          <a className="btn" href="/admin">Admin</a>
        </div>

        <div style={{ marginTop: 16 }}>
          <p style={{ margin: '12px 0 8px', opacity: .8 }}>All Days</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
              <a key={d} className="btn" href={`/days/${d}`} style={{ padding: '10px 12px' }}>
                Day {d}
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
