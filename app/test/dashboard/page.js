'use client';

import Link from 'next/link';

export default function TestDashboard() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: 'white', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ background: '#dc2626', padding: '15px', borderRadius: '8px', marginBottom: '30px', textAlign: 'center' }}>
          <strong>⚠️ TEST DASHBOARD - No Authentication</strong>
        </div>

        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Welcome, Test User! 🎉</h1>
        <p style={{ color: '#94a3b8', marginBottom: '40px' }}>Your 30-Day Trading Challenge Progress</p>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div style={{ background: '#1e293b', padding: '25px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#22c55e' }}>1</div>
            <div style={{ color: '#94a3b8' }}>Current Day</div>
          </div>
          <div style={{ background: '#1e293b', padding: '25px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#667eea' }}>0/30</div>
            <div style={{ color: '#94a3b8' }}>Days Completed</div>
          </div>
          <div style={{ background: '#1e293b', padding: '25px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#f59e0b' }}>120</div>
            <div style={{ color: '#94a3b8' }}>Days Remaining</div>
          </div>
          <div style={{ background: '#1e293b', padding: '25px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#ec4899' }}>0%</div>
            <div style={{ color: '#94a3b8' }}>Progress</div>
          </div>
        </div>

        {/* Day Grid */}
        <h2 style={{ marginBottom: '20px' }}>📚 Challenge Days</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
          {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
            <Link
              key={day}
              href={`/test?day=${day}`}
              style={{
                background: day === 1 ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#1e293b',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center',
                textDecoration: 'none',
                color: 'white',
                transition: 'transform 0.2s',
              }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Day {day}</div>
              <div style={{ fontSize: '0.875rem', color: day === 1 ? 'white' : '#94a3b8', marginTop: '5px' }}>
                {day === 1 ? '🔓 Unlocked' : '🔒 Locked'}
              </div>
            </Link>
          ))}
        </div>

        {/* Navigation */}
        <div style={{ marginTop: '40px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <Link href="/test" style={{ padding: '15px 30px', background: '#667eea', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
            📖 View All Content
          </Link>
          <Link href="/journal" style={{ padding: '15px 30px', background: '#059669', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
            📊 Trading Journal
          </Link>
          <Link href="/admin" style={{ padding: '15px 30px', background: '#dc2626', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
            👑 Admin Panel
          </Link>
        </div>
      </div>
    </div>
  );
}
