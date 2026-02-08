import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

/**
 * Admin Forum Moderation Page.
 *
 * Full moderation panel with:
 * - Stats summary (total posts, published, hidden, flagged, deleted, comments)
 * - Status filters, category filters, search
 * - Post list with actions: pin/unpin, lock/unlock, hide, flag, delete, edit
 * - Hard delete option
 */
export default function AdminForumPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchPosts();
    }
  }, [isAdmin, page, statusFilter, categoryFilter, search]);

  const checkAdmin = async () => {
    try {
      const res = await fetch('/api/admin/community', { credentials: 'include' });
      if (res.ok) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), status: statusFilter });
      if (categoryFilter) params.set('category', categoryFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/community?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setPosts(data.posts || []);
        setCategories(data.categories || []);
        setStats(data.stats || {});
        setTotalCount(data.totalCount || 0);
        setPageSize(data.pageSize || 30);
      }
    } catch (err) { /* ignore */ }
  };

  const handleAction = async (postId, action) => {
    setActionLoading(postId + action);
    try {
      const res = await fetch('/api/admin/community', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: postId, action }),
      });
      if (res.ok) {
        fetchPosts();
      }
    } catch (err) { /* ignore */ }
    setActionLoading(null);
  };

  const handleHardDelete = async (postId) => {
    if (!confirm('Permanently delete this post and all its comments? This cannot be undone.')) return;
    setActionLoading(postId + 'harddelete');
    try {
      const res = await fetch('/api/admin/community', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ post_id: postId }),
      });
      if (res.ok) {
        fetchPosts();
      }
    } catch (err) { /* ignore */ }
    setActionLoading(null);
  };

  const handleEdit = async (postId) => {
    setActionLoading(postId + 'edit');
    try {
      const res = await fetch('/api/admin/community', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: postId,
          action: 'edit',
          title: editTitle,
          content: editContent,
        }),
      });
      if (res.ok) {
        setEditingPost(null);
        fetchPosts();
      }
    } catch (err) { /* ignore */ }
    setActionLoading(null);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: '#0f172a', color: 'white', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
        Loading...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: '#0f172a', color: 'white', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
        <h1>Access Denied</h1>
        <p style={{ color: '#94a3b8', marginTop: '12px' }}>You do not have permission to access this page.</p>
        <a href="/dashboard" style={{ color: '#667eea', marginTop: '16px', display: 'inline-block' }}>Return to Dashboard</a>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Forum Moderation - Admin - Market Warrior</title>
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
        .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
        .top-bar { margin-bottom: 24px; }
        .back-link { color: #667eea; text-decoration: none; font-size: 0.875rem; }
        h1 { margin-top: 12px; font-size: 1.75rem; }
        .stats-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px; margin: 20px 0;
        }
        .stat-card {
          background: #1e293b; padding: 16px; border-radius: 10px; border: 1px solid #334155;
          text-align: center;
        }
        .stat-value { font-size: 1.75rem; font-weight: 700; color: #667eea; }
        .stat-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; margin-top: 4px; }
        .filters {
          display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: center;
        }
        .filter-select {
          padding: 8px 12px; border: 1px solid #334155; border-radius: 6px;
          background: #1e293b; color: white; font-size: 0.85rem;
        }
        .filter-select option { background: #1e293b; }
        .search-form { display: flex; gap: 8px; }
        .search-input {
          padding: 8px 12px; border: 1px solid #334155; border-radius: 6px;
          background: #1e293b; color: white; font-size: 0.85rem; width: 200px;
        }
        .search-btn {
          padding: 8px 16px; background: #667eea; color: white; border: none;
          border-radius: 6px; cursor: pointer; font-size: 0.85rem;
        }
        .clear-btn {
          padding: 8px 12px; background: #334155; color: white; border: none;
          border-radius: 6px; cursor: pointer; font-size: 0.85rem;
        }
        .posts-table { width: 100%; border-collapse: collapse; }
        .posts-table th, .posts-table td {
          padding: 10px 12px; text-align: left; border-bottom: 1px solid #1e293b;
          font-size: 0.85rem;
        }
        .posts-table th { background: #1e293b; color: #64748b; font-weight: 600; position: sticky; top: 0; }
        .posts-table tr:hover { background: #1e293b44; }
        .post-title-cell { max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .post-link { color: #667eea; text-decoration: none; }
        .post-link:hover { text-decoration: underline; }
        .badge { padding: 3px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; display: inline-block; }
        .badge-published { background: #10b98122; color: #10b981; }
        .badge-hidden { background: #f59e0b22; color: #f59e0b; }
        .badge-flagged { background: #ef444422; color: #ef4444; }
        .badge-deleted { background: #64748b22; color: #64748b; }
        .badge-pinned { background: #fbbf24; color: #78350f; margin-right: 4px; }
        .badge-locked { background: #64748b; color: white; margin-right: 4px; }
        .badge-category { background: #667eea22; color: #667eea; }
        .action-btns { display: flex; gap: 4px; flex-wrap: wrap; }
        .action-btn {
          padding: 4px 8px; border: 1px solid #334155; border-radius: 4px;
          background: transparent; color: #94a3b8; cursor: pointer; font-size: 0.7rem;
          white-space: nowrap;
        }
        .action-btn:hover { background: #334155; color: white; }
        .action-btn.danger { border-color: #ef4444; color: #ef4444; }
        .action-btn.danger:hover { background: #ef4444; color: white; }
        .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pagination { display: flex; gap: 8px; justify-content: center; margin-top: 20px; }
        .page-btn {
          padding: 8px 16px; background: #1e293b; color: white; border: 1px solid #334155;
          border-radius: 6px; cursor: pointer; font-size: 0.85rem;
        }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .page-btn.active { background: #667eea; border-color: #667eea; }
        .page-info { color: #64748b; font-size: 0.85rem; padding: 8px; }
        .empty { text-align: center; padding: 40px; color: #64748b; }
        .edit-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7); display: flex; align-items: center;
          justify-content: center; z-index: 100;
        }
        .edit-modal {
          background: #1e293b; padding: 32px; border-radius: 16px;
          width: 90%; max-width: 600px; border: 1px solid #334155;
        }
        .edit-modal h2 { margin-bottom: 20px; }
        .edit-field { margin-bottom: 16px; }
        .edit-field label { display: block; margin-bottom: 6px; color: #94a3b8; font-size: 0.85rem; }
        .edit-field input, .edit-field textarea {
          width: 100%; padding: 10px; border: 1px solid #334155; border-radius: 6px;
          background: #0f172a; color: white; font-size: 0.9rem; font-family: inherit;
        }
        .edit-field textarea { min-height: 150px; resize: vertical; }
        .edit-actions { display: flex; gap: 12px; }
        .edit-save {
          padding: 10px 20px; background: #667eea; color: white; border: none;
          border-radius: 6px; cursor: pointer; font-weight: 600;
        }
        .edit-cancel {
          padding: 10px 20px; background: #334155; color: white; border: none;
          border-radius: 6px; cursor: pointer;
        }
      `}</style>

      <div className="container">
        <div className="top-bar">
          <a href="/admin" className="back-link">← Admin Dashboard</a>
          <h1>Forum Moderation</h1>
        </div>

        {/* Stats Summary */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalPosts || 0}</div>
            <div className="stat-label">Total Posts</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#10b981' }}>{stats.publishedPosts || 0}</div>
            <div className="stat-label">Published</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.hiddenPosts || 0}</div>
            <div className="stat-label">Hidden</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#ef4444' }}>{stats.flaggedPosts || 0}</div>
            <div className="stat-label">Flagged</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#64748b' }}>{stats.deletedPosts || 0}</div>
            <div className="stat-label">Deleted</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#8b5cf6' }}>{stats.totalComments || 0}</div>
            <div className="stat-label">Comments</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters">
          <select className="filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="hidden">Hidden</option>
            <option value="flagged">Flagged</option>
            <option value="deleted">Deleted</option>
          </select>

          <select className="filter-select" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>

          <form className="search-form" onSubmit={handleSearch}>
            <input
              className="search-input"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search posts..."
            />
            <button type="submit" className="search-btn">Search</button>
            {search && (
              <button type="button" className="clear-btn" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Posts Table */}
        {posts.length === 0 ? (
          <div className="empty">No posts found</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="posts-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Stats</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(post => (
                  <tr key={post.id}>
                    <td className="post-title-cell">
                      {post.is_pinned && <span className="badge badge-pinned">Pin</span>}
                      {post.is_locked && <span className="badge badge-locked">Lock</span>}
                      <a href={`/community/post/${post.id}`} className="post-link" target="_blank" rel="noopener">
                        {post.title}
                      </a>
                    </td>
                    <td>{post.author_name}</td>
                    <td>
                      <span className="badge badge-category">{post.category_name}</span>
                      {post.day_number && <span style={{ color: '#64748b', marginLeft: '4px' }}>D{post.day_number}</span>}
                    </td>
                    <td>
                      <span className={`badge badge-${post.status}`}>{post.status}</span>
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {post.likes_count}L {post.comments_count}C {post.views_count}V
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {new Date(post.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="action-btns">
                        <button
                          className="action-btn"
                          disabled={!!actionLoading}
                          onClick={() => handleAction(post.id, post.is_pinned ? 'unpin' : 'pin')}
                        >
                          {post.is_pinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                          className="action-btn"
                          disabled={!!actionLoading}
                          onClick={() => handleAction(post.id, post.is_locked ? 'unlock' : 'lock')}
                        >
                          {post.is_locked ? 'Unlock' : 'Lock'}
                        </button>
                        {post.status === 'published' && (
                          <button className="action-btn" disabled={!!actionLoading} onClick={() => handleAction(post.id, 'hide')}>Hide</button>
                        )}
                        {post.status === 'hidden' && (
                          <button className="action-btn" disabled={!!actionLoading} onClick={() => handleAction(post.id, 'unhide')}>Unhide</button>
                        )}
                        {post.status !== 'flagged' && (
                          <button className="action-btn" disabled={!!actionLoading} onClick={() => handleAction(post.id, 'flag')}>Flag</button>
                        )}
                        {post.status === 'flagged' && (
                          <button className="action-btn" disabled={!!actionLoading} onClick={() => handleAction(post.id, 'unflag')}>Unflag</button>
                        )}
                        {post.status === 'deleted' && (
                          <button className="action-btn" disabled={!!actionLoading} onClick={() => handleAction(post.id, 'restore')}>Restore</button>
                        )}
                        {post.status !== 'deleted' && (
                          <button className="action-btn" disabled={!!actionLoading} onClick={() => handleAction(post.id, 'delete')}>Del</button>
                        )}
                        <button
                          className="action-btn"
                          disabled={!!actionLoading}
                          onClick={() => { setEditingPost(post); setEditTitle(post.title); setEditContent(post.content); }}
                        >
                          Edit
                        </button>
                        <button
                          className="action-btn danger"
                          disabled={!!actionLoading}
                          onClick={() => handleHardDelete(post.id)}
                        >
                          Purge
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
            <span className="page-info">Page {page} of {totalPages} ({totalCount} posts)</span>
            <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingPost && (
        <div className="edit-overlay" onClick={() => setEditingPost(null)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Post</h2>
            <div className="edit-field">
              <label>Title</label>
              <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="edit-field">
              <label>Content</label>
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} />
            </div>
            <div className="edit-actions">
              <button className="edit-save" disabled={!!actionLoading} onClick={() => handleEdit(editingPost.id)}>
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button className="edit-cancel" onClick={() => setEditingPost(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
