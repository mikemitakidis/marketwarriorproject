import { getJournalUser, getServiceSupabase, checkJournalAccess } from '../../lib/journalAuth';
import JournalLayout from '../../components/journal/JournalLayout';
import { useState, useEffect } from 'react';

export async function getServerSideProps({ req }) {
  try {
    const user = await getJournalUser(req);
    if (!user) {
      return { redirect: { destination: '/trading-journal/login', permanent: false } };
    }

    const access = await checkJournalAccess(user);
    if (!access.hasAccess && access.paymentLink) {
      return { redirect: { destination: access.paymentLink, permanent: false } };
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

const RULE_TYPES = [
  { id: 'max_daily_loss', label: 'Max Daily Loss ($)', valueKey: 'amount', placeholder: '500' },
  { id: 'max_daily_loss_pct', label: 'Max Daily Loss (%)', valueKey: 'percent', placeholder: '2' },
  { id: 'max_trades_per_day', label: 'Max Trades Per Day', valueKey: 'count', placeholder: '5' },
  { id: 'max_risk_per_trade', label: 'Max Risk Per Trade (%)', valueKey: 'percent', placeholder: '1' },
  { id: 'required_stop_loss', label: 'Require Stop Loss', valueKey: 'required', isBoolean: true },
  { id: 'min_rr_ratio', label: 'Min Risk:Reward Ratio', valueKey: 'ratio', placeholder: '1.5' },
];

export default function ChallengePage({ user, settings }) {
  const [rules, setRules] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState({ rule_type: 'max_daily_loss', value: '' });
  const [todayReport, setTodayReport] = useState(null);
  const [reportForm, setReportForm] = useState({
    discipline_score: null,
    followed_plan: null,
    stayed_within_risk: null,
    journaled_all_trades: null,
    lessons_learned: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rulesRes, reportRes] = await Promise.all([
        fetch('/api/journal/rules'),
        fetch('/api/journal/daily-report'),
      ]);

      const rulesData = await rulesRes.json();
      const reportData = await reportRes.json();

      if (rulesRes.ok) {
        setRules(rulesData.rules || []);
        setViolations(rulesData.recentViolations || []);
      }

      if (reportRes.ok) {
        setTodayReport(reportData.report);
        if (reportData.report) {
          setReportForm({
            discipline_score: reportData.report.discipline_score,
            followed_plan: reportData.report.followed_plan,
            stayed_within_risk: reportData.report.stayed_within_risk,
            journaled_all_trades: reportData.report.journaled_all_trades,
            lessons_learned: reportData.report.lessons_learned || '',
          });
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
    setLoading(false);
  };

  const handleAddRule = async () => {
    const ruleType = RULE_TYPES.find((r) => r.id === newRule.rule_type);
    if (!ruleType) return;

    const ruleValue = ruleType.isBoolean
      ? { [ruleType.valueKey]: true }
      : { [ruleType.valueKey]: parseFloat(newRule.value) };

    try {
      const res = await fetch('/api/journal/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule_type: newRule.rule_type,
          rule_value: ruleValue,
        }),
      });

      if (res.ok) {
        setShowAddRule(false);
        setNewRule({ rule_type: 'max_daily_loss', value: '' });
        fetchData();
      }
    } catch (err) {
      console.error('Error adding rule:', err);
    }
  };

  const handleDeleteRule = async (id) => {
    if (!confirm('Delete this rule?')) return;

    try {
      const res = await fetch(`/api/journal/rules?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error deleting rule:', err);
    }
  };

  const handleToggleRule = async (rule) => {
    try {
      const res = await fetch(`/api/journal/rules?id=${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !rule.is_active }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error toggling rule:', err);
    }
  };

  const handleSaveReport = async () => {
    try {
      const res = await fetch('/api/journal/daily-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportForm),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error saving report:', err);
    }
  };

  const getRuleLabel = (rule) => {
    const type = RULE_TYPES.find((r) => r.id === rule.rule_type);
    if (!type) return rule.rule_type;

    const value = rule.rule_value[type.valueKey];
    if (type.isBoolean) return type.label;
    if (type.valueKey === 'amount') return `${type.label}: $${value}`;
    if (type.valueKey === 'percent') return `${type.label}: ${value}%`;
    if (type.valueKey === 'count') return `${type.label}: ${value}`;
    if (type.valueKey === 'ratio') return `${type.label}: 1:${value}`;
    return `${type.label}: ${value}`;
  };

  return (
    <JournalLayout user={user} title="Challenge Tracker" settings={settings}>
      <style jsx>{`
        .page-header {
          margin-bottom: 24px;
        }
        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .section {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 24px;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .section-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #667eea;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .add-btn {
          padding: 8px 16px;
          background: rgba(102, 126, 234, 0.2);
          color: #667eea;
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
        }
        .add-btn:hover {
          background: rgba(102, 126, 234, 0.3);
        }
        .rules-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .rule-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .rule-item.inactive {
          opacity: 0.5;
        }
        .rule-label {
          color: white;
          font-weight: 500;
        }
        .rule-actions {
          display: flex;
          gap: 8px;
        }
        .toggle-btn {
          padding: 6px 12px;
          background: rgba(74, 222, 128, 0.2);
          color: #4ade80;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.75rem;
        }
        .toggle-btn.off {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }
        .delete-btn {
          padding: 6px 12px;
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.75rem;
        }
        .add-rule-form {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 12px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          margin-top: 16px;
        }
        .form-input, .form-select {
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          color: white;
          font-size: 0.9rem;
        }
        .form-select option {
          background: #1e293b;
        }
        .submit-btn {
          padding: 10px 20px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }
        .violations-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .violation-item {
          padding: 14px 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
        }
        .violation-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .violation-type {
          color: #f87171;
          font-weight: 600;
        }
        .violation-date {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.8rem;
        }
        .violation-details {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
        }
        .empty-state {
          text-align: center;
          padding: 40px;
          color: rgba(255, 255, 255, 0.5);
        }
        .report-card {
          grid-column: 1 / -1;
        }
        .report-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        .report-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .report-label {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.7);
        }
        .bool-toggle {
          display: flex;
          gap: 8px;
        }
        .bool-btn {
          flex: 1;
          padding: 10px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s;
        }
        .bool-btn.yes.active {
          background: rgba(74, 222, 128, 0.2);
          border-color: #4ade80;
          color: #4ade80;
        }
        .bool-btn.no.active {
          background: rgba(248, 113, 113, 0.2);
          border-color: #f87171;
          color: #f87171;
        }
        .score-input {
          display: flex;
          gap: 8px;
        }
        .score-btn {
          width: 36px;
          height: 36px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
        }
        .score-btn.active {
          background: rgba(102, 126, 234, 0.2);
          border-color: #667eea;
          color: #667eea;
        }
        .textarea {
          width: 100%;
          padding: 12px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: white;
          font-size: 0.9rem;
          resize: vertical;
          min-height: 80px;
        }
        .save-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          margin-top: 16px;
        }
        .consistency-ring {
          display: flex;
          justify-content: center;
          padding: 20px;
        }
        .ring-container {
          width: 120px;
          height: 120px;
          position: relative;
        }
        .ring-svg {
          transform: rotate(-90deg);
        }
        .ring-bg {
          fill: none;
          stroke: rgba(255, 255, 255, 0.1);
          stroke-width: 10;
        }
        .ring-progress {
          fill: none;
          stroke: #667eea;
          stroke-width: 10;
          stroke-linecap: round;
        }
        .ring-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }
        .ring-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
        }
        @media (max-width: 768px) {
          .grid {
            grid-template-columns: 1fr;
          }
          .report-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">Challenge Tracker</h1>
      </div>

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : (
        <>
          <div className="grid">
            {/* Trading Rules */}
            <div className="section">
              <div className="section-header">
                <div className="section-title">📜 Trading Rules</div>
                <button className="add-btn" onClick={() => setShowAddRule(!showAddRule)}>
                  {showAddRule ? 'Cancel' : '+ Add Rule'}
                </button>
              </div>

              {showAddRule && (
                <div className="add-rule-form">
                  <select
                    className="form-select"
                    value={newRule.rule_type}
                    onChange={(e) => setNewRule({ ...newRule, rule_type: e.target.value })}
                  >
                    {RULE_TYPES.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                  {!RULE_TYPES.find((r) => r.id === newRule.rule_type)?.isBoolean && (
                    <input
                      type="number"
                      className="form-input"
                      placeholder={RULE_TYPES.find((r) => r.id === newRule.rule_type)?.placeholder}
                      value={newRule.value}
                      onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                    />
                  )}
                  <button className="submit-btn" onClick={handleAddRule}>Add</button>
                </div>
              )}

              <div className="rules-list">
                {rules.length === 0 ? (
                  <div className="empty-state">No rules set. Add your first rule above!</div>
                ) : (
                  rules.map((rule) => (
                    <div key={rule.id} className={`rule-item ${!rule.is_active ? 'inactive' : ''}`}>
                      <span className="rule-label">{getRuleLabel(rule)}</span>
                      <div className="rule-actions">
                        <button
                          className={`toggle-btn ${!rule.is_active ? 'off' : ''}`}
                          onClick={() => handleToggleRule(rule)}
                        >
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </button>
                        <button className="delete-btn" onClick={() => handleDeleteRule(rule.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Violations */}
            <div className="section">
              <div className="section-header">
                <div className="section-title">⚠️ Recent Violations</div>
              </div>

              <div className="violations-list">
                {violations.length === 0 ? (
                  <div className="empty-state">
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
                    No violations! Keep up the discipline!
                  </div>
                ) : (
                  violations.map((v) => (
                    <div key={v.id} className="violation-item">
                      <div className="violation-header">
                        <span className="violation-type">{v.rule_type}</span>
                        <span className="violation-date">
                          {new Date(v.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="violation-details">
                        {JSON.stringify(v.violation_details)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Daily Report Card */}
            <div className="section report-card">
              <div className="section-header">
                <div className="section-title">📋 Daily Report Card</div>
                {todayReport?.consistency_score && (
                  <div className="consistency-ring">
                    <div className="ring-container">
                      <svg className="ring-svg" viewBox="0 0 120 120">
                        <circle className="ring-bg" cx="60" cy="60" r="50" />
                        <circle
                          className="ring-progress"
                          cx="60"
                          cy="60"
                          r="50"
                          strokeDasharray={`${2 * Math.PI * 50}`}
                          strokeDashoffset={`${2 * Math.PI * 50 * (1 - todayReport.consistency_score / 100)}`}
                        />
                      </svg>
                      <div className="ring-center">
                        <div className="ring-value">{todayReport.consistency_score}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="report-grid">
                <div className="report-item">
                  <label className="report-label">Discipline Score (1-10)</label>
                  <div className="score-input">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <button
                        key={n}
                        className={`score-btn ${reportForm.discipline_score === n ? 'active' : ''}`}
                        onClick={() => setReportForm({ ...reportForm, discipline_score: n })}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="report-item">
                  <label className="report-label">Followed Trading Plan?</label>
                  <div className="bool-toggle">
                    <button
                      className={`bool-btn yes ${reportForm.followed_plan === true ? 'active' : ''}`}
                      onClick={() => setReportForm({ ...reportForm, followed_plan: true })}
                    >
                      Yes
                    </button>
                    <button
                      className={`bool-btn no ${reportForm.followed_plan === false ? 'active' : ''}`}
                      onClick={() => setReportForm({ ...reportForm, followed_plan: false })}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div className="report-item">
                  <label className="report-label">Stayed Within Risk Limits?</label>
                  <div className="bool-toggle">
                    <button
                      className={`bool-btn yes ${reportForm.stayed_within_risk === true ? 'active' : ''}`}
                      onClick={() => setReportForm({ ...reportForm, stayed_within_risk: true })}
                    >
                      Yes
                    </button>
                    <button
                      className={`bool-btn no ${reportForm.stayed_within_risk === false ? 'active' : ''}`}
                      onClick={() => setReportForm({ ...reportForm, stayed_within_risk: false })}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div className="report-item">
                  <label className="report-label">Journaled All Trades?</label>
                  <div className="bool-toggle">
                    <button
                      className={`bool-btn yes ${reportForm.journaled_all_trades === true ? 'active' : ''}`}
                      onClick={() => setReportForm({ ...reportForm, journaled_all_trades: true })}
                    >
                      Yes
                    </button>
                    <button
                      className={`bool-btn no ${reportForm.journaled_all_trades === false ? 'active' : ''}`}
                      onClick={() => setReportForm({ ...reportForm, journaled_all_trades: false })}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>

              <div className="report-item">
                <label className="report-label">Lessons Learned</label>
                <textarea
                  className="textarea"
                  placeholder="What did you learn today? What would you do differently?"
                  value={reportForm.lessons_learned}
                  onChange={(e) => setReportForm({ ...reportForm, lessons_learned: e.target.value })}
                />
              </div>

              <button className="save-btn" onClick={handleSaveReport}>
                Save Report Card
              </button>
            </div>
          </div>
        </>
      )}
    </JournalLayout>
  );
}
