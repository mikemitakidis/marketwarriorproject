import { getJournalUser, getServiceSupabase, checkJournalAccess } from '../../lib/journalAuth';
import JournalLayout from '../../components/journal/JournalLayout';
import { useState, useEffect } from 'react';
import Link from 'next/link';

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

export default function TradesPage({ user, settings }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    symbol: '',
    direction: '',
    start_date: '',
    end_date: '',
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    fetchTrades();
  }, [filters, page]);

  const fetchTrades = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.symbol) params.append('symbol', filters.symbol);
    if (filters.direction) params.append('direction', filters.direction);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    params.append('limit', pageSize);
    params.append('offset', page * pageSize);

    try {
      const res = await fetch(`/api/journal/trades?${params}`);
      const data = await res.json();
      if (res.ok) {
        setTrades(data.trades);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Error fetching trades:', err);
    }
    setLoading(false);
  };

  const formatCurrency = (value) => {
    const currency = settings?.base_currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this trade?')) return;

    try {
      const res = await fetch(`/api/journal/trades/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTrades();
      }
    } catch (err) {
      console.error('Error deleting trade:', err);
    }
  };

  return (
    <JournalLayout user={user} title="Trade Log" settings={settings}>
      <style jsx global>{`
        .dashboard-header-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 24px;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px;
          border-radius: 10px;
          width: fit-content;
        }
        .dashboard-header-tabs a {
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff !important;
          text-decoration: none !important;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.15s;
        }
        .dashboard-header-tabs a:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.25);
        }
        .dashboard-header-tabs a.active {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.35);
        }
      `}</style>
      <style jsx>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
        }
        .add-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .add-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .filters {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 24px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .filter-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
        }
        .filter-input, .filter-select {
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          color: white;
          font-size: 0.875rem;
          min-width: 120px;
        }
        .filter-input:focus, .filter-select:focus {
          outline: none;
          border-color: #667eea;
        }
        .filter-select option {
          background: #1e293b;
        }
        .clear-btn {
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: rgba(255, 255, 255, 0.7);
          border-radius: 6px;
          cursor: pointer;
          align-self: flex-end;
        }
        .clear-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .table-container {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
        }
        .trades-table {
          width: 100%;
          border-collapse: collapse;
        }
        .trades-table th, .trades-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .trades-table th {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.7);
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
        }
        .trades-table tbody tr:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        .symbol {
          font-weight: 600;
          color: white;
        }
        .direction {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .direction-long {
          background: rgba(74, 222, 128, 0.2);
          color: #4ade80;
        }
        .direction-short {
          background: rgba(248, 113, 113, 0.2);
          color: #f87171;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .status-open {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
        }
        .status-closed {
          background: rgba(74, 222, 128, 0.2);
          color: #4ade80;
        }
        .positive { color: #4ade80; }
        .negative { color: #f87171; }
        .tags {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .tag {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
          background: rgba(102, 126, 234, 0.2);
          color: #667eea;
        }
        .actions {
          display: flex;
          gap: 8px;
        }
        .action-btn {
          padding: 6px 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.75rem;
          transition: all 0.2s;
        }
        .edit-btn {
          background: rgba(102, 126, 234, 0.2);
          color: #667eea;
        }
        .edit-btn:hover {
          background: rgba(102, 126, 234, 0.3);
        }
        .delete-btn {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        .delete-btn:hover {
          background: rgba(239, 68, 68, 0.3);
        }
        .pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .page-info {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.875rem;
        }
        .page-btns {
          display: flex;
          gap: 8px;
        }
        .page-btn {
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .page-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
        }
        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
        .loading {
          text-align: center;
          padding: 40px;
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>

      {/* Header Tabs */}
      <div className="dashboard-header-tabs">
        <Link href="/trading-journal">Overview</Link>
        <Link href="/trading-journal/trades" className="active">Trade Log</Link>
        <Link href="/trading-journal/add-trade">Add Trade</Link>
      </div>

      <div className="page-header">
        <h1 className="page-title">Trade Log</h1>
        <Link href="/trading-journal/add-trade" className="add-btn">
          ➕ Add Trade
        </Link>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label className="filter-label">Status</label>
          <select
            className="filter-select"
            value={filters.status}
            onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(0); }}
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Symbol</label>
          <input
            type="text"
            className="filter-input"
            placeholder="e.g., AAPL"
            value={filters.symbol}
            onChange={(e) => { setFilters({ ...filters, symbol: e.target.value }); setPage(0); }}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">Direction</label>
          <select
            className="filter-select"
            value={filters.direction}
            onChange={(e) => { setFilters({ ...filters, direction: e.target.value }); setPage(0); }}
          >
            <option value="">All</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">From</label>
          <input
            type="date"
            className="filter-input"
            value={filters.start_date}
            onChange={(e) => { setFilters({ ...filters, start_date: e.target.value }); setPage(0); }}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">To</label>
          <input
            type="date"
            className="filter-input"
            value={filters.end_date}
            onChange={(e) => { setFilters({ ...filters, end_date: e.target.value }); setPage(0); }}
          />
        </div>
        <button
          className="clear-btn"
          onClick={() => { setFilters({ status: '', symbol: '', direction: '', start_date: '', end_date: '' }); setPage(0); }}
        >
          Clear Filters
        </button>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading">Loading trades...</div>
        ) : trades.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <p>No trades found</p>
            <p style={{ marginTop: '8px' }}>
              <Link href="/trading-journal/add-trade" style={{ color: '#667eea' }}>
                Add your first trade
              </Link>
            </p>
          </div>
        ) : (
          <>
            <table className="trades-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Symbol</th>
                  <th>Direction</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Qty</th>
                  <th>P&L</th>
                  <th>R</th>
                  <th>Status</th>
                  <th>Tags</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id}>
                    <td>{formatDate(trade.entry_date)}</td>
                    <td className="symbol">{trade.symbol}</td>
                    <td>
                      <span className={`direction direction-${trade.direction}`}>
                        {trade.direction}
                      </span>
                    </td>
                    <td>{trade.entry_price?.toFixed(2)}</td>
                    <td>{trade.exit_price?.toFixed(2) || '-'}</td>
                    <td>{trade.quantity}</td>
                    <td className={trade.pnl_amount >= 0 ? 'positive' : 'negative'}>
                      {trade.pnl_amount !== null ? formatCurrency(trade.pnl_amount) : '-'}
                    </td>
                    <td className={trade.r_multiple >= 0 ? 'positive' : 'negative'}>
                      {trade.r_multiple !== null ? `${trade.r_multiple >= 0 ? '+' : ''}${trade.r_multiple.toFixed(2)}R` : '-'}
                    </td>
                    <td>
                      <span className={`status-badge status-${trade.status}`}>
                        {trade.status}
                      </span>
                    </td>
                    <td>
                      <div className="tags">
                        {trade.tags?.slice(0, 3).map((tag) => (
                          <span key={tag.id} className="tag" style={{ backgroundColor: `${tag.color}20`, color: tag.color }}>
                            {tag.name}
                          </span>
                        ))}
                        {trade.tags?.length > 3 && (
                          <span className="tag">+{trade.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="actions">
                        <Link href={`/trading-journal/edit-trade?id=${trade.id}`}>
                          <button className="action-btn edit-btn">Edit</button>
                        </Link>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDelete(trade.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <div className="page-info">
                Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, total)} of {total} trades
              </div>
              <div className="page-btns">
                <button
                  className="page-btn"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                >
                  Previous
                </button>
                <button
                  className="page-btn"
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * pageSize >= total}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </JournalLayout>
  );
}
