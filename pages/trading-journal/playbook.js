import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import JournalLayout from '../../components/journal/JournalLayout';
import { getJournalUser, getServiceSupabase, checkJournalAccess } from '../../lib/journalAuth';

export default function PlaybookPage({ user, settings, initialPlaybooks, trades }) {
  const router = useRouter();
  const [playbooks, setPlaybooks] = useState(initialPlaybooks || []);
  const [showForm, setShowForm] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlaybook, setSelectedPlaybook] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    entry_rules: '',
    exit_rules: '',
    stop_loss_rules: '',
    position_size_rules: '',
    do_list: [''],
    dont_list: [''],
    example_trade_ids: [],
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      entry_rules: '',
      exit_rules: '',
      stop_loss_rules: '',
      position_size_rules: '',
      do_list: [''],
      dont_list: [''],
      example_trade_ids: [],
    });
    setEditingPlaybook(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const method = editingPlaybook ? 'PUT' : 'POST';
      const body = editingPlaybook
        ? { id: editingPlaybook.id, ...formData }
        : formData;

      // Filter out empty list items
      body.do_list = body.do_list.filter(item => item.trim());
      body.dont_list = body.dont_list.filter(item => item.trim());

      const res = await fetch('/api/journal/playbook', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        if (editingPlaybook) {
          setPlaybooks(playbooks.map(p => p.id === data.playbook.id ? data.playbook : p));
        } else {
          setPlaybooks([data.playbook, ...playbooks]);
        }
        setShowForm(false);
        resetForm();
      }
    } catch (err) {
      console.error('Error saving playbook:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this playbook?')) return;

    try {
      const res = await fetch(`/api/journal/playbook?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPlaybooks(playbooks.filter(p => p.id !== id));
        setSelectedPlaybook(null);
      }
    } catch (err) {
      console.error('Error deleting playbook:', err);
    }
  };

  const handleEdit = (playbook) => {
    setEditingPlaybook(playbook);
    setFormData({
      name: playbook.name,
      description: playbook.description || '',
      entry_rules: playbook.entry_rules || '',
      exit_rules: playbook.exit_rules || '',
      stop_loss_rules: playbook.stop_loss_rules || '',
      position_size_rules: playbook.position_size_rules || '',
      do_list: playbook.do_list?.length ? playbook.do_list : [''],
      dont_list: playbook.dont_list?.length ? playbook.dont_list : [''],
      example_trade_ids: playbook.example_trade_ids || [],
    });
    setShowForm(true);
    setSelectedPlaybook(null);
  };

  const addListItem = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  };

  const updateListItem = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item),
    }));
  };

  const removeListItem = (field, index) => {
    if (formData[field].length <= 1) return;
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  return (
    <JournalLayout user={user} title="Playbook" settings={settings}>
      <style jsx>{`
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        h1 {
          color: white;
          font-size: 1.8rem;
        }
        .subtitle {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
          margin-top: 4px;
        }
        .add-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          border-radius: 10px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .add-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .playbooks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .playbook-card {
          background: rgba(30, 41, 59, 0.6);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .playbook-card:hover {
          border-color: rgba(102, 126, 234, 0.5);
          transform: translateY(-2px);
        }
        .playbook-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .playbook-name {
          color: white;
          font-size: 1.1rem;
          font-weight: 600;
        }
        .playbook-badge {
          padding: 4px 8px;
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          font-size: 0.7rem;
          border-radius: 4px;
          font-weight: 600;
        }
        .rank-badge {
          position: absolute;
          top: -8px;
          left: -8px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
        }
        .rank-1 {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #1e293b;
        }
        .rank-2 {
          background: linear-gradient(135deg, #9ca3af, #6b7280);
          color: white;
        }
        .rank-3 {
          background: linear-gradient(135deg, #d97706, #b45309);
          color: white;
        }
        .rank-other {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.6);
        }
        .score-bar {
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
          margin-top: 12px;
        }
        .score-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease;
        }
        .score-label {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.5);
        }
        .pnl-badge {
          font-size: 1rem;
          font-weight: 700;
          margin-top: 8px;
        }
        .pnl-badge.positive { color: #10b981; }
        .pnl-badge.negative { color: #ef4444; }
        .playbook-desc {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.85rem;
          margin-bottom: 16px;
          line-height: 1.5;
        }
        .playbook-stats {
          display: flex;
          gap: 16px;
        }
        .playbook-stat {
          text-align: center;
        }
        .stat-value {
          color: white;
          font-size: 1.2rem;
          font-weight: 700;
        }
        .stat-value.positive { color: #10b981; }
        .stat-value.negative { color: #ef4444; }
        .stat-label {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.7rem;
          text-transform: uppercase;
        }
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 16px;
          border: 2px dashed rgba(255, 255, 255, 0.1);
        }
        .empty-icon {
          font-size: 3rem;
          margin-bottom: 16px;
        }
        .empty-title {
          color: white;
          font-size: 1.2rem;
          margin-bottom: 8px;
        }
        .empty-desc {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.9rem;
          max-width: 400px;
          margin: 0 auto 24px;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal {
          background: #1e293b;
          border-radius: 16px;
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-header {
          padding: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-title {
          color: white;
          font-size: 1.3rem;
        }
        .close-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: 1.5rem;
          cursor: pointer;
        }
        .modal-body {
          padding: 20px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-label {
          display: block;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
          margin-bottom: 8px;
        }
        .form-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          font-size: 1rem;
          outline: none;
        }
        .form-input:focus {
          border-color: #667eea;
        }
        .form-textarea {
          min-height: 100px;
          resize: vertical;
        }
        .list-section {
          margin-bottom: 20px;
        }
        .list-title {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .list-title.do { color: #10b981; }
        .list-title.dont { color: #ef4444; }
        .list-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .list-item {
          display: flex;
          gap: 8px;
        }
        .list-input {
          flex: 1;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          font-size: 0.9rem;
          outline: none;
        }
        .list-btn {
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
        }
        .list-btn.add {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }
        .list-btn.remove {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        .modal-footer {
          padding: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        .btn-secondary {
          padding: 12px 24px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
        }
        .btn-primary {
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .detail-modal {
          max-width: 800px;
        }
        .detail-section {
          margin-bottom: 24px;
        }
        .detail-section h4 {
          color: white;
          font-size: 1rem;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .detail-content {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          line-height: 1.6;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }
        .detail-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .detail-list li {
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          margin-bottom: 6px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
        }
        .detail-list.do li {
          border-left: 3px solid #10b981;
        }
        .detail-list.dont li {
          border-left: 3px solid #ef4444;
        }
        .detail-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }
        .btn-edit {
          padding: 10px 20px;
          background: rgba(102, 126, 234, 0.2);
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 8px;
          color: #667eea;
          cursor: pointer;
        }
        .btn-delete {
          padding: 10px 20px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #ef4444;
          cursor: pointer;
        }
        .stats-row {
          display: flex;
          gap: 20px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          margin-bottom: 24px;
        }
        .stats-row .stat {
          flex: 1;
          text-align: center;
        }
      `}</style>

      <div className="header">
        <div>
          <h1>Trading Playbook</h1>
          <p className="subtitle">Document your best setups and strategies</p>
        </div>
        <button className="add-btn" onClick={() => { resetForm(); setShowForm(true); }}>
          + New Setup
        </button>
      </div>

      {playbooks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <div className="empty-title">Create Your First Playbook Entry</div>
          <p className="empty-desc">
            Document your best trading setups with entry/exit rules, do's and don'ts,
            and link example trades to track performance.
          </p>
          <button className="add-btn" onClick={() => setShowForm(true)}>
            + Create Playbook Entry
          </button>
        </div>
      ) : (
        <div className="playbooks-grid">
          {playbooks.map((playbook) => (
            <div
              key={playbook.id}
              className="playbook-card"
              onClick={() => setSelectedPlaybook(playbook)}
              style={{ position: 'relative' }}
            >
              {playbook.rank && playbook.total_trades > 0 && (
                <div className={`rank-badge ${
                  playbook.rank === 1 ? 'rank-1' :
                  playbook.rank === 2 ? 'rank-2' :
                  playbook.rank === 3 ? 'rank-3' : 'rank-other'
                }`}>
                  #{playbook.rank}
                </div>
              )}
              <div className="playbook-header">
                <div className="playbook-name">{playbook.name}</div>
                {playbook.is_active && <span className="playbook-badge">Active</span>}
              </div>
              {playbook.description && (
                <p className="playbook-desc">
                  {playbook.description.length > 100
                    ? playbook.description.slice(0, 100) + '...'
                    : playbook.description}
                </p>
              )}
              <div className="playbook-stats">
                <div className="playbook-stat">
                  <div className="stat-value">{playbook.total_trades || 0}</div>
                  <div className="stat-label">Trades</div>
                </div>
                <div className="playbook-stat">
                  <div className={`stat-value ${(playbook.win_rate || 0) >= 50 ? 'positive' : ''}`}>
                    {playbook.win_rate || 0}%
                  </div>
                  <div className="stat-label">Win Rate</div>
                </div>
                <div className="playbook-stat">
                  <div className={`stat-value ${(playbook.profit_factor || 0) >= 1 ? 'positive' : 'negative'}`}>
                    {(playbook.profit_factor || 0).toFixed(1)}
                  </div>
                  <div className="stat-label">PF</div>
                </div>
                <div className="playbook-stat">
                  <div className={`stat-value ${(playbook.avg_r_multiple || 0) >= 0 ? 'positive' : 'negative'}`}>
                    {(playbook.avg_r_multiple || 0).toFixed(2)}R
                  </div>
                  <div className="stat-label">Avg R</div>
                </div>
              </div>
              {playbook.total_trades > 0 && (
                <>
                  <div className={`pnl-badge ${(playbook.total_pnl || 0) >= 0 ? 'positive' : 'negative'}`}>
                    {(playbook.total_pnl || 0) >= 0 ? '+' : ''}${(playbook.total_pnl || 0).toLocaleString()}
                  </div>
                  <div className="score-bar">
                    <div
                      className="score-fill"
                      style={{
                        width: `${playbook.performance_score || 0}%`,
                        background: (playbook.performance_score || 0) >= 70 ? '#10b981' :
                          (playbook.performance_score || 0) >= 40 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                  <div className="score-label">
                    <span>Performance Score</span>
                    <span>{playbook.performance_score || 0}/100</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingPlaybook ? 'Edit Setup' : 'New Trading Setup'}
              </h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Setup Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Breakout Setup, Morning Reversal"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input form-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe when this setup works best..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Entry Rules</label>
                  <textarea
                    className="form-input form-textarea"
                    value={formData.entry_rules}
                    onChange={(e) => setFormData({ ...formData, entry_rules: e.target.value })}
                    placeholder="1. Wait for breakout above resistance&#10;2. Volume must be above average&#10;3. RSI not overbought..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Exit Rules</label>
                  <textarea
                    className="form-input form-textarea"
                    value={formData.exit_rules}
                    onChange={(e) => setFormData({ ...formData, exit_rules: e.target.value })}
                    placeholder="Take profit at 2R, trail stop after 1R..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Stop Loss Rules</label>
                  <textarea
                    className="form-input"
                    value={formData.stop_loss_rules}
                    onChange={(e) => setFormData({ ...formData, stop_loss_rules: e.target.value })}
                    placeholder="Place stop below swing low..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Position Size Rules</label>
                  <textarea
                    className="form-input"
                    value={formData.position_size_rules}
                    onChange={(e) => setFormData({ ...formData, position_size_rules: e.target.value })}
                    placeholder="Risk 1% of account, reduce to 0.5% on low-conviction setups..."
                  />
                </div>

                <div className="list-section">
                  <div className="list-title do">✓ Do's</div>
                  <div className="list-items">
                    {formData.do_list.map((item, index) => (
                      <div key={index} className="list-item">
                        <input
                          type="text"
                          className="list-input"
                          value={item}
                          onChange={(e) => updateListItem('do_list', index, e.target.value)}
                          placeholder="Enter a best practice..."
                        />
                        <button
                          type="button"
                          className="list-btn remove"
                          onClick={() => removeListItem('do_list', index)}
                        >
                          -
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="list-btn add"
                      onClick={() => addListItem('do_list')}
                    >
                      + Add Do
                    </button>
                  </div>
                </div>

                <div className="list-section">
                  <div className="list-title dont">✗ Don'ts</div>
                  <div className="list-items">
                    {formData.dont_list.map((item, index) => (
                      <div key={index} className="list-item">
                        <input
                          type="text"
                          className="list-input"
                          value={item}
                          onChange={(e) => updateListItem('dont_list', index, e.target.value)}
                          placeholder="Enter a mistake to avoid..."
                        />
                        <button
                          type="button"
                          className="list-btn remove"
                          onClick={() => removeListItem('dont_list', index)}
                        >
                          -
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="list-btn add"
                      onClick={() => addListItem('dont_list')}
                    >
                      + Add Don't
                    </button>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading || !formData.name.trim()}>
                  {loading ? 'Saving...' : editingPlaybook ? 'Update Setup' : 'Create Setup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {selectedPlaybook && (
        <div className="modal-overlay" onClick={() => setSelectedPlaybook(null)}>
          <div className="modal detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedPlaybook.name}</h2>
              <button className="close-btn" onClick={() => setSelectedPlaybook(null)}>&times;</button>
            </div>

            <div className="modal-body">
              <div className="stats-row">
                <div className="stat">
                  <div className="stat-value">{selectedPlaybook.total_trades || 0}</div>
                  <div className="stat-label">Total Trades</div>
                </div>
                <div className="stat">
                  <div className={`stat-value ${(selectedPlaybook.win_rate || 0) >= 50 ? 'positive' : ''}`}>
                    {selectedPlaybook.win_rate || 0}%
                  </div>
                  <div className="stat-label">Win Rate</div>
                </div>
                <div className="stat">
                  <div className={`stat-value ${(selectedPlaybook.profit_factor || 0) >= 1 ? 'positive' : 'negative'}`}>
                    {(selectedPlaybook.profit_factor || 0).toFixed(2)}
                  </div>
                  <div className="stat-label">Profit Factor</div>
                </div>
                <div className="stat">
                  <div className={`stat-value ${(selectedPlaybook.avg_r_multiple || 0) >= 0 ? 'positive' : 'negative'}`}>
                    {(selectedPlaybook.avg_r_multiple || 0).toFixed(2)}R
                  </div>
                  <div className="stat-label">Avg R</div>
                </div>
                <div className="stat">
                  <div className={`stat-value ${(selectedPlaybook.total_pnl || 0) >= 0 ? 'positive' : 'negative'}`}>
                    ${(selectedPlaybook.total_pnl || 0).toLocaleString()}
                  </div>
                  <div className="stat-label">Total P&L</div>
                </div>
              </div>
              {selectedPlaybook.performance_score !== undefined && selectedPlaybook.total_trades > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Performance Score</span>
                    <span style={{
                      color: (selectedPlaybook.performance_score || 0) >= 70 ? '#10b981' :
                        (selectedPlaybook.performance_score || 0) >= 40 ? '#f59e0b' : '#ef4444',
                      fontWeight: '700',
                      fontSize: '1.1rem'
                    }}>
                      {selectedPlaybook.performance_score}/100
                      {selectedPlaybook.rank && ` (Rank #${selectedPlaybook.rank})`}
                    </span>
                  </div>
                  <div className="score-bar" style={{ height: '10px' }}>
                    <div
                      className="score-fill"
                      style={{
                        width: `${selectedPlaybook.performance_score || 0}%`,
                        background: (selectedPlaybook.performance_score || 0) >= 70 ? '#10b981' :
                          (selectedPlaybook.performance_score || 0) >= 40 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                </div>
              )}

              {selectedPlaybook.description && (
                <div className="detail-section">
                  <h4>📝 Description</h4>
                  <div className="detail-content">{selectedPlaybook.description}</div>
                </div>
              )}

              {selectedPlaybook.entry_rules && (
                <div className="detail-section">
                  <h4>🎯 Entry Rules</h4>
                  <div className="detail-content" style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedPlaybook.entry_rules}
                  </div>
                </div>
              )}

              {selectedPlaybook.exit_rules && (
                <div className="detail-section">
                  <h4>🚪 Exit Rules</h4>
                  <div className="detail-content" style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedPlaybook.exit_rules}
                  </div>
                </div>
              )}

              {selectedPlaybook.stop_loss_rules && (
                <div className="detail-section">
                  <h4>🛑 Stop Loss Rules</h4>
                  <div className="detail-content" style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedPlaybook.stop_loss_rules}
                  </div>
                </div>
              )}

              {selectedPlaybook.position_size_rules && (
                <div className="detail-section">
                  <h4>📊 Position Size Rules</h4>
                  <div className="detail-content" style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedPlaybook.position_size_rules}
                  </div>
                </div>
              )}

              {selectedPlaybook.do_list && selectedPlaybook.do_list.length > 0 && (
                <div className="detail-section">
                  <h4>✅ Do's</h4>
                  <ul className="detail-list do">
                    {selectedPlaybook.do_list.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedPlaybook.dont_list && selectedPlaybook.dont_list.length > 0 && (
                <div className="detail-section">
                  <h4>❌ Don'ts</h4>
                  <ul className="detail-list dont">
                    {selectedPlaybook.dont_list.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="detail-actions">
                <button className="btn-edit" onClick={() => handleEdit(selectedPlaybook)}>
                  Edit Setup
                </button>
                <button className="btn-delete" onClick={() => handleDelete(selectedPlaybook.id)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </JournalLayout>
  );
}

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

    const { data: playbooks } = await supabase
      .from('journal_playbook')
      .select('*')
      .eq('journal_user_id', user.id)
      .order('created_at', { ascending: false });

    const { data: trades } = await supabase
      .from('journal_trades')
      .select('id, symbol, entry_date, pnl_amount')
      .eq('journal_user_id', user.id)
      .eq('status', 'closed')
      .order('entry_date', { ascending: false })
      .limit(100);

    return {
      props: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName || null,
        },
        settings: settings || null,
        initialPlaybooks: playbooks || [],
        trades: trades || [],
      },
    };
  } catch (err) {
    console.error('Playbook page error:', err);
    return { redirect: { destination: '/trading-journal/login', permanent: false } };
  }
}
