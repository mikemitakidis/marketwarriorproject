import { useState, useEffect } from 'react';
import JournalLayout from '../../components/journal/JournalLayout';
import { getJournalUser, getServiceSupabase } from '../../lib/journalAuth';

export default function GoalsPage({ user, settings }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goal_type: 'total_pnl',
    target_value: '',
    deadline: '',
    milestones: [],
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const res = await fetch('/api/journal/goals');
      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals || []);
      }
    } catch (err) {
      console.error('Failed to fetch goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const method = editingGoal ? 'PUT' : 'POST';
    const body = editingGoal
      ? { id: editingGoal.id, ...formData }
      : formData;

    try {
      const res = await fetch('/api/journal/goals', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        fetchGoals();
        resetForm();
      }
    } catch (err) {
      console.error('Failed to save goal:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this goal?')) return;

    try {
      const res = await fetch(`/api/journal/goals?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchGoals();
      }
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  const handleStatusChange = async (goal, newStatus) => {
    try {
      const res = await fetch('/api/journal/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goal.id, status: newStatus }),
      });

      if (res.ok) {
        fetchGoals();
      }
    } catch (err) {
      console.error('Failed to update goal status:', err);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingGoal(null);
    setFormData({
      name: '',
      description: '',
      goal_type: 'total_pnl',
      target_value: '',
      deadline: '',
      milestones: [],
    });
  };

  const startEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      description: goal.description || '',
      goal_type: goal.goal_type,
      target_value: goal.target_value,
      deadline: goal.deadline || '',
      milestones: goal.milestones || [],
    });
    setShowForm(true);
  };

  const goalTypes = [
    { value: 'total_pnl', label: 'Total P&L', unit: '$', icon: '💰' },
    { value: 'monthly_pnl', label: 'Monthly P&L', unit: '$', icon: '📅' },
    { value: 'win_rate', label: 'Win Rate', unit: '%', icon: '🎯' },
    { value: 'avg_r_multiple', label: 'Avg R-Multiple', unit: 'R', icon: '📈' },
    { value: 'profit_factor', label: 'Profit Factor', unit: '', icon: '⚖️' },
    { value: 'trades_count', label: 'Trades Count', unit: 'trades', icon: '📊' },
    { value: 'max_drawdown', label: 'Max Drawdown', unit: '%', icon: '📉' },
    { value: 'consistency_streak', label: 'Consistency Streak', unit: 'days', icon: '🔥' },
    { value: 'custom', label: 'Custom Goal', unit: '', icon: '✨' },
  ];

  const getGoalIcon = (type) => goalTypes.find(t => t.value === type)?.icon || '🎯';
  const getGoalUnit = (type) => goalTypes.find(t => t.value === type)?.unit || '';

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const failedGoals = goals.filter(g => g.status === 'failed');

  if (loading) {
    return (
      <JournalLayout user={user} title="Goals" settings={settings}>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.6)' }}>
          Loading goals...
        </div>
      </JournalLayout>
    );
  }

  return (
    <JournalLayout user={user} title="Goals & Milestones" settings={settings}>
      <style jsx>{`
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        h1 {
          color: white;
          font-size: 1.8rem;
          margin: 0;
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
        .section {
          margin-bottom: 32px;
        }
        .section-title {
          color: white;
          font-size: 1.1rem;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .goals-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
        }
        .goal-card {
          background: rgba(30, 41, 59, 0.6);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 24px;
          transition: all 0.2s;
        }
        .goal-card:hover {
          border-color: rgba(102, 126, 234, 0.3);
        }
        .goal-card.completed {
          border-color: rgba(16, 185, 129, 0.3);
          background: rgba(16, 185, 129, 0.05);
        }
        .goal-card.failed {
          border-color: rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.05);
        }
        .goal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        .goal-icon {
          font-size: 2rem;
          margin-right: 12px;
        }
        .goal-name {
          color: white;
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .goal-type {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.75rem;
          text-transform: uppercase;
        }
        .goal-actions {
          display: flex;
          gap: 8px;
        }
        .action-btn {
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .action-btn.complete {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.3);
          color: #10b981;
        }
        .action-btn.delete {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }
        .progress-section {
          margin-bottom: 16px;
        }
        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .progress-label {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.85rem;
        }
        .progress-value {
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .progress-bar {
          height: 10px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 5px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: 5px;
          transition: width 0.5s ease;
        }
        .target-info {
          display: flex;
          justify-content: space-between;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .target-item {
          text-align: center;
        }
        .target-label {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.7rem;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .target-value {
          color: white;
          font-size: 1rem;
          font-weight: 600;
        }
        .target-value.positive { color: #10b981; }
        .target-value.negative { color: #ef4444; }
        .track-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .track-badge.on-track {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .track-badge.behind {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        .milestones {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .milestone {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
        }
        .milestone-check {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
        }
        .milestone-check.completed {
          background: #10b981;
          border-color: #10b981;
          color: white;
        }
        .milestone-text {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
        }
        .milestone-text.completed {
          text-decoration: line-through;
          color: rgba(255, 255, 255, 0.4);
        }
        .deadline {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.8rem;
          margin-top: 12px;
        }
        .form-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .form-card {
          background: #1e293b;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 32px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }
        .form-title {
          color: white;
          font-size: 1.3rem;
          margin-bottom: 24px;
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
        }
        .form-input:focus {
          outline: none;
          border-color: #667eea;
        }
        .form-select {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          font-size: 1rem;
        }
        .form-buttons {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }
        .form-btn {
          flex: 1;
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .form-btn.primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          color: white;
        }
        .form-btn.secondary {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.7);
        }
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: rgba(255, 255, 255, 0.5);
        }
        .empty-icon {
          font-size: 3rem;
          margin-bottom: 16px;
        }
      `}</style>

      <div className="header">
        <div>
          <h1>Goals & Milestones</h1>
          <p className="subtitle">Set targets and track your progress</p>
        </div>
        <button className="add-btn" onClick={() => setShowForm(true)}>
          + New Goal
        </button>
      </div>

      {/* Active Goals */}
      <div className="section">
        <div className="section-title">🎯 Active Goals ({activeGoals.length})</div>
        {activeGoals.length > 0 ? (
          <div className="goals-grid">
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={() => startEdit(goal)}
                onDelete={() => handleDelete(goal.id)}
                onStatusChange={handleStatusChange}
                getGoalIcon={getGoalIcon}
                getGoalUnit={getGoalUnit}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <p>No active goals. Create one to start tracking your progress!</p>
          </div>
        )}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="section">
          <div className="section-title">✅ Completed Goals ({completedGoals.length})</div>
          <div className="goals-grid">
            {completedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={() => startEdit(goal)}
                onDelete={() => handleDelete(goal.id)}
                onStatusChange={handleStatusChange}
                getGoalIcon={getGoalIcon}
                getGoalUnit={getGoalUnit}
              />
            ))}
          </div>
        </div>
      )}

      {/* Failed Goals */}
      {failedGoals.length > 0 && (
        <div className="section">
          <div className="section-title">❌ Failed Goals ({failedGoals.length})</div>
          <div className="goals-grid">
            {failedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={() => startEdit(goal)}
                onDelete={() => handleDelete(goal.id)}
                onStatusChange={handleStatusChange}
                getGoalIcon={getGoalIcon}
                getGoalUnit={getGoalUnit}
              />
            ))}
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="form-overlay" onClick={(e) => e.target === e.currentTarget && resetForm()}>
          <div className="form-card">
            <h2 className="form-title">{editingGoal ? 'Edit Goal' : 'Create New Goal'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Goal Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Reach $10K profit"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Goal Type *</label>
                <select
                  className="form-select"
                  value={formData.goal_type}
                  onChange={(e) => setFormData({ ...formData, goal_type: e.target.value })}
                >
                  {goalTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Target Value * ({getGoalUnit(formData.goal_type)})
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: parseFloat(e.target.value) })}
                  placeholder="Enter target value"
                  step="any"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Deadline (Optional)</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="form-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Why is this goal important to you?"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-buttons">
                <button type="button" className="form-btn secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="form-btn primary">
                  {editingGoal ? 'Save Changes' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </JournalLayout>
  );
}

function GoalCard({ goal, onEdit, onDelete, onStatusChange, getGoalIcon, getGoalUnit }) {
  const progressColor = goal.percent_complete >= 100
    ? '#10b981'
    : goal.percent_complete >= 50
      ? '#667eea'
      : goal.percent_complete >= 25
        ? '#f59e0b'
        : '#ef4444';

  const formatValue = (value, type) => {
    const unit = getGoalUnit(type);
    if (unit === '$') return `$${value?.toLocaleString() || 0}`;
    if (unit === '%') return `${value || 0}%`;
    if (unit === 'R') return `${value || 0}R`;
    return `${value || 0} ${unit}`;
  };

  return (
    <div className={`goal-card ${goal.status}`}>
      <div className="goal-header">
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <span className="goal-icon">{getGoalIcon(goal.goal_type)}</span>
          <div>
            <div className="goal-name">{goal.name}</div>
            <div className="goal-type">{goal.goal_type.replace('_', ' ')}</div>
          </div>
        </div>
        <div className="goal-actions">
          <button className="action-btn" onClick={onEdit}>Edit</button>
          {goal.status === 'active' && (
            <button
              className="action-btn complete"
              onClick={() => onStatusChange(goal, 'completed')}
            >
              Complete
            </button>
          )}
          <button className="action-btn delete" onClick={onDelete}>Delete</button>
        </div>
      </div>

      <div className="progress-section">
        <div className="progress-header">
          <span className="progress-label">Progress</span>
          <span className="progress-value">{goal.percent_complete || 0}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${Math.min(100, goal.percent_complete || 0)}%`,
              background: progressColor,
            }}
          />
        </div>
      </div>

      <div className="target-info">
        <div className="target-item">
          <div className="target-label">Current</div>
          <div className={`target-value ${goal.current_value >= 0 ? 'positive' : 'negative'}`}>
            {formatValue(goal.current_value, goal.goal_type)}
          </div>
        </div>
        <div className="target-item">
          <div className="target-label">Target</div>
          <div className="target-value">
            {formatValue(goal.target_value, goal.goal_type)}
          </div>
        </div>
        <div className="target-item">
          <div className="target-label">Status</div>
          {goal.is_on_track !== null ? (
            <span className={`track-badge ${goal.is_on_track ? 'on-track' : 'behind'}`}>
              {goal.is_on_track ? '✓ On Track' : '⚠ Behind'}
            </span>
          ) : (
            <span className="target-value">-</span>
          )}
        </div>
      </div>

      {goal.milestones && goal.milestones.length > 0 && (
        <div className="milestones">
          {goal.milestones.map((m, i) => (
            <div key={i} className="milestone">
              <div className={`milestone-check ${m.completed ? 'completed' : ''}`}>
                {m.completed ? '✓' : ''}
              </div>
              <span className={`milestone-text ${m.completed ? 'completed' : ''}`}>
                {m.name || formatValue(m.value, goal.goal_type)}
              </span>
            </div>
          ))}
        </div>
      )}

      {goal.deadline && (
        <div className="deadline">
          Deadline: {new Date(goal.deadline).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps({ req }) {
  try {
    const journalUser = await getJournalUser(req);
    if (!journalUser) {
      return { redirect: { destination: '/trading-journal/login', permanent: false } };
    }

    return {
      props: {
        user: {
          id: journalUser.id,
          email: journalUser.email,
          fullName: journalUser.full_name || null,
        },
        settings: {
          account_size: journalUser.account_size,
          base_currency: journalUser.base_currency,
          timezone: journalUser.timezone,
        },
      },
    };
  } catch (err) {
    console.error('Goals page error:', err);
    return { redirect: { destination: '/trading-journal/login', permanent: false } };
  }
}
