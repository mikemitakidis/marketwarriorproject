import { getJournalUser, getServiceSupabase, checkJournalAccess } from '../../lib/journalAuth';
import JournalLayout from '../../components/journal/JournalLayout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

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

export default function AddTradePage({ user, settings }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tags, setTags] = useState({ setup: [], mistake: [], emotion: [], market_condition: [] });
  const [selectedTags, setSelectedTags] = useState([]);

  const [form, setForm] = useState({
    symbol: '',
    direction: 'long',
    asset_class: 'stock',
    entry_price: '',
    entry_date: new Date().toISOString().slice(0, 16),
    quantity: '',
    exit_price: '',
    exit_date: '',
    stop_loss: '',
    take_profit: '',
    execution_score: '',
    confidence_rating: '',
    timeframe: '',
    session: '',
    strategy: '',
    notes: '',
    pre_trade_plan: '',
    commission: settings?.default_commission || 0,
  });

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/journal/tags');
      const data = await res.json();
      if (res.ok) {
        setTags(data.grouped);
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const toggleTag = (tagId) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/journal/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tag_ids: selectedTags,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create trade');
      }

      router.push('/trading-journal/trades');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Calculate preview metrics
  const calculatePreview = () => {
    const entry = parseFloat(form.entry_price) || 0;
    const exit = parseFloat(form.exit_price) || 0;
    const qty = parseFloat(form.quantity) || 0;
    const stop = parseFloat(form.stop_loss) || 0;
    const commission = parseFloat(form.commission) || 0;

    let pnl = 0;
    let rMultiple = null;
    let riskAmount = 0;

    if (stop && entry) {
      riskAmount = Math.abs(entry - stop) * qty;
    }

    if (exit && entry && qty) {
      const change = form.direction === 'long' ? exit - entry : entry - exit;
      pnl = (change * qty) - commission;

      if (riskAmount > 0) {
        rMultiple = pnl / riskAmount;
      }
    }

    return { pnl, rMultiple, riskAmount };
  };

  const preview = calculatePreview();

  return (
    <JournalLayout user={user} title="Add Trade" settings={settings}>
      <style jsx>{`
        .page-header {
          margin-bottom: 24px;
        }
        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
        }
        .form-container {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }
        .form-section {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .section-title {
          font-size: 1rem;
          font-weight: 600;
          color: #667eea;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group.full-width {
          grid-column: 1 / -1;
        }
        .form-label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 500;
        }
        .form-label .required {
          color: #f87171;
        }
        .form-input, .form-select, .form-textarea {
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: white;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          outline: none;
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.1);
        }
        .form-select option {
          background: #1e293b;
        }
        .form-textarea {
          min-height: 80px;
          resize: vertical;
        }
        .direction-toggle {
          display: flex;
          gap: 8px;
        }
        .direction-btn {
          flex: 1;
          padding: 12px;
          border: 2px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .direction-btn.active.long {
          border-color: #4ade80;
          background: rgba(74, 222, 128, 0.1);
          color: #4ade80;
        }
        .direction-btn.active.short {
          border-color: #f87171;
          background: rgba(248, 113, 113, 0.1);
          color: #f87171;
        }
        .tags-section {
          margin-top: 8px;
        }
        .tag-category {
          margin-bottom: 16px;
        }
        .tag-category-title {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .tag-btn {
          padding: 6px 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          background: transparent;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tag-btn:hover {
          border-color: rgba(255, 255, 255, 0.4);
        }
        .tag-btn.selected {
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.2);
          color: #667eea;
        }
        .preview-card {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 12px;
          padding: 24px;
          position: sticky;
          top: 20px;
        }
        .preview-title {
          font-size: 1rem;
          font-weight: 600;
          color: white;
          margin-bottom: 20px;
        }
        .preview-stat {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .preview-stat:last-child {
          border-bottom: none;
        }
        .preview-label {
          color: rgba(255, 255, 255, 0.6);
        }
        .preview-value {
          font-weight: 600;
          color: white;
        }
        .preview-value.positive { color: #4ade80; }
        .preview-value.negative { color: #f87171; }
        .submit-section {
          margin-top: 24px;
        }
        .error-msg {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .btn-group {
          display: flex;
          gap: 12px;
        }
        .submit-btn {
          flex: 1;
          padding: 14px 24px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .cancel-btn {
          padding: 14px 24px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          text-align: center;
        }
        .cancel-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .rating-input {
          display: flex;
          gap: 8px;
        }
        .rating-btn {
          width: 36px;
          height: 36px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s;
        }
        .rating-btn:hover {
          border-color: rgba(255, 255, 255, 0.4);
        }
        .rating-btn.selected {
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.2);
          color: #667eea;
        }
        @media (max-width: 1024px) {
          .form-container {
            grid-template-columns: 1fr;
          }
          .preview-card {
            position: static;
          }
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">Log New Trade</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-container">
          <div className="form-main">
            {/* Basic Info */}
            <div className="form-section">
              <div className="section-title">📊 Trade Details</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    Symbol <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="symbol"
                    className="form-input"
                    placeholder="e.g., AAPL"
                    value={form.symbol}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Direction <span className="required">*</span>
                  </label>
                  <div className="direction-toggle">
                    <button
                      type="button"
                      className={`direction-btn ${form.direction === 'long' ? 'active long' : ''}`}
                      onClick={() => setForm({ ...form, direction: 'long' })}
                    >
                      Long
                    </button>
                    <button
                      type="button"
                      className={`direction-btn ${form.direction === 'short' ? 'active short' : ''}`}
                      onClick={() => setForm({ ...form, direction: 'short' })}
                    >
                      Short
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Asset Class</label>
                  <select
                    name="asset_class"
                    className="form-select"
                    value={form.asset_class}
                    onChange={handleChange}
                  >
                    <option value="stock">Stock</option>
                    <option value="forex">Forex</option>
                    <option value="crypto">Crypto</option>
                    <option value="futures">Futures</option>
                    <option value="options">Options</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Timeframe</label>
                  <select
                    name="timeframe"
                    className="form-select"
                    value={form.timeframe}
                    onChange={handleChange}
                  >
                    <option value="">Select...</option>
                    <option value="1m">1 Minute</option>
                    <option value="5m">5 Minutes</option>
                    <option value="15m">15 Minutes</option>
                    <option value="1h">1 Hour</option>
                    <option value="4h">4 Hours</option>
                    <option value="D">Daily</option>
                    <option value="W">Weekly</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Entry Price <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    name="entry_price"
                    className="form-input"
                    step="any"
                    placeholder="0.00"
                    value={form.entry_price}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Entry Date/Time <span className="required">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="entry_date"
                    className="form-input"
                    value={form.entry_date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Quantity <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    className="form-input"
                    step="any"
                    placeholder="0"
                    value={form.quantity}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Stop Loss</label>
                  <input
                    type="number"
                    name="stop_loss"
                    className="form-input"
                    step="any"
                    placeholder="0.00"
                    value={form.stop_loss}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Take Profit</label>
                  <input
                    type="number"
                    name="take_profit"
                    className="form-input"
                    step="any"
                    placeholder="0.00"
                    value={form.take_profit}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Exit Price</label>
                  <input
                    type="number"
                    name="exit_price"
                    className="form-input"
                    step="any"
                    placeholder="Leave empty if still open"
                    value={form.exit_price}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Exit Date/Time</label>
                  <input
                    type="datetime-local"
                    name="exit_date"
                    className="form-input"
                    value={form.exit_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Commission/Fees</label>
                  <input
                    type="number"
                    name="commission"
                    className="form-input"
                    step="any"
                    placeholder="0.00"
                    value={form.commission}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Quality Ratings */}
            <div className="form-section">
              <div className="section-title">⭐ Execution Quality</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Execution Score (1-10)</label>
                  <div className="rating-input">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`rating-btn ${form.execution_score === String(n) ? 'selected' : ''}`}
                        onClick={() => setForm({ ...form, execution_score: String(n) })}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confidence (1-5)</label>
                  <div className="rating-input">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`rating-btn ${form.confidence_rating === String(n) ? 'selected' : ''}`}
                        onClick={() => setForm({ ...form, confidence_rating: String(n) })}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Session</label>
                  <select
                    name="session"
                    className="form-select"
                    value={form.session}
                    onChange={handleChange}
                  >
                    <option value="">Select...</option>
                    {(settings?.trading_sessions || ['London', 'New York', 'Asia']).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Strategy</label>
                  <input
                    type="text"
                    name="strategy"
                    className="form-input"
                    placeholder="e.g., Breakout, Reversal"
                    value={form.strategy}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="form-section">
              <div className="section-title">🏷️ Tags</div>
              <div className="tags-section">
                {Object.entries(tags).map(([category, categoryTags]) => (
                  categoryTags.length > 0 && (
                    <div key={category} className="tag-category">
                      <div className="tag-category-title">{category.replace('_', ' ')}</div>
                      <div className="tag-list">
                        {categoryTags.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            className={`tag-btn ${selectedTags.includes(tag.id) ? 'selected' : ''}`}
                            onClick={() => toggleTag(tag.id)}
                            style={selectedTags.includes(tag.id) ? { borderColor: tag.color, color: tag.color } : {}}
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="form-section">
              <div className="section-title">📝 Notes</div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Pre-Trade Plan</label>
                  <textarea
                    name="pre_trade_plan"
                    className="form-textarea"
                    placeholder="What was your plan before entering?"
                    value={form.pre_trade_plan}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Trade Notes</label>
                  <textarea
                    name="notes"
                    className="form-textarea"
                    placeholder="Any observations or lessons..."
                    value={form.notes}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preview Sidebar */}
          <div className="preview-sidebar">
            <div className="preview-card">
              <div className="preview-title">Trade Preview</div>

              <div className="preview-stat">
                <span className="preview-label">Symbol</span>
                <span className="preview-value">{form.symbol || '-'}</span>
              </div>

              <div className="preview-stat">
                <span className="preview-label">Direction</span>
                <span className={`preview-value ${form.direction === 'long' ? 'positive' : 'negative'}`}>
                  {form.direction.toUpperCase()}
                </span>
              </div>

              <div className="preview-stat">
                <span className="preview-label">Position Size</span>
                <span className="preview-value">
                  {form.quantity && form.entry_price
                    ? `$${(parseFloat(form.quantity) * parseFloat(form.entry_price)).toLocaleString()}`
                    : '-'}
                </span>
              </div>

              <div className="preview-stat">
                <span className="preview-label">Risk Amount</span>
                <span className="preview-value negative">
                  {preview.riskAmount > 0 ? `$${preview.riskAmount.toFixed(2)}` : '-'}
                </span>
              </div>

              {form.exit_price && (
                <>
                  <div className="preview-stat">
                    <span className="preview-label">P&L</span>
                    <span className={`preview-value ${preview.pnl >= 0 ? 'positive' : 'negative'}`}>
                      {preview.pnl >= 0 ? '+' : ''}${preview.pnl.toFixed(2)}
                    </span>
                  </div>

                  {preview.rMultiple !== null && (
                    <div className="preview-stat">
                      <span className="preview-label">R-Multiple</span>
                      <span className={`preview-value ${preview.rMultiple >= 0 ? 'positive' : 'negative'}`}>
                        {preview.rMultiple >= 0 ? '+' : ''}{preview.rMultiple.toFixed(2)}R
                      </span>
                    </div>
                  )}
                </>
              )}

              <div className="preview-stat">
                <span className="preview-label">Status</span>
                <span className="preview-value">
                  {form.exit_price ? 'Closed' : 'Open'}
                </span>
              </div>

              <div className="preview-stat">
                <span className="preview-label">Tags</span>
                <span className="preview-value">{selectedTags.length}</span>
              </div>
            </div>

            <div className="submit-section">
              {error && <div className="error-msg">{error}</div>}

              <div className="btn-group">
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Trade'}
                </button>
              </div>

              <a href="/trading-journal/trades" className="cancel-btn" style={{ display: 'block', marginTop: '12px' }}>
                Cancel
              </a>
            </div>
          </div>
        </div>
      </form>
    </JournalLayout>
  );
}
