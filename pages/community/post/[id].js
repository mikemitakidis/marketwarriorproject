import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getUserFromRequest, getGateStatus, getServiceSupabase } from '../../../lib/serverAuth';

/**
 * Single thread view with comments.
 *
 * Displays full thread content and comments.
 * Uses the correct schema: forum_threads, forum_comments
 */
export async function getServerSideProps({ req, params }) {
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

    const supabase = getServiceSupabase();
    const { id } = params;

    // Fetch thread with author info
    const { data: thread, error } = await supabase
      .from('forum_threads')
      .select(`
        id,
        title,
        body,
        is_pinned,
        is_locked,
        created_at,
        author:author_id (id, full_name)
      `)
      .eq('id', id)
      .single();

    if (error || !thread) {
      return { notFound: true };
    }

    // Fetch comments for the thread
    const { data: comments } = await supabase
      .from('forum_comments')
      .select(`
        id,
        body,
        created_at,
        author:author_id (id, full_name)
      `)
      .eq('thread_id', id)
      .order('created_at', { ascending: true });

    return {
      props: {
        thread: {
          ...thread,
          authorName: thread.author?.full_name || 'Anonymous',
        },
        comments: (comments || []).map(c => ({
          ...c,
          authorName: c.author?.full_name || 'Anonymous',
        })),
        userName: gate.fullName || 'Trader',
        userId: user.id,
      },
    };
  } catch (err) {
    console.error('Thread page error:', err);
    return { notFound: true };
  }
}

export default function ThreadPage({ thread, comments, userName, userId }) {
  const router = useRouter();
  const [commentBody, setCommentBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [localComments, setLocalComments] = useState(comments);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentBody.trim() || thread.is_locked) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/community/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ thread_id: thread.id, body: commentBody.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post comment');

      // Add new comment to local state
      setLocalComments([...localComments, {
        ...data,
        authorName: userName,
      }]);
      setCommentBody('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>{thread.title} - Community - Market Warrior</title>
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
        .back-link {
          color: #667eea;
          text-decoration: none;
          margin-bottom: 24px;
          display: inline-block;
        }
        .thread-card {
          background: #1e293b;
          padding: 32px;
          border-radius: 16px;
          margin-bottom: 24px;
        }
        .thread-title { font-size: 1.75rem; margin-bottom: 12px; }
        .thread-meta { color: #64748b; font-size: 0.875rem; margin-bottom: 24px; }
        .thread-body { line-height: 1.8; color: #cbd5e1; white-space: pre-wrap; }
        .badges { margin-bottom: 16px; display: flex; gap: 8px; }
        .badge {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .badge-pinned { background: #fbbf24; color: #78350f; }
        .badge-locked { background: #64748b; color: white; }
        .comments-section {
          background: #1e293b;
          padding: 24px;
          border-radius: 16px;
        }
        .comments-section h2 { margin-bottom: 24px; font-size: 1.5rem; }
        .comment {
          background: #0f172a;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .comment-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .comment-author { font-weight: 600; color: #667eea; }
        .comment-date { color: #64748b; font-size: 0.75rem; }
        .comment-body { color: #cbd5e1; line-height: 1.6; white-space: pre-wrap; }
        .comment-form { margin-top: 24px; }
        .comment-form textarea {
          width: 100%;
          min-height: 100px;
          padding: 12px;
          border: 2px solid #334155;
          border-radius: 8px;
          background: #0f172a;
          color: white;
          font-size: 1rem;
          resize: vertical;
          margin-bottom: 12px;
        }
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
        .error { color: #ef4444; margin-top: 12px; }
        .empty-comments { color: #64748b; text-align: center; padding: 40px; }
        .locked-notice {
          background: #334155;
          padding: 16px;
          border-radius: 8px;
          text-align: center;
          color: #94a3b8;
          margin-top: 24px;
        }
      `}</style>

      <header className="header">
        <a href="/dashboard" className="logo">Market Warrior</a>
        <div className="user-section">
          <span className="user-name">{userName}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="container">
        <a href="/community" className="back-link">← Back to Community</a>

        <div className="thread-card">
          {(thread.is_pinned || thread.is_locked) && (
            <div className="badges">
              {thread.is_pinned && <span className="badge badge-pinned">📌 Pinned</span>}
              {thread.is_locked && <span className="badge badge-locked">🔒 Locked</span>}
            </div>
          )}
          <h1 className="thread-title">{thread.title}</h1>
          <div className="thread-meta">
            By {thread.authorName} • {new Date(thread.created_at).toLocaleDateString()}
          </div>
          <div className="thread-body">{thread.body}</div>
        </div>

        <div className="comments-section">
          <h2>Comments ({localComments.length})</h2>

          {localComments.length === 0 ? (
            <div className="empty-comments">No comments yet. Be the first to comment!</div>
          ) : (
            localComments.map((comment) => (
              <div key={comment.id} className="comment">
                <div className="comment-header">
                  <span className="comment-author">{comment.authorName}</span>
                  <span className="comment-date">{new Date(comment.created_at).toLocaleString()}</span>
                </div>
                <div className="comment-body">{comment.body}</div>
              </div>
            ))
          )}

          {thread.is_locked ? (
            <div className="locked-notice">
              🔒 This thread is locked. No new comments can be added.
            </div>
          ) : (
            <form className="comment-form" onSubmit={handleSubmitComment}>
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Write a comment..."
                required
              />
              <button type="submit" className="btn" disabled={submitting || !commentBody.trim()}>
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
              {error && <p className="error">{error}</p>}
            </form>
          )}
        </div>
      </div>
    </>
  );
}
