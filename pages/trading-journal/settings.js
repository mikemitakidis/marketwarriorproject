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

    // Get or create settings
    let { data: settings } = await supabase
      .from('journal_settings')
      .select('*')
      .eq('journal_user_id', user.id)
      .maybeSingle();

    if (!settings) {
      const { data: newSettings } = await supabase
        .from('journal_settings')
        .insert({ journal_user_id: user.id })
        .select()
        .single();
      settings = newSettings;
    }

    return {
      props: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName || null,
        },
        initialSettings: settings || {
          account_size: 10000,
          base_currency: 'USD',
          default_risk_percent: 1,
          default_commission: 0,
          trading_sessions: ['London', 'New York', 'Asia'],
          show_r_multiples: true,
          show_dollar_amounts: true,
        },
      },
    };
  } catch (err) {
    return { redirect: { destination: '/trading-journal/login', permanent: false } };
  }
}

export default function SettingsPage({ user, initialSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [sessionInput, setSessionInput] = useState('');

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleAddSession = () => {
    if (!sessionInput.trim()) return;
    const sessions = [...(settings.trading_sessions || []), sessionInput.trim()];
    setSettings({ ...settings, trading_sessions: sessions });
    setSessionInput('');
  };

  const handleRemoveSession = (index) => {
    const sessions = settings.trading_sessions.filter((_, i) => i !== index);
    setSettings({ ...settings, trading_sessions: sessions });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/journal/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setMessage('Settings saved successfully!');
      } else {
        const data = await res.json();
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage('Error saving settings');
    }

    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <JournalLayout user={user} title="Settings" settings={settings}>
      <style jsx>{`
        .page-header {
          margin-bottom: 24px;
        }
        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
        }
        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
        }
        .section {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 24px;
        }
        .section-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #667eea;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-label {
          display: block;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 8px;
        }
        .form-hint {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 4px;
        }
        .form-input, .form-select {
          width: 100%;
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: white;
          font-size: 0.95rem;
        }
        .form-input:focus, .form-select:focus {
          outline: none;
          border-color: #667eea;
        }
        .form-select option {
          background: #1e293b;
        }
        .toggle-group {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .toggle-group:last-child {
          border-bottom: none;
        }
        .toggle-label {
          color: white;
        }
        .toggle-desc {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 4px;
        }
        .toggle-switch {
          position: relative;
          width: 50px;
          height: 26px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 13px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .toggle-switch.active {
          background: #667eea;
        }
        .toggle-switch::after {
          content: '';
          position: absolute;
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: all 0.3s;
        }
        .toggle-switch.active::after {
          left: 27px;
        }
        .sessions-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        .session-tag {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(102, 126, 234, 0.2);
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 20px;
          color: #667eea;
          font-size: 0.85rem;
        }
        .session-remove {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          padding: 0;
          font-size: 1rem;
        }
        .session-remove:hover {
          color: #f87171;
        }
        .add-session {
          display: flex;
          gap: 8px;
        }
        .add-session input {
          flex: 1;
        }
        .add-btn {
          padding: 12px 20px;
          background: rgba(102, 126, 234, 0.2);
          color: #667eea;
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        }
        .add-btn:hover {
          background: rgba(102, 126, 234, 0.3);
        }
        .save-section {
          margin-top: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .save-btn {
          padding: 14px 32px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .save-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .message {
          padding: 10px 16px;
          border-radius: 6px;
          font-size: 0.9rem;
        }
        .message.success {
          background: rgba(74, 222, 128, 0.2);
          color: #4ade80;
        }
        .message.error {
          background: rgba(248, 113, 113, 0.2);
          color: #f87171;
        }
        @media (max-width: 768px) {
          .settings-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">Journal Settings</h1>
      </div>

      <div className="settings-grid">
        {/* Account Settings */}
        <div className="section">
          <div className="section-title">💰 Account Settings</div>

          <div className="form-group">
            <label className="form-label">Account Size</label>
            <input
              type="number"
              className="form-input"
              value={settings.account_size}
              onChange={(e) => handleChange('account_size', parseFloat(e.target.value) || 0)}
            />
            <p className="form-hint">Your trading account balance for position sizing calculations</p>
          </div>

          <div className="form-group">
            <label className="form-label">Base Currency</label>
            <select
              className="form-select"
              value={settings.base_currency}
              onChange={(e) => handleChange('base_currency', e.target.value)}
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="AUD">AUD - Australian Dollar</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="NZD">NZD - New Zealand Dollar</option>
              <option value="CHF">CHF - Swiss Franc</option>
              <option value="JPY">JPY - Japanese Yen</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Default Risk Per Trade (%)</label>
            <input
              type="number"
              step="0.1"
              className="form-input"
              value={settings.default_risk_percent}
              onChange={(e) => handleChange('default_risk_percent', parseFloat(e.target.value) || 0)}
            />
            <p className="form-hint">Default percentage of account to risk on each trade</p>
          </div>

          <div className="form-group">
            <label className="form-label">Default Commission/Fees</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={settings.default_commission}
              onChange={(e) => handleChange('default_commission', parseFloat(e.target.value) || 0)}
            />
            <p className="form-hint">Default commission per trade (can be overridden)</p>
          </div>
        </div>

        {/* Trading Sessions */}
        <div className="section">
          <div className="section-title">🕐 Trading Sessions</div>
          <p className="form-hint" style={{ marginBottom: '16px' }}>
            Define your trading sessions for tagging trades
          </p>

          <div className="sessions-list">
            {(settings.trading_sessions || []).map((session, index) => (
              <div key={index} className="session-tag">
                {session}
                <button className="session-remove" onClick={() => handleRemoveSession(index)}>
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="add-session">
            <input
              type="text"
              className="form-input"
              placeholder="Add session (e.g., Pre-Market)"
              value={sessionInput}
              onChange={(e) => setSessionInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddSession()}
            />
            <button className="add-btn" onClick={handleAddSession}>Add</button>
          </div>
        </div>

        {/* Display Preferences */}
        <div className="section">
          <div className="section-title">👁️ Display Preferences</div>

          <div className="toggle-group">
            <div>
              <div className="toggle-label">Show R-Multiples</div>
              <div className="toggle-desc">Display trade performance in risk units</div>
            </div>
            <div
              className={`toggle-switch ${settings.show_r_multiples ? 'active' : ''}`}
              onClick={() => handleChange('show_r_multiples', !settings.show_r_multiples)}
            />
          </div>

          <div className="toggle-group">
            <div>
              <div className="toggle-label">Show Dollar Amounts</div>
              <div className="toggle-desc">Display actual P&L in your currency</div>
            </div>
            <div
              className={`toggle-switch ${settings.show_dollar_amounts ? 'active' : ''}`}
              onClick={() => handleChange('show_dollar_amounts', !settings.show_dollar_amounts)}
            />
          </div>
        </div>
      </div>

      <div className="save-section">
        <button className="save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </div>
    </JournalLayout>
  );
}
