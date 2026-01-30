import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import JournalLayout from '../../components/journal/JournalLayout';
import { getUserFromRequest, getServiceSupabase } from '../../lib/serverAuth';

const SUPPORT_URL = 'https://buy.stripe.com/8x23cp0kU9gm7m65aKdAk03';

export default function AICoachPage({ user, settings, hasAccess, stats }) {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [weeklyReview, setWeeklyReview] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch('/api/journal/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage, mode: 'chat' }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          stats: data.stats,
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'error',
          content: data.message || data.error || 'Failed to get response',
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'error',
        content: 'Network error. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getWeeklyReview = async () => {
    setLoadingReview(true);
    try {
      const res = await fetch('/api/journal/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'weekly_review' }),
      });

      const data = await res.json();
      if (res.ok) {
        setWeeklyReview(data.response);
      }
    } catch (err) {
      console.error('Failed to get weekly review:', err);
    } finally {
      setLoadingReview(false);
    }
  };

  const suggestedQuestions = [
    "What patterns do you see in my losing trades?",
    "Am I revenge trading? How can I stop?",
    "Which setups are my most profitable?",
    "How can I improve my risk management?",
    "What should I focus on this week?",
  ];

  if (!hasAccess) {
    return (
      <JournalLayout user={user} title="AI Trading Coach" settings={settings}>
        <style jsx>{`
          .locked-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            text-align: center;
            padding: 40px;
          }
          .lock-icon {
            font-size: 4rem;
            margin-bottom: 24px;
          }
          h1 {
            font-size: 2rem;
            margin-bottom: 16px;
            color: white;
          }
          .description {
            color: rgba(255, 255, 255, 0.7);
            font-size: 1.1rem;
            max-width: 500px;
            margin-bottom: 32px;
            line-height: 1.6;
          }
          .support-btn {
            display: inline-block;
            padding: 16px 32px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 1.1rem;
            transition: all 0.2s;
          }
          .support-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
          }
          .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-top: 48px;
            max-width: 600px;
          }
          .feature {
            background: rgba(255, 255, 255, 0.05);
            padding: 20px;
            border-radius: 12px;
            text-align: left;
          }
          .feature-icon {
            font-size: 1.5rem;
            margin-bottom: 8px;
          }
          .feature-title {
            color: white;
            font-weight: 600;
            margin-bottom: 4px;
          }
          .feature-desc {
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.85rem;
          }
        `}</style>

        <div className="locked-container">
          <div className="lock-icon">🔒</div>
          <h1>AI Trading Coach</h1>
          <p className="description">
            Get personalized AI coaching powered by Google Gemini. Unlock insights about your trading patterns,
            behavioral analysis, and weekly performance reviews.
          </p>
          <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="support-btn">
            ❤️ Support to Unlock
          </a>

          <div className="features">
            <div className="feature">
              <div className="feature-icon">💬</div>
              <div className="feature-title">Chat with AI</div>
              <div className="feature-desc">Ask questions about your trading</div>
            </div>
            <div className="feature">
              <div className="feature-icon">📊</div>
              <div className="feature-title">Weekly Reviews</div>
              <div className="feature-desc">Automated performance analysis</div>
            </div>
            <div className="feature">
              <div className="feature-icon">🎯</div>
              <div className="feature-title">Pattern Detection</div>
              <div className="feature-desc">Find your strengths & weaknesses</div>
            </div>
            <div className="feature">
              <div className="feature-icon">🧠</div>
              <div className="feature-title">Behavioral Coaching</div>
              <div className="feature-desc">Improve discipline & mindset</div>
            </div>
          </div>
        </div>
      </JournalLayout>
    );
  }

  return (
    <JournalLayout user={user} title="AI Trading Coach" settings={settings}>
      <style jsx>{`
        .coach-container {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 24px;
          height: calc(100vh - 120px);
        }
        @media (max-width: 1024px) {
          .coach-container {
            grid-template-columns: 1fr;
            height: auto;
          }
        }
        .chat-section {
          display: flex;
          flex-direction: column;
          background: rgba(30, 41, 59, 0.6);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
        }
        .chat-header {
          padding: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .coach-avatar {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }
        .coach-info h2 {
          color: white;
          font-size: 1.1rem;
          margin-bottom: 4px;
        }
        .coach-status {
          color: #10b981;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .coach-status::before {
          content: '';
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
        }
        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .message {
          max-width: 80%;
          padding: 14px 18px;
          border-radius: 16px;
          line-height: 1.5;
        }
        .message.user {
          align-self: flex-end;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border-bottom-right-radius: 4px;
        }
        .message.assistant {
          align-self: flex-start;
          background: rgba(255, 255, 255, 0.1);
          color: #e0e0e0;
          border-bottom-left-radius: 4px;
        }
        .message.error {
          align-self: flex-start;
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .message-content {
          white-space: pre-wrap;
        }
        .welcome {
          text-align: center;
          padding: 40px 20px;
          color: rgba(255, 255, 255, 0.6);
        }
        .welcome h3 {
          color: white;
          margin-bottom: 12px;
          font-size: 1.2rem;
        }
        .suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 20px;
          justify-content: center;
        }
        .suggestion {
          padding: 8px 14px;
          background: rgba(102, 126, 234, 0.2);
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 20px;
          color: #a5b4fc;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .suggestion:hover {
          background: rgba(102, 126, 234, 0.3);
          color: white;
        }
        .chat-input {
          padding: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .input-form {
          display: flex;
          gap: 12px;
        }
        .input-field {
          flex: 1;
          padding: 14px 18px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          font-size: 1rem;
          outline: none;
        }
        .input-field:focus {
          border-color: #667eea;
        }
        .send-btn {
          padding: 14px 24px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .send-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .sidebar-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .stats-card {
          background: rgba(30, 41, 59, 0.6);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px;
        }
        .stats-card h3 {
          color: white;
          font-size: 1rem;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .stat-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .stat {
          background: rgba(255, 255, 255, 0.05);
          padding: 12px;
          border-radius: 8px;
        }
        .stat-label {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.75rem;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .stat-value {
          color: white;
          font-size: 1.1rem;
          font-weight: 600;
        }
        .stat-value.positive { color: #10b981; }
        .stat-value.negative { color: #ef4444; }
        .review-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .review-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }
        .review-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .weekly-review {
          background: rgba(30, 41, 59, 0.6);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px;
          max-height: 400px;
          overflow-y: auto;
        }
        .weekly-review h3 {
          color: white;
          font-size: 1rem;
          margin-bottom: 16px;
        }
        .review-content {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .disclaimer {
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: 8px;
          padding: 12px;
          font-size: 0.8rem;
          color: #fcd34d;
        }
        .loading-dots {
          display: flex;
          gap: 4px;
          padding: 8px 0;
        }
        .loading-dots span {
          width: 8px;
          height: 8px;
          background: #667eea;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
        .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>

      <div className="coach-container">
        <div className="chat-section">
          <div className="chat-header">
            <div className="coach-avatar">🤖</div>
            <div className="coach-info">
              <h2>AI Trading Coach</h2>
              <div className="coach-status">Online • Powered by Gemini</div>
            </div>
          </div>

          <div className="messages">
            {messages.length === 0 ? (
              <div className="welcome">
                <h3>Welcome to your AI Trading Coach!</h3>
                <p>Ask me anything about your trading performance, patterns, or psychology.</p>
                <div className="suggestions">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      className="suggestion"
                      onClick={() => setInput(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`message ${msg.role}`}>
                  <div className="message-content">{msg.content}</div>
                </div>
              ))
            )}
            {loading && (
              <div className="message assistant">
                <div className="loading-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input">
            <form onSubmit={sendMessage} className="input-form">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your trading..."
                className="input-field"
                disabled={loading}
              />
              <button type="submit" className="send-btn" disabled={loading || !input.trim()}>
                Send
              </button>
            </form>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="stats-card">
            <h3>📊 Your Stats (Last 50 trades)</h3>
            <div className="stat-grid">
              <div className="stat">
                <div className="stat-label">Win Rate</div>
                <div className="stat-value">{stats?.winRate || 0}%</div>
              </div>
              <div className="stat">
                <div className="stat-label">Profit Factor</div>
                <div className="stat-value">{stats?.profitFactor || 0}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Avg R</div>
                <div className={`stat-value ${(stats?.avgRMultiple || 0) >= 0 ? 'positive' : 'negative'}`}>
                  {(stats?.avgRMultiple || 0).toFixed(2)}R
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Total P&L</div>
                <div className={`stat-value ${(stats?.totalPnl || 0) >= 0 ? 'positive' : 'negative'}`}>
                  ${(stats?.totalPnl || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="stats-card">
            <h3>📅 Weekly Review</h3>
            <button
              onClick={getWeeklyReview}
              className="review-btn"
              disabled={loadingReview}
            >
              {loadingReview ? 'Generating...' : 'Generate Weekly Review'}
            </button>
          </div>

          {weeklyReview && (
            <div className="weekly-review">
              <h3>📋 Your Weekly Review</h3>
              <div className="review-content">{weeklyReview}</div>
            </div>
          )}

          <div className="disclaimer">
            ⚠️ AI coaching is for educational purposes only. Never trade based solely on AI suggestions.
            Always do your own analysis.
          </div>
        </div>
      </div>
    </JournalLayout>
  );
}

export async function getServerSideProps({ req }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return { redirect: { destination: '/login', permanent: false } };
    }

    const supabase = getServiceSupabase();

    // Check supporter status
    const { data: supportPayments } = await supabase
      .from('support_payments')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('has_paid, full_name, acquisition_source')
      .eq('id', user.id)
      .single();

    const isSupporter = (supportPayments && supportPayments.length > 0) || profile?.has_paid;

    // Get settings
    const { data: settings } = await supabase
      .from('journal_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Get basic stats for sidebar
    const { data: trades } = await supabase
      .from('journal_trades')
      .select('pnl_amount, r_multiple')
      .eq('user_id', user.id)
      .eq('status', 'closed')
      .order('exit_date', { ascending: false })
      .limit(50);

    let stats = { winRate: 0, profitFactor: 0, avgRMultiple: 0, totalPnl: 0 };
    if (trades && trades.length > 0) {
      const wins = trades.filter(t => (t.pnl_amount || 0) > 0);
      const grossProfit = wins.reduce((s, t) => s + (t.pnl_amount || 0), 0);
      const grossLoss = Math.abs(trades.filter(t => (t.pnl_amount || 0) < 0).reduce((s, t) => s + (t.pnl_amount || 0), 0));
      stats = {
        winRate: Math.round((wins.length / trades.length) * 100),
        profitFactor: grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : 0,
        avgRMultiple: trades.reduce((s, t) => s + (t.r_multiple || 0), 0) / trades.length,
        totalPnl: Math.round(trades.reduce((s, t) => s + (t.pnl_amount || 0), 0) * 100) / 100,
      };
    }

    return {
      props: {
        user: {
          id: user.id,
          email: user.email,
          fullName: profile?.full_name || null,
          isStudent: profile?.has_paid || false,
        },
        settings: settings || null,
        hasAccess: isSupporter,
        stats,
      },
    };
  } catch (err) {
    console.error('AI Coach page error:', err);
    return { redirect: { destination: '/login', permanent: false } };
  }
}
