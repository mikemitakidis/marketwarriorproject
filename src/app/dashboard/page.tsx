'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface UserData {
  full_name: string
  email: string
  has_paid: boolean
  challenge_start_date: string
  current_day: number
  completed_days: number[]
  quiz_scores: Record<string, number>
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState<{hours: number, minutes: number, seconds: number} | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const quotes = [
    '"The stock market is filled with individuals who know the price of everything, but the value of nothing." — Phillip Fisher',
    '"Risk comes from not knowing what you\'re doing." — Warren Buffett',
    '"The four most dangerous words in investing are: This time it\'s different." — Sir John Templeton',
    '"In investing, what is comfortable is rarely profitable." — Robert Arnott',
    '"The goal of a successful trader is to make the best trades. Money is secondary." — Alexander Elder',
    '"Successful investing takes time, discipline and patience." — Warren Buffett',
    '"The market is a device for transferring money from the impatient to the patient." — Warren Buffett'
  ]

  const [quote] = useState(quotes[Math.floor(Math.random() * quotes.length)])

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (!user) return
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [user])

  const loadUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (!data || !data.has_paid) {
      router.push('/login')
      return
    }

    if (!data.agreed_to_terms) {
      router.push('/welcome')
      return
    }

    setUser({
      full_name: data.full_name || 'Warrior',
      email: session.user.email || '',
      has_paid: data.has_paid,
      challenge_start_date: data.challenge_start_date,
      current_day: data.current_day || 1,
      completed_days: data.completed_days || [],
      quiz_scores: data.quiz_scores || {}
    })
    setLoading(false)
  }

  const updateCountdown = () => {
    if (!user) return
    const start = new Date(user.challenge_start_date).getTime()
    const now = Date.now()
    const daysPassed = Math.floor((now - start) / (24 * 60 * 60 * 1000))
    const nextUnlock = start + (daysPassed + 1) * 24 * 60 * 60 * 1000
    const timeLeft = nextUnlock - now

    if (timeLeft <= 0 || user.completed_days.length >= 30) {
      setCountdown(null)
      return
    }

    setCountdown({
      hours: Math.floor(timeLeft / 3600000),
      minutes: Math.floor((timeLeft % 3600000) / 60000),
      seconds: Math.floor((timeLeft % 60000) / 1000)
    })
  }

  const getMaxUnlockedDay = () => {
    if (!user) return 1
    const start = new Date(user.challenge_start_date).getTime()
    const daysPassed = Math.floor((Date.now() - start) / (24 * 60 * 60 * 1000))
    return Math.min(daysPassed + 1, 30)
  }

  const isDayUnlocked = (day: number) => {
    if (!user) return false
    if (day === 1) return true
    if (day > getMaxUnlockedDay()) return false
    // Check if previous day quiz passed
    const prevScore = user.quiz_scores[`day${day-1}`]
    return prevScore !== undefined && prevScore >= 60
  }

  const getCompletionPercentage = () => {
    if (!user) return 0
    return Math.round((user.completed_days.length / 30) * 100)
  }

  const getAvgQuizScore = () => {
    if (!user) return 0
    const scores = Object.values(user.quiz_scores)
    if (scores.length === 0) return 0
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }

  const logout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await supabase.auth.signOut()
      router.push('/login')
    }
  }

  const goToDay = (day: number) => {
    if (isDayUnlocked(day)) {
      router.push(`/days/${day}`)
    } else {
      alert(`Day ${day} is locked. Complete previous days first.`)
    }
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading...</div>
  }

  const phases = {
    phase1: [1, 2, 3, 4, 5, 6, 7],
    phase2: [8, 9, 10, 11, 12, 13, 14],
    phase3: [15, 16, 17, 18, 19, 20, 21],
    phase4: [22, 23, 24, 25, 26, 27, 28],
    phase5: [29, 30]
  }

  const phaseLabels: Record<string, { title: string; badge: string }> = {
    phase1: { title: '📚 Phase 1: Trading Foundations', badge: 'Days 1-7' },
    phase2: { title: '📊 Phase 2: Technical Analysis', badge: 'Days 8-14' },
    phase3: { title: '🎯 Phase 3: Advanced Strategies', badge: 'Days 15-21' },
    phase4: { title: '💼 Phase 4: Portfolio Management', badge: 'Days 22-28' },
    phase5: { title: '🎓 Phase 5: Assessment & Graduation', badge: 'Days 29-30' }
  }

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          min-height: 100vh;
          color: #f1f5f9;
        }
        .header {
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(10px);
          padding: 15px 30px;
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 1000;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }
        .logo img {
          width: 45px;
          height: 45px;
          border-radius: 10px;
        }
        .logo h1 {
          font-size: 1.4em;
          color: white;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .user-details { text-align: right; }
        .user-name { font-weight: 600; color: white; }
        .user-status { font-size: 0.8em; color: #10b981; }
        .user-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 1.1em;
          border: 2px solid rgba(255,255,255,0.2);
        }
        .btn-logout {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
        }
        .btn-logout:hover { background: rgba(239, 68, 68, 0.25); }
        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 100px 20px 40px;
        }
        .welcome-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
          border-radius: 24px;
          padding: 40px;
          margin-bottom: 30px;
          position: relative;
          overflow: hidden;
        }
        .welcome-content {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 30px;
        }
        .welcome-text h2 {
          font-size: 2.2em;
          margin-bottom: 10px;
        }
        .welcome-text p { font-size: 1.1em; opacity: 0.95; }
        .welcome-text .motivational {
          margin-top: 15px;
          font-style: italic;
          opacity: 0.85;
          font-size: 0.95em;
        }
        .countdown-box {
          background: rgba(255,255,255,0.2);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 25px 35px;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.3);
        }
        .countdown-label { font-size: 0.9em; opacity: 0.9; margin-bottom: 8px; }
        .countdown-time {
          font-size: 2.2em;
          font-weight: 700;
          font-family: 'SF Mono', Monaco, monospace;
          letter-spacing: 2px;
        }
        .countdown-note { font-size: 0.8em; opacity: 0.8; margin-top: 8px; }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 25px;
          text-align: center;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          background: linear-gradient(90deg, #667eea, #764ba2);
        }
        .stat-card.green::before { background: linear-gradient(90deg, #10b981, #059669); }
        .stat-card.orange::before { background: linear-gradient(90deg, #f59e0b, #d97706); }
        .stat-card.blue::before { background: linear-gradient(90deg, #3b82f6, #2563eb); }
        .stat-card:hover {
          transform: translateY(-5px);
          border-color: rgba(255,255,255,0.2);
          box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        }
        .stat-icon { font-size: 2em; margin-bottom: 15px; }
        .stat-value {
          font-size: 2.8em;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .stat-card.green .stat-value {
          background: linear-gradient(135deg, #10b981, #059669);
          -webkit-background-clip: text;
          background-clip: text;
        }
        .stat-card.orange .stat-value {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          -webkit-background-clip: text;
          background-clip: text;
        }
        .stat-card.blue .stat-value {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          -webkit-background-clip: text;
          background-clip: text;
        }
        .stat-label {
          color: #94a3b8;
          font-size: 0.9em;
          margin-top: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .quick-actions {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }
        .action-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 30px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          text-decoration: none;
          color: inherit;
        }
        .action-card:hover {
          background: rgba(255,255,255,0.1);
          transform: translateY(-5px);
          border-color: #667eea;
        }
        .action-card.primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
        }
        .action-card.primary:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(102, 126, 234, 0.4);
        }
        .action-icon { font-size: 2.5em; margin-bottom: 15px; }
        .action-card h3 { font-size: 1.1em; margin-bottom: 8px; color: white; }
        .action-card p { font-size: 0.85em; color: #94a3b8; }
        .action-card.primary p { color: rgba(255,255,255,0.8); }
        .progress-section {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 35px;
          margin-bottom: 30px;
        }
        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }
        .progress-header h2 {
          font-size: 1.5em;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .progress-percentage { font-size: 1.8em; font-weight: 700; color: #667eea; }
        .overall-progress { margin-bottom: 30px; }
        .progress-bar-container {
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
          height: 24px;
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2, #f093fb);
          border-radius: 12px;
          transition: width 0.8s ease;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 15px;
          font-weight: 700;
          font-size: 0.85em;
          min-width: 60px;
        }
        .days-section h3 {
          font-size: 1.2em;
          margin-bottom: 20px;
          color: #e2e8f0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .phase-badge {
          background: rgba(102, 126, 234, 0.2);
          color: #667eea;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75em;
          font-weight: 600;
        }
        .days-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
          gap: 12px;
          margin-bottom: 30px;
        }
        .day-circle {
          width: 65px;
          height: 65px;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s;
          background: rgba(255,255,255,0.05);
          border: 2px solid rgba(255,255,255,0.1);
          margin: 0 auto;
        }
        .day-circle:hover:not(.locked) { transform: scale(1.1); }
        .day-circle.completed {
          background: linear-gradient(135deg, #10b981, #059669);
          border-color: #10b981;
          box-shadow: 0 5px 20px rgba(16, 185, 129, 0.3);
        }
        .day-circle.current {
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-color: #667eea;
          box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4); }
          50% { box-shadow: 0 5px 30px rgba(102, 126, 234, 0.6); }
        }
        .day-circle.locked { opacity: 0.4; cursor: not-allowed; }
        .day-number { font-weight: 700; font-size: 1.1em; }
        .day-status { font-size: 0.7em; margin-top: 2px; }
        .certificate-section {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1));
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 20px;
          padding: 40px;
          text-align: center;
          display: none;
        }
        .certificate-section.show { display: block; }
        .certificate-section h2 { color: #10b981; font-size: 1.8em; margin-bottom: 15px; }
        .certificate-section p { color: #94a3b8; margin-bottom: 25px; }
        .btn-certificate {
          display: inline-block;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          text-decoration: none;
          padding: 15px 40px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1.1em;
          transition: all 0.3s;
        }
        .btn-certificate:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 40px rgba(16, 185, 129, 0.4);
        }
        @media (max-width: 1200px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .quick-actions { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .header { padding: 12px 15px; }
          .user-details { display: none; }
          .container { padding: 90px 15px 30px; }
          .welcome-section { padding: 25px; }
          .welcome-text h2 { font-size: 1.5em; }
          .stats-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
          .stat-card { padding: 20px 15px; }
          .stat-value { font-size: 2em; }
          .quick-actions { grid-template-columns: 1fr 1fr; gap: 12px; }
          .days-grid { grid-template-columns: repeat(5, 1fr); gap: 8px; }
          .day-circle { width: 50px; height: 50px; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr; }
          .quick-actions { grid-template-columns: 1fr; }
        }
      `}</style>

      <header className="header">
        <a href="/dashboard" className="logo">
          <img src="/logo.png" alt="Market Warrior" />
          <h1>Market Warrior</h1>
        </a>
        <div className="header-right">
          <div className="user-info">
            <div className="user-details">
              <div className="user-name">{user?.full_name}</div>
              <div className="user-status">● Active Warrior</div>
            </div>
            <div className="user-avatar">{user?.full_name?.charAt(0).toUpperCase()}</div>
          </div>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="container">
        <div className="welcome-section">
          <div className="welcome-content">
            <div className="welcome-text">
              <h2>Welcome back, {user?.full_name?.split(' ')[0]}! 🔥</h2>
              <p>Your journey to becoming a confident trader continues.</p>
              <p className="motivational">{quote}</p>
            </div>
            {countdown && (
              <div className="countdown-box">
                <div className="countdown-label">⏱️ Next Day Unlocks In</div>
                <div className="countdown-time">
                  {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
                </div>
                <div className="countdown-note">Complete today&apos;s quiz to progress!</div>
              </div>
            )}
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-value">{Math.min(getMaxUnlockedDay(), 30)}</div>
            <div className="stat-label">Current Day</div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{user?.completed_days.length || 0}</div>
            <div className="stat-label">Days Completed</div>
          </div>
          <div className="stat-card orange">
            <div className="stat-icon">📊</div>
            <div className="stat-value">{getAvgQuizScore()}%</div>
            <div className="stat-label">Avg Quiz Score</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-icon">🏆</div>
            <div className="stat-value">{getCompletionPercentage()}%</div>
            <div className="stat-label">Overall Progress</div>
          </div>
        </div>

        <div className="quick-actions">
          <a href={`/days/${Math.min((user?.completed_days.length || 0) + 1, 30)}`} className="action-card primary">
            <div className="action-icon">▶️</div>
            <h3>Continue Learning</h3>
            <p>Pick up where you left off</p>
          </a>
          <a href="/journal" className="action-card">
            <div className="action-icon">📝</div>
            <h3>Trading Journal</h3>
            <p>Track your trades & progress</p>
          </a>
          <a href="/community" className="action-card">
            <div className="action-icon">💬</div>
            <h3>Community</h3>
            <p>Connect with fellow traders</p>
          </a>
          <a href="/dashboard" className="action-card">
            <div className="action-icon">🤝</div>
            <h3>Refer & Earn</h3>
            <p>Get 30% commission</p>
          </a>
        </div>

        <div className="progress-section">
          <div className="progress-header">
            <h2>📈 Your Challenge Progress</h2>
            <div className="progress-percentage">{getCompletionPercentage()}%</div>
          </div>
          <div className="overall-progress">
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${getCompletionPercentage()}%` }}>
                {getCompletionPercentage()}%
              </div>
            </div>
          </div>

          {Object.entries(phases).map(([phaseId, days]) => (
            <div className="days-section" key={phaseId}>
              <h3>{phaseLabels[phaseId].title} <span className="phase-badge">{phaseLabels[phaseId].badge}</span></h3>
              <div className="days-grid">
                {days.map(day => {
                  const isCompleted = user?.completed_days.includes(day)
                  const isUnlocked = isDayUnlocked(day)
                  const isCurrent = isUnlocked && !isCompleted

                  let statusClass = 'locked'
                  let statusText = '🔒'

                  if (isCompleted) {
                    statusClass = 'completed'
                    statusText = '✓'
                  } else if (isCurrent) {
                    statusClass = 'current'
                    statusText = '▶'
                  }

                  return (
                    <div key={day} className={`day-circle ${statusClass}`} onClick={() => goToDay(day)}>
                      <span className="day-number">{day}</span>
                      <span className="day-status">{statusText}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {user && user.completed_days.length >= 30 && (
          <div className="certificate-section show">
            <h2>🎉 Congratulations, Market Warrior!</h2>
            <p>You&apos;ve successfully completed the 30-Day Trading Challenge! Download your certificate below.</p>
            <a href="/certificate" className="btn-certificate">🎓 View Your Certificate</a>
          </div>
        )}
      </div>
    </>
  )
}
