import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getUserFromRequest, getGateStatus, getServiceSupabase } from '../../lib/serverAuth';
import AnnouncementBanner from '../../components/AnnouncementBanner';

/**
 * Community forum page.
 *
 * Displays forum threads for paid users.
 * Uses the new schema: forum_threads, forum_comments
 */
export async function getServerSideProps({ req }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return { redirect: { destination: '/login', permanent: false } };
    }

    const gate = await getGateStatus(user.id);
    // Free users are redirected to the free trading journal
    if (!gate.hasPaid) {
      return { redirect: { destination: '/trading-journal', permanent: false } };
    }
    if (!gate.welcomeCompleted) {
      return { redirect: { destination: '/welcome', permanent: false } };
    }

    const supabase = getServiceSupabase();

    // Fetch threads with author info (using forum_threads - correct table!)
    const { data: threads } = await supabase
      .from('forum_threads')
      .select(`
        id,
        title,
        body,
        is_pinned,
        is_locked,
        created_at,
        author:author_id (full_name)
      `)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    // Get comment counts for threads
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
  const [showNewThread, setShowNewThread] = useState(false);
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
    if (!title.trim() || !body.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create thread');

      setTitle('');
      setBody('');
      setShowNewThread(false);
      router.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Community - Market Warrior</title>
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0f172a;
          color: white;
          min-height: 100vh;
        }
      `}</style>

      <style jsx>{`
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.25rem;
          font-weight: 700;
          color: #667eea;
          text-decoration: none;
        }
        .user-section { display: flex; align-items: center; gap: 16px; }
        .user-name { color: #94a3b8; }
        .logout-btn {
          background: #ef4444;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
        }
        .container { max-width: 900px; margin: 0 auto; padding: 24px; }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .page-header h1 { font-size: 2rem; }
        .btn {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary { background: #334155; }
        .back-link {
          color: #667eea;
          text-decoration: none;
          margin-bottom: 16px;
          display: inline-block;
        }
        .new-thread-form {
          background: #1e293b;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 24px;
        }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; margin-bottom: 8px; color: #94a3b8; }
        .form-group input, .form-group textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #334155;
          border-radius: 8px;
          background: #0f172a;
          color: white;
          font-size: 1rem;
        }
        .form-group textarea { min-height: 150px; resize: vertical; }
        .form-actions { display: flex; gap: 12px; }
        .error { color: #ef4444; margin-top: 12px; }
        .thread-list { display: flex; flex-direction: column; gap: 16px; }
        .thread-card {
          background: #1e293b;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #334155;
          cursor: pointer;
          transition: all 0.2s;
        }
        .thread-card:hover { border-color: #667eea; transform: translateY(-2px); }
        .thread-header { display: flex; justify-content: space-between; align-items: start; }
        .thread-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 8px; }
        .thread-meta { display: flex; gap: 16px; color: #64748b; font-size: 0.875rem; }
        .thread-preview { color: #94a3b8; margin-top: 8px; }
        .pinned-badge {
          background: #fbbf24;
          color: #78350f;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .locked-badge {
          background: #64748b;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
        }
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }
      `}</style>

      <AnnouncementBanner type="student" />

      <header className="header">
        <a href="/dashboard" className="logo">Market Warrior</a>
        <div className="user-section">
          <a href="/students-affiliate" style={{ color: '#10b981', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}>Refer & Earn 30%</a>
          <span className="user-name">{userName}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="container">
        <a href="/dashboard" className="back-link">← Back to Dashboard</a>

        <div className="page-header">
          <h1>💬 Community Forum</h1>
          <button className="btn" onClick={() => setShowNewThread(!showNewThread)}>
            {showNewThread ? 'Cancel' : '+ New Thread'}
          </button>
        </div>

        {showNewThread && (
          <form className="new-thread-form" onSubmit={handleCreateThread}>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's on your mind?"
                required
              />
            </div>
            <div className="form-group">
              <label>Content</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Share your thoughts, questions, or insights..."
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? 'Posting...' : 'Post Thread'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowNewThread(false)}>
                Cancel
              </button>
            </div>
            {error && <p className="error">{error}</p>}
          </form>
        )}

        {threads.length === 0 ? (
          <div className="empty-state">
            <h2>No threads yet</h2>
            <p>Be the first to start a conversation!</p>
          </div>
        ) : (
          <div className="thread-list">
            {threads.map((thread) => (
              <div
                key={thread.id}
                className="thread-card"
                onClick={() => router.push(`/community/post/${thread.id}`)}
              >
                <div className="thread-header">
                  <div className="thread-title">{thread.title}</div>
                  <div>
                    {thread.is_pinned && <span className="pinned-badge">📌 Pinned</span>}
                    {thread.is_locked && <span className="locked-badge">🔒 Locked</span>}
                  </div>
                </div>
                <div className="thread-meta">
                  <span>By {thread.authorName}</span>
                  <span>{new Date(thread.created_at).toLocaleDateString()}</span>
                  <span>{thread.commentCount} comments</span>
                </div>
                <div className="thread-preview">
                  {thread.body?.substring(0, 150)}
                  {thread.body?.length > 150 ? '...' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
