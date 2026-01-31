import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import JournalLayout from '../../components/journal/JournalLayout';
import { getUserFromRequest, getServiceSupabase } from '../../lib/serverAuth';

export default function SharePage({ user, settings }) {
  const [cardType, setCardType] = useState('weekly');
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    fetchCard(cardType);
  }, [cardType]);

  const fetchCard = async (type) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/journal/share-card?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setCardData(data);
      }
    } catch (err) {
      console.error('Failed to fetch card:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCard = async () => {
    if (!cardRef.current) return;

    try {
      // Use html2canvas if available, otherwise copy to clipboard
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
      });

      const link = document.createElement('a');
      link.download = `trading-${cardType}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to download card:', err);
      alert('Unable to download. Try taking a screenshot instead.');
    }
  };

  const copyToClipboard = () => {
    const text = generateShareText(cardData);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const generateShareText = (data) => {
    if (!data || !data.hasData) return '';

    switch (data.type) {
      case 'daily':
        return `📊 Today's Trading Recap\n\n` +
          `Trades: ${data.stats.trades}\n` +
          `Win Rate: ${data.stats.winRate}%\n` +
          `P&L: ${data.stats.pnl >= 0 ? '+' : ''}$${data.stats.pnl}\n` +
          `R-Multiple: ${data.stats.rMultiple >= 0 ? '+' : ''}${data.stats.rMultiple}R\n\n` +
          `#trading #daytrading #tradingjournal`;

      case 'weekly':
        return `📈 Weekly Trading Performance\n\n` +
          `Trades: ${data.stats.trades} (${data.stats.wins}W/${data.stats.losses}L)\n` +
          `Win Rate: ${data.stats.winRate}%\n` +
          `P&L: ${data.stats.pnl >= 0 ? '+' : ''}$${data.stats.pnl}\n` +
          `Profit Factor: ${data.stats.profitFactor}\n\n` +
          `#trading #weeklyreview #tradingjournal`;

      case 'monthly':
        return `📊 Monthly Trading Report\n\n` +
          `Trades: ${data.stats.trades}\n` +
          `Win Rate: ${data.stats.winRate}%\n` +
          `P&L: ${data.stats.pnl >= 0 ? '+' : ''}$${data.stats.pnl}\n` +
          `Avg R: ${data.stats.avgR}R\n\n` +
          `#trading #monthlyreview #tradingjournal`;

      case 'streak':
        return data.stats.isWinStreak
          ? `🔥 ${data.stats.streak} TRADE WIN STREAK! 🔥\n\n#trading #winstreak #tradingjournal`
          : `💪 Pushing through a ${data.stats.streak} trade losing streak. Stay disciplined!\n\n#trading #discipline #tradingjournal`;

      case 'milestone':
        return `🎯 MILESTONE ACHIEVED!\n\n` +
          `${data.stats.totalTrades} trades logged!\n` +
          `Win Rate: ${data.stats.winRate}%\n` +
          `Total P&L: ${data.stats.totalPnl >= 0 ? '+' : ''}$${data.stats.totalPnl}\n\n` +
          `#trading #milestone #tradingjournal`;

      default:
        return '';
    }
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(generateShareText(cardData));
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const cardTypes = [
    { value: 'daily', label: 'Daily', icon: '📅' },
    { value: 'weekly', label: 'Weekly', icon: '📊' },
    { value: 'monthly', label: 'Monthly', icon: '📈' },
    { value: 'streak', label: 'Streak', icon: '🔥' },
    { value: 'milestone', label: 'Milestone', icon: '🎯' },
  ];

  return (
    <JournalLayout user={user} title="Share Performance" settings={settings}>
      <style jsx>{`
        .header {
          text-align: center;
          margin-bottom: 32px;
        }
        h1 {
          color: white;
          font-size: 1.8rem;
          margin-bottom: 8px;
        }
        .subtitle {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.95rem;
        }
        .type-selector {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }
        .type-btn {
          padding: 12px 24px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .type-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .type-btn.active {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3));
          border-color: rgba(102, 126, 234, 0.5);
          color: white;
        }
        .card-container {
          display: flex;
          justify-content: center;
          margin-bottom: 32px;
        }
        .share-card {
          width: 400px;
          min-height: 300px;
          border-radius: 24px;
          padding: 32px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }
        .card-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.2);
          z-index: 1;
        }
        .card-content {
          position: relative;
          z-index: 2;
          color: white;
          text-align: center;
        }
        .card-emoji {
          font-size: 3rem;
          margin-bottom: 16px;
        }
        .card-title {
          font-size: 1.8rem;
          font-weight: 800;
          margin-bottom: 8px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }
        .card-subtitle {
          font-size: 1rem;
          opacity: 0.9;
          margin-bottom: 24px;
        }
        .card-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          text-align: center;
        }
        .card-stat {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 16px;
        }
        .card-stat-value {
          font-size: 1.6rem;
          font-weight: 800;
        }
        .card-stat-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          opacity: 0.8;
          margin-top: 4px;
        }
        .card-footer {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          font-size: 0.75rem;
          opacity: 0.7;
        }
        .card-watermark {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .watermark-logo {
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: #667eea;
          font-weight: bold;
        }
        .actions {
          display: flex;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .action-btn {
          padding: 14px 28px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          border: none;
        }
        .action-btn:hover {
          transform: translateY(-2px);
        }
        .btn-download {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }
        .btn-download:hover {
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
        }
        .btn-copy {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
        }
        .btn-copy:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .btn-twitter {
          background: #1da1f2;
          color: white;
        }
        .btn-twitter:hover {
          box-shadow: 0 4px 16px rgba(29, 161, 242, 0.4);
        }
        .no-data {
          text-align: center;
          padding: 60px 20px;
        }
        .no-data-icon {
          font-size: 3rem;
          margin-bottom: 16px;
        }
        .no-data-text {
          color: rgba(255, 255, 255, 0.6);
          font-size: 1.1rem;
        }
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 300px;
          color: rgba(255, 255, 255, 0.5);
        }
        .tips {
          margin-top: 48px;
          background: rgba(30, 41, 59, 0.6);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 24px;
        }
        .tips-title {
          color: white;
          font-size: 1.1rem;
          margin-bottom: 16px;
        }
        .tips-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 12px;
        }
        .tips-list li {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .streak-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
        }
        .streak-number {
          font-size: 6rem;
          font-weight: 900;
          line-height: 1;
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        .streak-label {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 8px;
        }
      `}</style>

      <div className="header">
        <h1>Share Your Performance</h1>
        <p className="subtitle">Generate beautiful cards to share on social media</p>
      </div>

      <div className="type-selector">
        {cardTypes.map((type) => (
          <button
            key={type.value}
            className={`type-btn ${cardType === type.value ? 'active' : ''}`}
            onClick={() => setCardType(type.value)}
          >
            <span>{type.icon}</span>
            {type.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : !cardData?.hasData ? (
        <div className="no-data">
          <div className="no-data-icon">📭</div>
          <p className="no-data-text">No data available for this period. Start trading to generate cards!</p>
        </div>
      ) : (
        <>
          <div className="card-container">
            <div
              ref={cardRef}
              className="share-card"
              style={{
                background: `linear-gradient(135deg, ${cardData.gradient[0]}, ${cardData.gradient[1]})`,
              }}
            >
              <div className="card-overlay" />
              <div className="card-content">
                {cardData.type === 'streak' ? (
                  <div className="streak-card">
                    <div className="card-emoji">{cardData.emoji}</div>
                    <div className="streak-number">{cardData.stats.streak}</div>
                    <div className="streak-label">{cardData.stats.isWinStreak ? 'Win Streak!' : 'Trade Streak'}</div>
                    <div className="card-subtitle" style={{ marginTop: '16px' }}>{cardData.subtitle}</div>
                  </div>
                ) : cardData.type === 'milestone' ? (
                  <>
                    <div className="card-emoji">{cardData.emoji}</div>
                    <div className="card-title">{cardData.title}</div>
                    <div className="card-subtitle">{cardData.subtitle}</div>
                    <div className="card-stats">
                      <div className="card-stat">
                        <div className="card-stat-value">{cardData.stats.totalTrades}</div>
                        <div className="card-stat-label">Total Trades</div>
                      </div>
                      <div className="card-stat">
                        <div className="card-stat-value">{cardData.stats.winRate}%</div>
                        <div className="card-stat-label">Win Rate</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="card-title">{cardData.title}</div>
                    <div className="card-subtitle">{cardData.subtitle}</div>
                    <div className="card-stats">
                      <div className="card-stat">
                        <div className="card-stat-value">{cardData.stats.trades}</div>
                        <div className="card-stat-label">Trades</div>
                      </div>
                      <div className="card-stat">
                        <div className="card-stat-value">{cardData.stats.winRate}%</div>
                        <div className="card-stat-label">Win Rate</div>
                      </div>
                      <div className="card-stat">
                        <div className="card-stat-value">
                          {cardData.stats.pnl >= 0 ? '+' : ''}${Math.abs(cardData.stats.pnl).toLocaleString()}
                        </div>
                        <div className="card-stat-label">P&L</div>
                      </div>
                      <div className="card-stat">
                        <div className="card-stat-value">
                          {cardData.stats.rMultiple >= 0 ? '+' : ''}{cardData.stats.rMultiple}R
                        </div>
                        <div className="card-stat-label">R-Multiple</div>
                      </div>
                    </div>
                  </>
                )}

                <div className="card-footer">
                  <div className="card-watermark">
                    <span className="watermark-logo">MW</span>
                    Market Warrior Trading Journal
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="actions">
            <button className="action-btn btn-download" onClick={downloadCard}>
              📥 Download Image
            </button>
            <button className="action-btn btn-copy" onClick={copyToClipboard}>
              {copied ? '✓ Copied!' : '📋 Copy Text'}
            </button>
            <button className="action-btn btn-twitter" onClick={shareToTwitter}>
              𝕏 Share on X
            </button>
          </div>
        </>
      )}

      <div className="tips">
        <div className="tips-title">💡 Sharing Tips</div>
        <ul className="tips-list">
          <li>📸 Download the image for best quality on social media</li>
          <li>📝 Copy the text for quick posts with hashtags</li>
          <li>🔄 Generate weekly cards to track progress over time</li>
          <li>🏆 Share milestones to celebrate achievements</li>
          <li>🔥 Streak cards are great for motivation posts</li>
          <li>⚠️ Never share actual dollar amounts if uncomfortable</li>
        </ul>
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

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('has_paid, full_name')
      .eq('id', user.id)
      .single();

    const { data: settings } = await supabase
      .from('journal_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    return {
      props: {
        user: {
          id: user.id,
          email: user.email,
          fullName: profile?.full_name || null,
          isStudent: profile?.has_paid || false,
        },
        settings: settings || null,
      },
    };
  } catch (err) {
    console.error('Share page error:', err);
    return { redirect: { destination: '/login', permanent: false } };
  }
}
