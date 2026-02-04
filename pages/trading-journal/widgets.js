import { getJournalUser, getServiceSupabase, checkJournalAccess } from '../../lib/journalAuth';
import JournalLayout from '../../components/journal/JournalLayout';
import { useState } from 'react';

export async function getServerSideProps({ req, res }) {
  try {
    const user = await getJournalUser(req, res);
    if (!user) {
      return { redirect: { destination: '/trading-journal/login', permanent: false } };
    }

    const access = await checkJournalAccess(user);
    if (!access.hasAccess && access.requiresPayment) {
      return { redirect: { destination: '/trading-journal/upgrade', permanent: false } };
    }

    const supabase = getServiceSupabase();
    const { data: settings } = await supabase
      .from('journal_settings')
      .select('*')
      .eq('journal_user_id', user.id)
      .maybeSingle();

    return {
      props: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName || null,
        },
        settings: settings || null,
      },
    };
  } catch (err) {
    return { redirect: { destination: '/trading-journal/login', permanent: false } };
  }
}

export default function WidgetsPage({ user, settings }) {
  const [copiedWidget, setCopiedWidget] = useState(null);

  const widgets = [
    {
      id: 'market-clock',
      name: 'Market Session Clock',
      description: 'Shows current market sessions (London, New York, Tokyo, Sydney) with real-time countdown',
      preview: '🕐',
      embedCode: `<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/widgets/market-clock" width="400" height="200" frameborder="0"></iframe>`,
    },
    {
      id: 'economic-calendar',
      name: 'Economic Calendar Widget',
      description: 'Upcoming high-impact economic events with countdown timers',
      preview: '📅',
      embedCode: `<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/widgets/economic-calendar" width="400" height="300" frameborder="0"></iframe>`,
    },
    {
      id: 'risk-calculator',
      name: 'Quick Risk Calculator',
      description: 'Embeddable position size calculator for your trading desk',
      preview: '🧮',
      embedCode: `<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/widgets/risk-calculator" width="350" height="400" frameborder="0"></iframe>`,
    },
    {
      id: 'trading-checklist',
      name: 'Pre-Trade Checklist',
      description: 'Daily checklist widget to ensure you follow your trading rules',
      preview: '✅',
      embedCode: `<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/widgets/checklist" width="300" height="350" frameborder="0"></iframe>`,
    },
  ];

  const copyToClipboard = (code, widgetId) => {
    navigator.clipboard.writeText(code);
    setCopiedWidget(widgetId);
    setTimeout(() => setCopiedWidget(null), 2000);
  };

  return (
    <JournalLayout user={user} title="Widgets" settings={settings}>
      <style jsx>{`
        .page-header {
          margin-bottom: 30px;
        }
        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
          margin-bottom: 8px;
        }
        .page-desc {
          color: rgba(255, 255, 255, 0.6);
        }
        .widgets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 24px;
        }
        .widget-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 24px;
          transition: all 0.2s;
        }
        .widget-card:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
        }
        .widget-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .widget-icon {
          width: 50px;
          height: 50px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .widget-name {
          color: white;
          font-size: 1.1rem;
          font-weight: 600;
        }
        .widget-desc {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .widget-code {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 12px;
          font-family: monospace;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.7);
          overflow-x: auto;
          margin-bottom: 12px;
          white-space: nowrap;
        }
        .copy-btn {
          width: 100%;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: white;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        .copy-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .copy-btn.copied {
          background: rgba(74, 222, 128, 0.2);
          border-color: rgba(74, 222, 128, 0.3);
          color: #4ade80;
        }
        .coming-soon {
          text-align: center;
          padding: 60px 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px dashed rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          margin-top: 30px;
        }
        .coming-soon-icon {
          font-size: 3rem;
          margin-bottom: 16px;
        }
        .coming-soon h3 {
          color: white;
          margin-bottom: 8px;
        }
        .coming-soon p {
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">Widgets</h1>
        <p className="page-desc">Embeddable widgets for your trading workspace</p>
      </div>

      <div className="widgets-grid">
        {widgets.map((widget) => (
          <div key={widget.id} className="widget-card">
            <div className="widget-header">
              <div className="widget-icon">{widget.preview}</div>
              <div className="widget-name">{widget.name}</div>
            </div>
            <p className="widget-desc">{widget.description}</p>
            <div className="widget-code">{widget.embedCode}</div>
            <button
              className={`copy-btn ${copiedWidget === widget.id ? 'copied' : ''}`}
              onClick={() => copyToClipboard(widget.embedCode, widget.id)}
            >
              {copiedWidget === widget.id ? 'Copied!' : 'Copy Embed Code'}
            </button>
          </div>
        ))}
      </div>

      <div className="coming-soon">
        <div className="coming-soon-icon">🚀</div>
        <h3>More Widgets Coming Soon</h3>
        <p>We're working on ticker tape, news feed, and sentiment widgets</p>
      </div>
    </JournalLayout>
  );
}
