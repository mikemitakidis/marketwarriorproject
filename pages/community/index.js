import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getUserFromRequest, getGateStatus, getServiceSupabase } from '../../lib/serverAuth';

export async function getServerSideProps({ req }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return { redirect: { destination: '/login', permanent: false } };
    }

    const gate = await getGateStatus(user.id);
    if (!gate.hasPaid) {
      return { redirect: { destination: '/pay', permanent: false } };
    }
    if (!gate.welcomeCompleted) {
      return { redirect: { destination: '/welcome', permanent: false } };
    }

    const supabase = getServiceSupabase();

    const { data: threads } = await supabase
      .from('forum_threads')
      .select(`
        id,
        title,
        body,
        category,
        day_number,
        is_pinned,
        is_locked,
        likes_count,
        views_count,
        created_at,
        author:author_id (full_name, is_admin)
      `)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    const threadIds = (threads || []).map(t => t.id);
    let commentCounts = {};
    if (threadIds.length > 0) {
      const { data: counts } = await supabase
        .from('forum_comments')
        .select('thread_id')
        .in('thread_id', threadIds);

      commentCounts = (counts || []).reduce((acc, c) => {
        acc[c.thread_id] = (acc[c.thread_id] || 0) + 1;
        return acc;
      }, {});
    }

    return {
      props: {
        threads: (threads || []).map(t => ({
          ...t,
          commentCount: commentCounts[t.id] || 0,
          authorName: t.author?.full_name || 'Anonymous',
          isAdmin: t.author?.is_admin || false,
        })),
        userName: gate.fullName || 'Trader',
      },
    };
  } catch (err) {
    console.error('Community error:', err);
    return { redirect: { destination: '/dashboard', permanent: false } };
  }
}

