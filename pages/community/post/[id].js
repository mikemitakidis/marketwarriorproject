import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getUserFromRequest, getGateStatus, getServiceSupabase } from '../../../lib/serverAuth';

/**
 * Community Forum - Single Post View
 *
 * Shows full post content with comments, likes, and view tracking.
 */
export async function getServerSideProps({ req, params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return { redirect: { destination: '/login', permanent: false } };
    }

    const gate = await getGateStatus(user.id);
    if (!gate.hasPaid) {
      return { redirect: { destination: '/pay', permanent: false } };
    }

    const supabase = getServiceSupabase();
    const { id } = params;

    // Fetch post
    const { data: post, error } = await supabase
      .from('forum_posts')
      .select('id, user_id, category_id, author_name, title, content, day_number, likes_count, comments_count, views_count, status, is_pinned, is_locked, created_at')
      .eq('id', id)
      .eq('status', 'published')
      .single();

    if (error || !post) {
      return { notFound: true };
    }

    // Get category info
    const { data: category } = await supabase
      .from('forum_categories')
      .select('slug, name')
      .eq('id', post.category_id)
      .single();

    // Fetch comments
    const { data: comments } = await supabase
      .from('forum_comments')
      .select('id, user_id, author_name, content, likes_count, created_at')
      .eq('post_id', id)
      .eq('status', 'published')
      .order('created_at', { ascending: true });

    // Check if user liked the post
    const { data: postLike } = await supabase
      .from('forum_post_likes')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('post_id', id)
      .maybeSingle();

    // Check which comments user liked
    const commentIds = (comments || []).map(c => c.id);
    let commentLikes = {};
    if (commentIds.length > 0) {
      const { data: likes } = await supabase
        .from('forum_comment_likes')
        .select('comment_id')
        .eq('user_id', user.id)
        .in('comment_id', commentIds);
      (likes || []).forEach(l => { commentLikes[l.comment_id] = true; });
    }

    return {
      props: {
        post: {
          ...post,
          category_slug: category?.slug || 'general',
          category_name: category?.name || 'General',
          user_has_liked: !!postLike,
        },
        comments: (comments || []).map(c => ({
          ...c,
          user_has_liked: !!commentLikes[c.id],
          is_own: c.user_id === user.id,
        })),
        userName: gate.fullName || 'Trader',
        userId: user.id,
      },
    };
  } catch (err) {
    return { notFound: true };
  }
}

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function PostPage({ post, comments, userName, userId }) {
  const router = useRouter();
  const [commentContent, setCommentContent] = useState('');
  const [nameType, setNameType] = useState('fullname');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [localComments, setLocalComments] = useState(comments);
  const [postLiked, setPostLiked] = useState(post.user_has_liked);
  const [postLikes, setPostLikes] = useState(post.likes_count);
  const [viewsCount, setViewsCount] = useState(post.views_count);

  // Record view on mount
  useEffect(() => {
    fetch('/api/community/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ post_id: post.id }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.views_count) setViewsCount(data.views_count);
      })
      .catch(() => {});
  }, [post.id]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handlePostLike = async () => {
    try {
      const res = await fetch('/api/community/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: 'post', target_id: post.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setPostLiked(data.liked);
        setPostLikes(data.likes_count);
      }
    } catch (err) { /* ignore */ }
  };

  const handleCommentLike = async (commentId) => {
    try {
      const res = await fetch('/api/community/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: 'comment', target_id: commentId }),
      });
      const data = await res.json();
      if (res.ok) {
        setLocalComments(prev => prev.map(c =>
          c.id === commentId ? { ...c, likes_count: data.likes_count, user_has_liked: data.liked } : c
        ));
      }
    } catch (err) { /* ignore */ }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentContent.trim() || post.is_locked) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          post_id: post.id,
          content: commentContent.trim(),
          author_name: nameType === 'nickname' ? nickname : userName,
          name_type: nameType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post comment');

      setLocalComments([...localComments, data]);
      setCommentContent('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>{post.title} - Community - Market Warrior</title>
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
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 24px; background: #1e293b; border-bottom: 1px solid #334155;
        }
        .logo { font-size: 1.25rem; font-weight: 700; color: #667eea; text-decoration: none; }
        .user-section { display: flex; align-items: center; gap: 16px; }
        .user-name { color: #94a3b8; }
        .logout-btn {
          background: #ef4444; color: white; border: none;
          padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.875rem;
        }
        .container { max-width: 800px; margin: 0 auto; padding: 24px; }
        .back-link { color: #667eea; text-decoration: none; display: inline-block; margin-bottom: 20px; font-size: 0.875rem; }
        .post-card {
          background: #1e293b; padding: 32px; border-radius: 16px; margin-bottom: 24px;
          border: 1px solid #334155;
        }
        .post-badges { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
        .badge { padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
        .badge-pinned { background: #fbbf24; color: #78350f; }
        .badge-locked { background: #64748b; color: white; }
        .badge-category { background: #667eea22; color: #667eea; }
        .badge-day { background: #10b98122; color: #10b981; }
        .post-title { font-size: 1.75rem; margin-bottom: 12px; line-height: 1.3; }
        .post-meta { color: #64748b; font-size: 0.875rem; margin-bottom: 24px; display: flex; gap: 16px; flex-wrap: wrap; }
        .post-content { line-height: 1.8; color: #cbd5e1; white-space: pre-wrap; font-size: 1rem; }
        .post-actions {
          display: flex; gap: 24px; margin-top: 24px; padding-top: 16px;
          border-top: 1px solid #334155; align-items: center;
        }
        .like-btn {
          background: none; border: 1px solid #334155; cursor: pointer;
          display: flex; align-items: center; gap: 6px; font-size: 0.9rem;
          color: #94a3b8; padding: 8px 16px; border-radius: 8px; transition: all 0.15s;
        }
        .like-btn:hover { border-color: #ef4444; color: #ef4444; }
        .like-btn.liked { border-color: #ef4444; color: #ef4444; background: #ef444410; }
        .stat-text { color: #64748b; font-size: 0.85rem; }
        .comments-section {
          background: #1e293b; padding: 24px; border-radius: 16px;
          border: 1px solid #334155;
        }
        .comments-header { font-size: 1.25rem; margin-bottom: 20px; }
        .comment {
          background: #0f172a; padding: 16px; border-radius: 10px; margin-bottom: 12px;
          border: 1px solid #1e293b;
        }
        .comment-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .comment-author { font-weight: 600; color: #667eea; font-size: 0.9rem; }
        .comment-date { color: #64748b; font-size: 0.75rem; }
        .comment-content { color: #cbd5e1; line-height: 1.6; white-space: pre-wrap; font-size: 0.9rem; }
        .comment-actions { margin-top: 8px; }
        .comment-like-btn {
          background: none; border: none; cursor: pointer;
          display: flex; align-items: center; gap: 4px;
          font-size: 0.8rem; color: #64748b; padding: 4px 0;
        }
        .comment-like-btn.liked { color: #ef4444; }
        .comment-like-btn:hover { color: #ef4444; }
        .comment-form { margin-top: 24px; padding-top: 20px; border-top: 1px solid #334155; }
        .comment-form h3 { margin-bottom: 16px; font-size: 1rem; }
        .name-row { display: flex; gap: 16px; align-items: center; margin-bottom: 12px; }
        .name-row label { cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: #94a3b8; }
        .nickname-input {
          width: 100%; padding: 8px 12px; border: 1px solid #334155; border-radius: 6px;
          background: #0f172a; color: white; font-size: 0.85rem; margin-bottom: 12px;
        }
        .comment-textarea {
          width: 100%; min-height: 80px; padding: 12px; border: 2px solid #334155;
          border-radius: 8px; background: #0f172a; color: white; font-size: 0.9rem;
          resize: vertical; margin-bottom: 12px; font-family: inherit;
        }
        .comment-textarea:focus { outline: none; border-color: #667eea; }
        .btn-submit {
          background: linear-gradient(135deg, #667eea, #764ba2); color: white;
          border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600;
          cursor: pointer; font-size: 0.9rem;
        }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .error { color: #ef4444; margin-top: 8px; font-size: 0.875rem; }
        .empty-comments { color: #64748b; text-align: center; padding: 32px; }
        .locked-notice {
          background: #334155; padding: 16px; border-radius: 8px;
          text-align: center; color: #94a3b8; margin-top: 20px;
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
        <a href={`/community/${post.category_slug}`} className="back-link">← Back to {post.category_name}</a>

        <div className="post-card">
          <div className="post-badges">
            <span className="badge badge-category">{post.category_name}</span>
            {post.day_number && <span className="badge badge-day">Day {post.day_number}</span>}
            {post.is_pinned && <span className="badge badge-pinned">Pinned</span>}
            {post.is_locked && <span className="badge badge-locked">Locked</span>}
          </div>

          <h1 className="post-title">{post.title}</h1>

          <div className="post-meta">
            <span>By {post.author_name}</span>
            <span>{timeAgo(post.created_at)}</span>
          </div>

          <div className="post-content">{post.content}</div>

          <div className="post-actions">
            <button className={`like-btn ${postLiked ? 'liked' : ''}`} onClick={handlePostLike}>
              {postLiked ? '\u2764' : '\u2661'} {postLikes} {postLikes === 1 ? 'Like' : 'Likes'}
            </button>
            <span className="stat-text">{post.comments_count} comments</span>
            <span className="stat-text">{viewsCount} views</span>
          </div>
        </div>

        <div className="comments-section">
          <h2 className="comments-header">Comments ({localComments.length})</h2>

          {localComments.length === 0 ? (
            <div className="empty-comments">No comments yet. Be the first to comment!</div>
          ) : (
            localComments.map((comment) => (
              <div key={comment.id} className="comment">
                <div className="comment-top">
                  <span className="comment-author">{comment.author_name}</span>
                  <span className="comment-date">{timeAgo(comment.created_at)}</span>
                </div>
                <div className="comment-content">{comment.content}</div>
                <div className="comment-actions">
                  <button
                    className={`comment-like-btn ${comment.user_has_liked ? 'liked' : ''}`}
                    onClick={() => handleCommentLike(comment.id)}
                  >
                    {comment.user_has_liked ? '\u2764' : '\u2661'} {comment.likes_count}
                  </button>
                </div>
              </div>
            ))
          )}

          {post.is_locked ? (
            <div className="locked-notice">
              This post is locked. No new comments can be added.
            </div>
          ) : (
            <form className="comment-form" onSubmit={handleSubmitComment}>
              <h3>Add a Comment</h3>

              <div className="name-row">
                <label>
                  <input type="radio" name="commentNameType" value="fullname" checked={nameType === 'fullname'} onChange={() => setNameType('fullname')} />
                  Full Name
                </label>
                <label>
                  <input type="radio" name="commentNameType" value="nickname" checked={nameType === 'nickname'} onChange={() => setNameType('nickname')} />
                  Nickname
                </label>
              </div>

              {nameType === 'nickname' && (
                <input
                  className="nickname-input"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter your nickname"
                  maxLength={50}
                  required
                />
              )}

              <textarea
                className="comment-textarea"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Write a comment..."
                maxLength={5000}
                required
              />
              <button type="submit" className="btn-submit" disabled={submitting || !commentContent.trim()}>
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
