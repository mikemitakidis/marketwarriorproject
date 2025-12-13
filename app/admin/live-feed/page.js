'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function AdminLiveFeed() {
  const supabase = createClient();
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    link_url: '',
    link_text: '',
    is_pinned: false
  });

  useEffect(() => {
    loadFeed();
  }, []);

  async function loadFeed() {
    const { data: { session } } = await supabase.auth.getSession();
    
    const res = await fetch('/api/admin/live-feed', {
      headers: { 'Authorization': `Bearer ${session?.access_token}` }
    });
    
    if (res.ok) {
      const data = await res.json();
      setFeedItems(data.feed_items || []);
    }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (editingItem) {
      await fetch('/api/admin/live-feed', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ id: editingItem.id, ...formData })
      });
    } else {
      await fetch('/api/admin/live-feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(formData)
      });
    }
    
    resetForm();
    loadFeed();
    setSaving(false);
  }

  function resetForm() {
    setFormData({ title: '', content: '', link_url: '', link_text: '', is_pinned: false });
    setShowForm(false);
    setEditingItem(null);
  }

  function editItem(item) {
    setFormData({
      title: item.title || '',
      content: item.content || '',
      link_url: item.link_url || '',
      link_text: item.link_text || '',
      is_pinned: item.is_pinned || false
    });
    setEditingItem(item);
    setShowForm(true);
  }

  async function toggleActive(item) {
    const { data: { session } } = await supabase.auth.getSession();
    
    await fetch('/api/admin/live-feed', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ id: item.id, is_active: !item.is_active })
    });
    
    loadFeed();
  }

  async function deleteItem(id) {
    if (!confirm('Delete this feed item?')) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    
    await fetch(`/api/admin/live-feed?id=${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${session?.access_token}` }
    });
    
    loadFeed();
  }

  if (loading) {
    return <div className="spinner" style={{ margin: '100px auto' }} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e3a5f' }}>📢 Live Feed</h1>
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          + New Announcement
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '16px', fontWeight: 600 }}>
            {editingItem ? 'Edit Announcement' : 'New Announcement'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }}
                placeholder="e.g., New Feature Released!"
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Content *</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                rows={4}
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }}
                placeholder="The announcement message..."
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Link URL (optional)</label>
                <input
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Link Text (optional)</label>
                <input
                  type="text"
                  value={formData.link_text}
                  onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }}
                  placeholder="Learn more"
                />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.is_pinned}
                onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
              />
              <span style={{ fontWeight: 500 }}>📌 Pin to top</span>
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={resetForm}
                style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={saving}
                style={{ padding: '10px 20px', background: saving ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : editingItem ? 'Update' : 'Publish'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {feedItems.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
            No announcements yet. Create one to keep your users informed!
          </div>
        ) : (
          feedItems.map(item => (
            <div key={item.id} style={{ 
              padding: '20px', 
              borderBottom: '1px solid #e5e7eb',
              opacity: item.is_active ? 1 : 0.5
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    {item.is_pinned && <span style={{ color: '#f59e0b' }}>📌</span>}
                    <h3 style={{ fontWeight: 600, margin: 0 }}>{item.title}</h3>
                    {!item.is_active && (
                      <span style={{ padding: '2px 8px', background: '#fef2f2', color: '#dc2626', borderRadius: '4px', fontSize: '0.75rem' }}>
                        Hidden
                      </span>
                    )}
                  </div>
                  <p style={{ color: '#6b7280', margin: '8px 0', lineHeight: 1.6 }}>{item.content}</p>
                  {item.link_url && (
                    <a href={item.link_url} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', fontSize: '0.875rem' }}>
                      {item.link_text || item.link_url} →
                    </a>
                  )}
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '8px' }}>
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => editItem(item)}
                    style={{ padding: '6px 12px', background: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>
                    Edit
                  </button>
                  <button onClick={() => toggleActive(item)}
                    style={{ padding: '6px 12px', background: item.is_active ? '#fef2f2' : '#dcfce7', color: item.is_active ? '#dc2626' : '#10b981', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>
                    {item.is_active ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => deleteItem(item.id)}
                    style={{ padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
