import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getUserFromRequest, getGateStatus, getServiceSupabase } from '../../lib/serverAuth';
import AnnouncementBanner from '../../components/AnnouncementBanner';

/**
 * Community Forum - Main Feed
 *
 * Shows all posts across categories with a sidebar for navigation.
 * Users can create posts, like, and navigate to categories.
 */
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

    // Fetch categories
    const { data: categories } = await supabase
      .from('forum_categories')
      .select('id, slug, name, description')
      .order('id');

    // Fetch recent posts (all categories)
    const { data: posts } = await supabase
      .from('forum_posts')
      .select('id, user_id, category_id, author_name, title, content, day_number, likes_count, comments_count, views_count, is_pinned, is_locked, created_at')
      .eq('status', 'published')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20);

    // Category counts
    const { data: countData } = await supabase
      .from('forum_posts')
      .select('category_id')
      .eq('status', 'published');

    const categoryCounts = {};
    (countData || []).forEach(p => {
      categoryCounts[p.category_id] = (categoryCounts[p.category_id] || 0) + 1;
    });

    // Category map
    const categoryMap = {};
    (categories || []).forEach(c => { categoryMap[c.id] = c; });

    // User's liked posts
    const postIds = (posts || []).map(p => p.id);
    let userLikes = {};
    if (postIds.length > 0) {
      const { data: likes } = await supabase
        .from('forum_post_likes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds);
      (likes || []).forEach(l => { userLikes[l.post_id] = true; });
    }

    // Fetch day titles for the create form
    const { data: dayContent } = await supabase
      .from('course_content')
      .select('day, title')
      .order('day');

    const dayTitles = {};
    (dayContent || []).forEach(d => { dayTitles[d.day] = d.title; });

    return {
      props: {
        categories: (categories || []).map(c => ({
          ...c,
          post_count: categoryCounts[c.id] || 0,
        })),
        posts: (posts || []).map(p => ({
          ...p,
          category_slug: categoryMap[p.category_id]?.slug || 'general',
          category_name: categoryMap[p.category_id]?.name || 'General',
          preview: p.content?.substring(0, 200) + (p.content?.length > 200 ? '...' : ''),
          user_has_liked: !!userLikes[p.id],
        })),
        userName: gate.fullName || 'Trader',
        userId: user.id,
        dayTitles,
      },
    };
  } catch (err) {
    return { redirect: { destination: '/dashboard', permanent: false } };
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

export default function CommunityPage({ categories, posts, userName, userId, dayTitles }) {
  const router = useRouter();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categorySlug, setCategorySlug] = useState('general');
  const [dayNumber, setDayNumber] = useState('');
  const [nameType, setNameType] = useState('fullname');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [localPosts, setLocalPosts] = useState(posts);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleLike = async (postId) => {
    try {
      const res = await fetch('/api/community/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: 'post', target_id: postId }),
      });
      const data = await res.json();
      if (res.ok) {
        setLocalPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, likes_count: data.likes_count, user_has_liked: data.liked } : p
        ));
      }
    } catch (err) { /* ignore */ }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category_slug: categorySlug,
          day_number: categorySlug === 'days-1-30' ? dayNumber : null,
          author_name: nameType === 'nickname' ? nickname : userName,
          name_type: nameType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create post');

      setTitle('');
      setContent('');
      setCategorySlug('general');
      setDayNumber('');
      setNameType('fullname');
      setNickname('');
      setShowCreatePost(false);
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
        <title>Community Forum - Market Warrior</title>
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
          font-size: 0.875rem;
        }
        .layout {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 24px;
        }
        .sidebar {
          position: sticky;
          top: 24px;
          align-self: start;
        }
        .sidebar-card {
          background: #1e293b;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #334155;
        }
        .sidebar-title {
          font-size: 0.875rem;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 16px;
          font-weight: 600;
          letter-spacing: 0.05em;
        }
        .category-list { list-style: none; }
        .category-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
          text-decoration: none;
          color: white;
          margin-bottom: 4px;
        }
        .category-item:hover { background: #334155; }
        .category-item.active { background: #667eea22; color: #667eea; }
        .category-count {
          background: #334155;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          color: #94a3b8;
        }
        .main-content { min-width: 0; }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .page-header h1 { font-size: 1.75rem; }
        .back-link {
          color: #667eea;
          text-decoration: none;
          display: inline-block;
          margin-bottom: 16px;
          font-size: 0.875rem;
        }
        .btn-primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary {
          background: #334155;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .create-form {
          background: #1e293b;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 24px;
          border: 1px solid #334155;
        }
        .create-form h2 { margin-bottom: 20px; font-size: 1.25rem; }
        .form-row { margin-bottom: 16px; }
        .form-row label { display: block; margin-bottom: 6px; color: #94a3b8; font-size: 0.875rem; }
        .form-row input, .form-row textarea, .form-row select {
          width: 100%;
          padding: 10px 12px;
          border: 2px solid #334155;
          border-radius: 8px;
          background: #0f172a;
          color: white;
          font-size: 0.9rem;
          font-family: inherit;
        }
        .form-row input:focus, .form-row textarea:focus, .form-row select:focus {
          outline: none;
          border-color: #667eea;
        }
        .form-row textarea { min-height: 120px; resize: vertical; }
        .form-row select option { background: #1e293b; }
        .name-type-row { display: flex; gap: 16px; align-items: center; margin-bottom: 16px; }
        .name-type-row label { margin: 0; color: white; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.9rem; }
        .form-actions { display: flex; gap: 12px; }
        .error { color: #ef4444; margin-top: 12px; font-size: 0.875rem; }
        .post-list { display: flex; flex-direction: column; gap: 12px; }
        .post-card {
          background: #1e293b;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #334155;
          cursor: pointer;
          transition: all 0.15s;
        }
        .post-card:hover { border-color: #667eea; transform: translateY(-1px); }
        .post-top { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; }
        .post-title { font-size: 1.1rem; font-weight: 600; color: white; }
        .post-badges { display: flex; gap: 6px; flex-shrink: 0; }
        .badge {
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          white-space: nowrap;
        }
        .badge-pinned { background: #fbbf24; color: #78350f; }
        .badge-locked { background: #64748b; color: white; }
        .badge-category { background: #667eea22; color: #667eea; }
        .badge-day { background: #10b98122; color: #10b981; }
        .post-meta {
          display: flex;
          gap: 16px;
          color: #64748b;
          font-size: 0.8rem;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }
        .post-preview { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; }
        .post-stats {
          display: flex;
          gap: 20px;
          margin-top: 12px;
          font-size: 0.85rem;
          color: #64748b;
        }
        .stat-item { display: flex; align-items: center; gap: 4px; }
        .stat-item.liked { color: #ef4444; }
        .like-btn {
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.85rem;
          color: #64748b;
          padding: 0;
        }
        .like-btn.liked { color: #ef4444; }
        .like-btn:hover { color: #ef4444; }
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }
        .empty-state h2 { margin-bottom: 8px; color: #94a3b8; }
        @media (max-width: 768px) {
          .layout {
            grid-template-columns: 1fr;
          }
          .sidebar {
            position: static;
          }
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

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-card">
            <div className="sidebar-title">Categories</div>
            <ul className="category-list">
              <li>
                <a href="/community" className="category-item active">
                  <span>All Posts</span>
                  <span className="category-count">{categories.reduce((sum, c) => sum + c.post_count, 0)}</span>
                </a>
              </li>
              {categories.map(cat => (
                <li key={cat.id}>
                  <a href={`/community/${cat.slug}`} className="category-item">
                    <span>{cat.name}</span>
                    <span className="category-count">{cat.post_count}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="main-content">
          <a href="/dashboard" className="back-link">← Back to Dashboard</a>

          <div className="page-header">
            <h1>Community Forum</h1>
            <button className="btn-primary" onClick={() => setShowCreatePost(!showCreatePost)}>
              {showCreatePost ? 'Cancel' : '+ New Post'}
            </button>
          </div>

          {showCreatePost && (
            <form className="create-form" onSubmit={handleCreatePost}>
              <h2>Create New Post</h2>

              <div className="form-row">
                <label>Post as</label>
                <div className="name-type-row">
                  <label>
                    <input type="radio" name="nameType" value="fullname" checked={nameType === 'fullname'} onChange={() => setNameType('fullname')} />
                    Full Name ({userName})
                  </label>
                  <label>
                    <input type="radio" name="nameType" value="nickname" checked={nameType === 'nickname'} onChange={() => setNameType('nickname')} />
                    Nickname
                  </label>
                </div>
                {nameType === 'nickname' && (
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Enter your nickname"
                    maxLength={50}
                    required
                  />
                )}
              </div>

              <div className="form-row">
                <label>Category</label>
                <select value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)}>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {categorySlug === 'days-1-30' && (
                <div className="form-row">
                  <label>Day Number</label>
                  <select value={dayNumber} onChange={(e) => setDayNumber(e.target.value)} required>
                    <option value="">Select a day...</option>
                    {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>Day {d}{dayTitles[d] ? ` - ${dayTitles[d]}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-row">
                <label>Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's on your mind?"
                  maxLength={200}
                  required
                />
              </div>

              <div className="form-row">
                <label>Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share your thoughts, questions, or insights..."
                  maxLength={10000}
                  required
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Posting...' : 'Post'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowCreatePost(false)}>
                  Cancel
                </button>
              </div>
              {error && <p className="error">{error}</p>}
            </form>
          )}

          {localPosts.length === 0 ? (
            <div className="empty-state">
              <h2>No posts yet</h2>
              <p>Be the first to start a conversation!</p>
            </div>
          ) : (
            <div className="post-list">
              {localPosts.map((post) => (
                <div key={post.id} className="post-card" onClick={() => router.push(`/community/post/${post.id}`)}>
                  <div className="post-top">
                    <div className="post-title">{post.title}</div>
                    <div className="post-badges">
                      {post.is_pinned && <span className="badge badge-pinned">Pinned</span>}
                      {post.is_locked && <span className="badge badge-locked">Locked</span>}
                    </div>
                  </div>
                  <div className="post-meta">
                    <span>{post.author_name}</span>
                    <span>{timeAgo(post.created_at)}</span>
                    <span className="badge badge-category">{post.category_name}</span>
                    {post.day_number && <span className="badge badge-day">Day {post.day_number}</span>}
                  </div>
                  <div className="post-preview">{post.preview}</div>
                  <div className="post-stats">
                    <button
                      className={`like-btn ${post.user_has_liked ? 'liked' : ''}`}
                      onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}
                    >
                      {post.user_has_liked ? '\u2764' : '\u2661'} {post.likes_count}
                    </button>
                    <span className="stat-item">{post.comments_count} comments</span>
                    <span className="stat-item">{post.views_count} views</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
