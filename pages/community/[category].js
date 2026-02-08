import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getUserFromRequest, getGateStatus, getServiceSupabase } from '../../lib/serverAuth';
import AnnouncementBanner from '../../components/AnnouncementBanner';

/**
 * Community Forum - Category View
 *
 * Shows posts filtered by category with sidebar navigation.
 * For "days-1-30" category, includes a day number filter.
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
    if (!gate.welcomeCompleted) {
      return { redirect: { destination: '/welcome', permanent: false } };
    }

    const supabase = getServiceSupabase();
    const { category } = params;

    // Fetch categories
    const { data: categories } = await supabase
      .from('forum_categories')
      .select('id, slug, name, description')
      .order('id');

    // Validate category slug
    const currentCategory = (categories || []).find(c => c.slug === category);
    if (!currentCategory) {
      return { notFound: true };
    }

    // Fetch posts for this category
    const { data: posts } = await supabase
      .from('forum_posts')
      .select('id, user_id, category_id, author_name, title, content, day_number, image_url, likes_count, comments_count, views_count, is_pinned, is_locked, created_at')
      .eq('status', 'published')
      .eq('category_id', currentCategory.id)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    // Category counts
    const { data: countData } = await supabase
      .from('forum_posts')
      .select('category_id')
      .eq('status', 'published');

    const categoryCounts = {};
    (countData || []).forEach(p => {
      categoryCounts[p.category_id] = (categoryCounts[p.category_id] || 0) + 1;
    });

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

    // Day titles for filter (only for days-1-30 category)
    let dayTitles = {};
    if (currentCategory.slug === 'days-1-30') {
      const { data: dayContent } = await supabase
        .from('course_content')
        .select('day, title')
        .order('day');
      (dayContent || []).forEach(d => { dayTitles[d.day] = d.title; });
    }

    return {
      props: {
        currentCategory,
        categories: (categories || []).map(c => ({
          ...c,
          post_count: categoryCounts[c.id] || 0,
        })),
        posts: (posts || []).map(p => ({
          ...p,
          preview: p.content?.substring(0, 200) + (p.content?.length > 200 ? '...' : ''),
          user_has_liked: !!userLikes[p.id],
        })),
        userName: gate.fullName || 'Trader',
        dayTitles,
      },
    };
  } catch (err) {
    return { redirect: { destination: '/community', permanent: false } };
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

export default function CategoryPage({ currentCategory, categories, posts, userName, dayTitles }) {
  const router = useRouter();
  const [dayFilter, setDayFilter] = useState('');
  const [localPosts, setLocalPosts] = useState(posts);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setLocalPosts(posts);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/community/posts?category=${currentCategory.slug}&search=${encodeURIComponent(searchQuery.trim())}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setLocalPosts(data.posts || []);
      }
    } catch (err) { /* ignore */ }
    setSearching(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setLocalPosts(posts);
  };

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

  // Filter by day if applicable
  const filteredPosts = dayFilter
    ? localPosts.filter(p => p.day_number === parseInt(dayFilter))
    : localPosts;

  return (
    <>
      <Head>
        <title>{currentCategory.name} - Community - Market Warrior</title>
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
        .logo { font-size: 1.25rem; font-weight: 700; color: #667eea; text-decoration: none; }
        .user-section { display: flex; align-items: center; gap: 16px; }
        .user-name { color: #94a3b8; }
        .logout-btn {
          background: #ef4444; color: white; border: none;
          padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.875rem;
        }
        .layout {
          max-width: 1200px; margin: 0 auto; padding: 24px;
          display: grid; grid-template-columns: 260px 1fr; gap: 24px;
        }
        .sidebar { position: sticky; top: 24px; align-self: start; }
        .sidebar-card {
          background: #1e293b; border-radius: 12px; padding: 20px; border: 1px solid #334155;
        }
        .sidebar-title {
          font-size: 0.875rem; text-transform: uppercase; color: #64748b;
          margin-bottom: 16px; font-weight: 600; letter-spacing: 0.05em;
        }
        .category-list { list-style: none; }
        .category-item {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: background 0.15s;
          text-decoration: none; color: white; margin-bottom: 4px;
        }
        .category-item:hover { background: #334155; }
        .category-item.active { background: #667eea22; color: #667eea; }
        .category-count {
          background: #334155; padding: 2px 8px; border-radius: 12px;
          font-size: 0.75rem; color: #94a3b8;
        }
        .main-content { min-width: 0; }
        .back-link { color: #667eea; text-decoration: none; display: inline-block; margin-bottom: 16px; font-size: 0.875rem; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .page-header h1 { font-size: 1.75rem; }
        .category-desc { color: #94a3b8; margin-bottom: 20px; font-size: 0.9rem; }
        .btn-primary {
          background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none;
          padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem;
          text-decoration: none;
        }
        .day-filter {
          display: flex; gap: 12px; align-items: center; margin-bottom: 20px;
          padding: 12px 16px; background: #1e293b; border-radius: 8px; border: 1px solid #334155;
        }
        .day-filter label { color: #94a3b8; font-size: 0.875rem; white-space: nowrap; }
        .day-filter select {
          padding: 6px 10px; border: 1px solid #334155; border-radius: 6px;
          background: #0f172a; color: white; font-size: 0.875rem;
        }
        .day-filter select option { background: #1e293b; }
        .post-list { display: flex; flex-direction: column; gap: 12px; }
        .post-card {
          background: #1e293b; padding: 20px; border-radius: 12px;
          border: 1px solid #334155; cursor: pointer; transition: all 0.15s;
        }
        .post-card:hover { border-color: #667eea; transform: translateY(-1px); }
        .post-top { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; }
        .post-title { font-size: 1.1rem; font-weight: 600; }
        .post-badges { display: flex; gap: 6px; flex-shrink: 0; }
        .badge { padding: 3px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; white-space: nowrap; }
        .badge-pinned { background: #fbbf24; color: #78350f; }
        .badge-locked { background: #64748b; color: white; }
        .badge-day { background: #10b98122; color: #10b981; }
        .post-meta { display: flex; gap: 16px; color: #64748b; font-size: 0.8rem; margin-bottom: 8px; flex-wrap: wrap; }
        .post-preview { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; }
        .post-stats { display: flex; gap: 20px; margin-top: 12px; font-size: 0.85rem; color: #64748b; }
        .stat-item { display: flex; align-items: center; gap: 4px; }
        .like-btn {
          background: none; border: none; cursor: pointer; display: flex;
          align-items: center; gap: 4px; font-size: 0.85rem; color: #64748b; padding: 0;
        }
        .like-btn.liked { color: #ef4444; }
        .like-btn:hover { color: #ef4444; }
        .empty-state { text-align: center; padding: 60px 20px; color: #64748b; }
        .search-bar {
          display: flex; gap: 8px; margin-bottom: 20px;
        }
        .search-bar input {
          flex: 1; padding: 10px 14px; border: 2px solid #334155; border-radius: 8px;
          background: #1e293b; color: white; font-size: 0.9rem;
        }
        .search-bar input:focus { outline: none; border-color: #667eea; }
        .search-bar button {
          padding: 10px 16px; border: none; border-radius: 8px; cursor: pointer;
          font-size: 0.85rem; font-weight: 600;
        }
        .search-bar .search-submit { background: #667eea; color: white; }
        .search-bar .search-clear { background: #334155; color: #94a3b8; }
        .search-info { color: #64748b; font-size: 0.85rem; margin-bottom: 12px; }
        .post-image {
          margin-top: 8px; max-width: 100%; max-height: 120px; border-radius: 6px;
          object-fit: cover; border: 1px solid #334155;
        }
        .empty-state h2 { margin-bottom: 8px; color: #94a3b8; }
        @media (max-width: 768px) {
          .layout { grid-template-columns: 1fr; }
          .sidebar { position: static; }
        }
      `}</style>

      <AnnouncementBanner type="student" />

      <header className="header">
        <a href="/dashboard" className="logo">Market Warrior</a>
        <div className="user-section">
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
                <a href="/community" className="category-item">
                  <span>All Posts</span>
                  <span className="category-count">{categories.reduce((sum, c) => sum + c.post_count, 0)}</span>
                </a>
              </li>
              {categories.map(cat => (
                <li key={cat.id}>
                  <a href={`/community/${cat.slug}`} className={`category-item ${cat.slug === currentCategory.slug ? 'active' : ''}`}>
                    <span>{cat.name}</span>
                    <span className="category-count">{cat.post_count}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="main-content">
          <a href="/community" className="back-link">← Back to All Posts</a>

          <div className="page-header">
            <h1>{currentCategory.name}</h1>
            <a href="/community" className="btn-primary" onClick={(e) => { e.preventDefault(); router.push('/community'); }}>
              + New Post
            </a>
          </div>
          {currentCategory.description && (
            <p className="category-desc">{currentCategory.description}</p>
          )}

          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
            />
            <button type="submit" className="search-submit" disabled={searching}>
              {searching ? 'Searching...' : 'Search'}
            </button>
            {searchQuery && (
              <button type="button" className="search-clear" onClick={handleClearSearch}>Clear</button>
            )}
          </form>
          {searchQuery && <div className="search-info">Showing results for &quot;{searchQuery}&quot;</div>}

          {currentCategory.slug === 'days-1-30' && (
            <div className="day-filter">
              <label>Filter by day:</label>
              <select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)}>
                <option value="">All Days</option>
                {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>Day {d}{dayTitles[d] ? ` - ${dayTitles[d]}` : ''}</option>
                ))}
              </select>
            </div>
          )}

          {filteredPosts.length === 0 ? (
            <div className="empty-state">
              <h2>No posts yet</h2>
              <p>{dayFilter ? `No posts for Day ${dayFilter} yet.` : `Be the first to post in ${currentCategory.name}!`}</p>
            </div>
          ) : (
            <div className="post-list">
              {filteredPosts.map((post) => (
                <div key={post.id} className="post-card" onClick={() => router.push(`/community/post/${post.id}`)}>
                  <div className="post-top">
                    <div className="post-title">{post.title}</div>
                    <div className="post-badges">
                      {post.is_pinned && <span className="badge badge-pinned">Pinned</span>}
                      {post.is_locked && <span className="badge badge-locked">Locked</span>}
                      {post.day_number && <span className="badge badge-day">Day {post.day_number}</span>}
                    </div>
                  </div>
                  <div className="post-meta">
                    <span>{post.author_name}</span>
                    <span>{timeAgo(post.created_at)}</span>
                  </div>
                  <div className="post-preview">{post.preview}</div>
                  {post.image_url && <img className="post-image" src={post.image_url} alt="" />}
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