export default function CommunityPage({ threads, userName }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showDaysSubmenu, setShowDaysSubmenu] = useState(false);

  // Form state
  const [nickname, setNickname] = useState(userName);
  const [category, setCategory] = useState('');
  const [dayNumber, setDayNumber] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !category) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          category,
          dayNumber: category === 'days' ? parseInt(dayNumber) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create thread');

      setShowModal(false);
      setTitle('');
      setBody('');
      setCategory('');
      setDayNumber('');
      router.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredThreads = threads.filter(t => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'days-all') return t.category === 'days';
    if (activeCategory.startsWith('day-')) {
      const dayNum = parseInt(activeCategory.split('-')[1]);
      return t.category === 'days' && t.day_number === dayNum;
    }
    return t.category === activeCategory;
  });

  const formatTimeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getCategoryLabel = (cat) => {
    const labels = {
      general: '💬 General',
      days: '📚 Days 1-30',
      journal: '📊 Trading Journal',
      other: '📁 Other',
    };
    return labels[cat] || cat;
  };

  return (
    <>
      <Head>
        <title>Community Forum - Market Warrior</title>
        <link rel="icon" type="image/png" href="/logo.png" />
      </Head>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
          color: #e0e0e0;
          min-height: 100vh;
        }
      `}</style>

      <style jsx>{`
        /* Header */
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 25px 40px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
        }

        .header h1 {
          font-size: 28px;
          color: white;
          margin: 0 0 5px 0;
        }

        .header p {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .create-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: none;
          padding: 12px 25px;
          border-radius: 25px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
        }

        .create-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .logout-btn {
          background: rgba(239, 68, 68, 0.3);
          color: white;
          border: 1px solid rgba(239, 68, 68, 0.5);
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.5);
        }

        /* Container */
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 30px 20px;
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 30px;
        }

        /* Sidebar */
        .sidebar h3 {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 15px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .category-list {
          list-style: none;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 15px;
          overflow: hidden;
        }

        .category-list li {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px 20px;
          cursor: pointer;
          transition: all 0.2s;
          border-left: 3px solid transparent;
        }

        .category-list li:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .category-list li.active {
          background: rgba(102, 126, 234, 0.2);
          border-left-color: #667eea;
        }

        .cat-icon {
          font-size: 20px;
        }

        .subcategories {
          display: none;
          padding-left: 30px;
          background: rgba(0, 0, 0, 0.2);
          max-height: 300px;
          overflow-y: auto;
        }

        .subcategories.visible {
          display: block;
        }

        .subcategories li {
          padding: 10px 20px;
          font-size: 12px;
          border-left: none;
        }

        /* Posts Feed */
        .posts-feed {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Post Card */
        .post-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
          transition: all 0.2s;
          cursor: pointer;
        }

        .post-card:hover {
          border-color: rgba(255, 255, 255, 0.15);
        }

        .post-card.pinned {
          border-color: rgba(102, 126, 234, 0.5);
          background: rgba(102, 126, 234, 0.05);
        }

        .pinned-badge {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 5px 15px;
          font-size: 12px;
          font-weight: 600;
        }

        .post-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px 20px 0 20px;
        }

        .author-info {
          display: flex;
          gap: 12px;
        }

        .avatar {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          font-size: 18px;
        }

        .author-name {
          font-weight: 600;
          color: white;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .admin-badge {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 600;
        }

        .post-meta {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .category-tag {
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 10px;
          border-radius: 10px;
          font-size: 11px;
        }

        .day-tag {
          background: rgba(74, 222, 128, 0.2);
          color: #4ade80;
          padding: 2px 10px;
          border-radius: 10px;
          font-size: 11px;
        }

        .post-content {
          padding: 15px 20px;
        }

        .post-title {
          font-size: 18px;
          color: white;
          margin: 0 0 10px 0;
          line-height: 1.4;
        }

        .post-text {
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
          margin: 0;
        }

        .post-stats {
          padding: 10px 20px;
          display: flex;
          gap: 15px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .post-actions {
          display: flex;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .action-btn {
          flex: 1;
          padding: 12px;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        /* Modal */
        .modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal.active {
          display: flex;
        }

        .modal-content {
          background: linear-gradient(135deg, #2d2d44 0%, #1e1e2e 100%);
          border-radius: 20px;
          width: 100%;
          max-width: 550px;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 25px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          color: white;
        }

        .close-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: 28px;
          cursor: pointer;
          line-height: 1;
        }

        .close-btn:hover {
          color: white;
        }

        .form-group {
          padding: 0 25px;
          margin-bottom: 20px;
        }

        .form-group:first-of-type {
          padding-top: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 500;
        }

        .form-group select,
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 12px 15px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          color: white;
          font-size: 14px;
          transition: all 0.2s;
        }

        .form-group select:focus,
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #667eea;
          background: rgba(255, 255, 255, 0.08);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 120px;
          font-family: inherit;
        }

        .form-group select option {
          background: #2d2d44;
          color: white;
        }

        .form-group small {
          display: block;
          margin-top: 6px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
        }

        .day-selector {
          display: none;
        }

        .day-selector.visible {
          display: block;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          padding: 20px 25px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .cancel-btn {
          flex: 1;
          padding: 12px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          font-weight: 600;
        }

        .cancel-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .submit-btn {
          flex: 2;
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 10px;
          color: white;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .error-msg {
          color: #f87171;
          font-size: 14px;
          padding: 0 25px 15px;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: rgba(255, 255, 255, 0.5);
        }

        .empty-state h3 {
          margin-bottom: 10px;
          color: rgba(255, 255, 255, 0.7);
        }

        /* Responsive */
        @media (max-width: 900px) {
          .container {
            grid-template-columns: 1fr;
            padding: 15px;
          }

          .category-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            background: transparent;
          }

          .category-list > li {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 25px;
            padding: 10px 15px;
            border-left: none;
          }

          .subcategories {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div>
            <h1>💬 Community Forum</h1>
            <p>Connect, share, and learn with fellow traders</p>
          </div>
          <div className="header-right">
            <button className="create-btn" onClick={() => setShowModal(true)}>
              ✍️ Create Post
            </button>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      <div className="container">
        {/* Sidebar */}
        <aside className="sidebar">
          <h3>📁 Categories</h3>
          <ul className="category-list">
            <li
              className={activeCategory === 'all' ? 'active' : ''}
              onClick={() => setActiveCategory('all')}
            >
              <span className="cat-icon">🏠</span>
              <span>All Posts</span>
            </li>
            <li
              className={activeCategory === 'general' ? 'active' : ''}
              onClick={() => setActiveCategory('general')}
            >
              <span className="cat-icon">💬</span>
              <span>General Discussion</span>
            </li>
            <li
              className={activeCategory.startsWith('day') ? 'active' : ''}
              onClick={() => setShowDaysSubmenu(!showDaysSubmenu)}
            >
              <span className="cat-icon">📚</span>
              <span>Days 1-30 Challenge ▼</span>
            </li>
            <ul className={`subcategories ${showDaysSubmenu ? 'visible' : ''}`}>
              <li onClick={() => setActiveCategory('days-all')}>📚 All Days</li>
              {Array.from({ length: 30 }, (_, i) => (
                <li key={i + 1} onClick={() => setActiveCategory(`day-${i + 1}`)}>
                  Day {i + 1}
                </li>
              ))}
            </ul>
            <li
              className={activeCategory === 'journal' ? 'active' : ''}
              onClick={() => setActiveCategory('journal')}
            >
              <span className="cat-icon">📊</span>
              <span>Trading Journal</span>
            </li>
            <li
              className={activeCategory === 'other' ? 'active' : ''}
              onClick={() => setActiveCategory('other')}
            >
              <span className="cat-icon">📁</span>
              <span>Other</span>
            </li>
          </ul>
        </aside>

        {/* Main Content */}
        <main className="posts-feed">
          {filteredThreads.length === 0 ? (
            <div className="empty-state">
              <h3>No posts yet</h3>
              <p>Be the first to start a conversation!</p>
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <div
                key={thread.id}
                className={`post-card ${thread.is_pinned ? 'pinned' : ''}`}
                onClick={() => router.push(`/community/post/${thread.id}`)}
              >
                {thread.is_pinned && <div className="pinned-badge">📌 Pinned</div>}
                <div className="post-header">
                  <div className="author-info">
                    <div className="avatar">{thread.authorName?.charAt(0)?.toUpperCase() || 'A'}</div>
                    <div>
                      <div className="author-name">
                        {thread.authorName}
                        {thread.isAdmin && <span className="admin-badge">Admin</span>}
                      </div>
                      <div className="post-meta">
                        <span className="category-tag">{getCategoryLabel(thread.category)}</span>
                        {thread.day_number && <span className="day-tag">Day {thread.day_number}</span>}
                        <span>•</span>
                        <span>{formatTimeAgo(thread.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="post-content">
                  <h3 className="post-title">{thread.title}</h3>
                  <p className="post-text">
                    {thread.body?.substring(0, 200)}{thread.body?.length > 200 ? '...' : ''}
                  </p>
                </div>
                <div className="post-stats">
                  <span>❤️ {thread.likes_count || 0}</span>
                  <span>💬 {thread.commentCount} comments</span>
                  <span>👁️ {thread.views_count || 0} views</span>
                </div>
                <div className="post-actions">
                  <button className="action-btn" onClick={(e) => e.stopPropagation()}>🤍 Like</button>
                  <button className="action-btn">💬 Comment</button>
                  <button className="action-btn" onClick={(e) => e.stopPropagation()}>🔗 Share</button>
                </div>
              </div>
            ))
          )}
        </main>
      </div>

      {/* Create Post Modal */}
      <div className={`modal ${showModal ? 'active' : ''}`} onClick={(e) => e.target.className.includes('modal') && setShowModal(false)}>
        <div className="modal-content">
          <div className="modal-header">
            <h2>✍️ Create Post</h2>
            <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
          </div>

          <form onSubmit={handleCreateThread}>
            <div className="form-group">
              <label>Your Name / Nickname *</label>
              <input
                type="text"
                placeholder="How should we call you?"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
              <small>This will be displayed as the author of your post</small>
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} required>
                <option value="">Select a category...</option>
                <option value="general">💬 General Discussion</option>
                <option value="days">📚 Days 1-30 Challenge</option>
                <option value="journal">📊 Trading Journal</option>
                <option value="other">📁 Other</option>
              </select>
            </div>

            <div className={`form-group day-selector ${category === 'days' ? 'visible' : ''}`}>
              <label>Which Day? *</label>
              <select value={dayNumber} onChange={(e) => setDayNumber(e.target.value)}>
                <option value="">Select the day you want to discuss...</option>
                {Array.from({ length: 30 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>Day {i + 1}</option>
                ))}
              </select>
              <small>Select the specific day from the challenge</small>
            </div>

            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                placeholder="Give your post a title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Content *</label>
              <textarea
                placeholder="Share your thoughts, questions, or insights..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>

            {error && <p className="error-msg">{error}</p>}

            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? 'Posting...' : '📤 Post'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
