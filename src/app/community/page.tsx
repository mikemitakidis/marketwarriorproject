'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function CommunityPage() {
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    setLoading(false)
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading...</div>
  }

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
          color: #e0e0e0;
          min-height: 100vh;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 25px 40px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
        }
        .header h1 { font-size: 28px; color: white; margin: 0 0 5px 0; }
        .header p { font-size: 14px; color: rgba(255, 255, 255, 0.8); margin: 0; }
        .back-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: none;
          padding: 12px 25px;
          border-radius: 25px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
          text-decoration: none;
        }
        .back-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 30px 20px;
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 30px;
        }
        .sidebar h3 {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 15px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .category-list {
          list-style: none;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 15px;
          overflow: hidden;
        }
        .category-list li {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px 20px;
          cursor: pointer;
          transition: all 0.2s;
          border-left: 3px solid transparent;
        }
        .category-list li:hover { background: rgba(255, 255, 255, 0.05); }
        .category-list li.active {
          background: rgba(102, 126, 234, 0.2);
          border-left-color: #667eea;
        }
        .cat-icon { font-size: 20px; }
        .posts-feed { display: flex; flex-direction: column; gap: 20px; }
        .post-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
          transition: all 0.2s;
          padding: 20px;
        }
        .post-card:hover { border-color: rgba(255, 255, 255, 0.15); }
        .post-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
        }
        .author-info { display: flex; gap: 12px; }
        .avatar {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          font-size: 18px;
        }
        .author-name { font-weight: 600; color: white; }
        .admin-badge {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 600;
          margin-left: 8px;
        }
        .post-meta {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 4px;
        }
        .post-title {
          font-size: 18px;
          font-weight: 600;
          color: white;
          margin-bottom: 10px;
        }
        .post-content { color: rgba(255, 255, 255, 0.7); line-height: 1.6; }
        .post-stats {
          display: flex;
          gap: 20px;
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .stat-item {
          display: flex;
          align-items: center;
          gap: 5px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
        }
        .coming-soon {
          text-align: center;
          padding: 60px 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          margin-top: 30px;
        }
        .coming-soon h2 { color: #667eea; margin-bottom: 15px; }
        .coming-soon p { color: rgba(255, 255, 255, 0.7); }
        @media (max-width: 768px) {
          .container { grid-template-columns: 1fr; }
          .sidebar { display: none; }
        }
      `}</style>

      <header className="header">
        <div className="header-content">
          <div>
            <h1>💬 Market Warrior Community</h1>
            <p>Connect with fellow traders and share your journey</p>
          </div>
          <a href="/dashboard" className="back-btn">← Back to Dashboard</a>
        </div>
      </header>

      <div className="container">
        <aside className="sidebar">
          <h3>Categories</h3>
          <ul className="category-list">
            <li className="active"><span className="cat-icon">📢</span> Announcements</li>
            <li><span className="cat-icon">💬</span> General Discussion</li>
            <li><span className="cat-icon">📚</span> Course Questions</li>
            <li><span className="cat-icon">📊</span> Trade Ideas</li>
            <li><span className="cat-icon">🎓</span> Success Stories</li>
            <li><span className="cat-icon">🤝</span> Study Groups</li>
          </ul>
        </aside>

        <main className="posts-feed">
          <div className="post-card">
            <div className="post-header">
              <div className="author-info">
                <div className="avatar">MW</div>
                <div>
                  <div className="author-name">Market Warrior Team<span className="admin-badge">ADMIN</span></div>
                  <div className="post-meta">Posted 2 hours ago • Announcements</div>
                </div>
              </div>
            </div>
            <div className="post-title">🎉 Welcome to the Market Warrior Community!</div>
            <div className="post-content">
              Welcome, Warriors! This is your space to connect with fellow traders, share insights, ask questions, and celebrate wins. Remember: we&apos;re all here to learn and grow together. Be respectful, supportive, and focus on education over tips.
            </div>
            <div className="post-stats">
              <div className="stat-item">❤️ 47 likes</div>
              <div className="stat-item">💬 12 replies</div>
            </div>
          </div>

          <div className="post-card">
            <div className="post-header">
              <div className="author-info">
                <div className="avatar">S</div>
                <div>
                  <div className="author-name">Sarah J.</div>
                  <div className="post-meta">Posted 5 hours ago • Success Stories</div>
                </div>
              </div>
            </div>
            <div className="post-title">Just completed Day 14! 🚀</div>
            <div className="post-content">
              Halfway through the challenge and I can already see such a difference in how I read charts. The RSI and MACD lessons were game-changers for me. Can&apos;t wait to start the advanced strategies next week!
            </div>
            <div className="post-stats">
              <div className="stat-item">❤️ 23 likes</div>
              <div className="stat-item">💬 8 replies</div>
            </div>
          </div>

          <div className="post-card">
            <div className="post-header">
              <div className="author-info">
                <div className="avatar">M</div>
                <div>
                  <div className="author-name">Mike T.</div>
                  <div className="post-meta">Posted 1 day ago • Course Questions</div>
                </div>
              </div>
            </div>
            <div className="post-title">Question about support/resistance levels</div>
            <div className="post-content">
              In Day 9, when drawing support and resistance lines, should I use the wick highs/lows or the candle body? I&apos;ve seen different approaches online and want to make sure I&apos;m practicing correctly.
            </div>
            <div className="post-stats">
              <div className="stat-item">❤️ 15 likes</div>
              <div className="stat-item">💬 6 replies</div>
            </div>
          </div>

          <div className="coming-soon">
            <h2>🚧 Full Community Coming Soon!</h2>
            <p>We&apos;re building an amazing community experience for you. Stay tuned for the full launch with live discussions, study groups, and more!</p>
          </div>
        </main>
      </div>
    </>
  )
}
