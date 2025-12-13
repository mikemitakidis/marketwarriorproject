'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function AdminEmails() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({ total_users: 0, paid_users: 0, leads: 0 });
  const [showCompose, setShowCompose] = useState(false);
  const [templates, setTemplates] = useState([]);
  
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    audience: 'all_users', // all_users, paid_users, unpaid_users, leads, custom
    custom_emails: '',
    template: ''
  });

  const emailTemplates = [
    { 
      id: 'welcome_back', 
      name: '👋 Welcome Back', 
      subject: "We miss you at Market Warrior!",
      content: `<p>Hey {name}!</p>
<p>We noticed you haven't logged in for a while. Your trading journey is waiting!</p>
<p>Remember, consistency is key to becoming a successful trader. Even 15 minutes a day can make a huge difference.</p>
<p><a href="{app_url}/dashboard" style="display:inline-block;padding:12px 24px;background:#667eea;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">Continue Your Journey →</a></p>
<p>Keep pushing forward!</p>`
    },
    { 
      id: 'special_offer', 
      name: '🎁 Special Offer', 
      subject: "Exclusive offer just for you!",
      content: `<p>Hey {name}!</p>
<p>We have a special offer just for you!</p>
<p>Use code <strong>{promo_code}</strong> to get <strong>{discount}% OFF</strong> the Market Warrior Challenge.</p>
<p><a href="{app_url}/checkout" style="display:inline-block;padding:12px 24px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">Claim Your Discount →</a></p>
<p>This offer expires soon!</p>`
    },
    { 
      id: 'new_content', 
      name: '📚 New Content', 
      subject: "New lessons available!",
      content: `<p>Hey {name}!</p>
<p>We've added exciting new content to the Market Warrior Challenge!</p>
<p>New topics include:</p>
<ul>
<li>Advanced chart patterns</li>
<li>Risk management strategies</li>
<li>Psychology of trading</li>
</ul>
<p><a href="{app_url}/dashboard" style="display:inline-block;padding:12px 24px;background:#667eea;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">Check It Out →</a></p>`
    },
    { 
      id: 'reminder', 
      name: '⏰ Reminder', 
      subject: "Don't forget to complete today's lesson!",
      content: `<p>Hey {name}!</p>
<p>Just a friendly reminder to complete today's Market Warrior lesson.</p>
<p>You're on <strong>Day {current_day}</strong> - keep up the momentum!</p>
<p><a href="{app_url}/day/{current_day}" style="display:inline-block;padding:12px 24px;background:#f59e0b;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">Continue Day {current_day} →</a></p>`
    },
    { 
      id: 'custom', 
      name: '✏️ Custom Email', 
      subject: "",
      content: ""
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Load campaigns
    const campaignsRes = await fetch('/api/admin/emails?action=list', {
      headers: { 'Authorization': `Bearer ${session?.access_token}` }
    });
    if (campaignsRes.ok) {
      const data = await campaignsRes.json();
      setCampaigns(data.campaigns || []);
      setStats(data.stats || {});
    }
    
    setLoading(false);
  }

  function selectTemplate(templateId) {
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        template: templateId,
        subject: template.subject,
        content: template.content
      });
    }
  }

  async function sendCampaign(e) {
    e.preventDefault();
    
    if (!formData.subject || !formData.content) {
      alert('Please fill in subject and content');
      return;
    }

    if (!confirm(`Send this email to ${formData.audience.replace('_', ' ')}?`)) {
      return;
    }

    setSending(true);
    const { data: { session } } = await supabase.auth.getSession();

    try {
      const res = await fetch('/api/admin/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          action: 'send',
          ...formData
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        alert(`✅ Campaign sent to ${data.sent_count} recipients!`);
        setShowCompose(false);
        setFormData({ subject: '', content: '', audience: 'all_users', custom_emails: '', template: '' });
        loadData();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to send campaign');
    }

    setSending(false);
  }

  if (loading) {
    return <div className="spinner" style={{ margin: '100px auto' }} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e3a5f' }}>📧 Email Campaigns</h1>
        <button
          onClick={() => setShowCompose(true)}
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
          + New Campaign
        </button>
      </div>

      {/* Audience Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'All Users', value: stats.total_users || 0, color: '#667eea' },
          { label: 'Paid Users', value: stats.paid_users || 0, color: '#10b981' },
          { label: 'Unpaid Users', value: (stats.total_users || 0) - (stats.paid_users || 0), color: '#f59e0b' },
          { label: 'Leads (Journal)', value: stats.leads || 0, color: '#8b5cf6' }
        ].map((stat, i) => (
          <div key={i} style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '4px' }}>{stat.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '800px', maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '24px' }}>📧 Compose Campaign</h2>
            
            {/* Template Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Start with a template:</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {emailTemplates.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTemplate(t.id)}
                    style={{
                      padding: '8px 16px',
                      background: formData.template === t.id ? '#667eea' : '#f1f5f9',
                      color: formData.template === t.id ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={sendCampaign}>
              {/* Audience */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Audience *</label>
                <select
                  value={formData.audience}
                  onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }}
                >
                  <option value="all_users">All Users ({stats.total_users})</option>
                  <option value="paid_users">Paid Users Only ({stats.paid_users})</option>
                  <option value="unpaid_users">Unpaid Users ({(stats.total_users || 0) - (stats.paid_users || 0)})</option>
                  <option value="leads">Journal Leads ({stats.leads})</option>
                  <option value="custom">Custom Email List</option>
                </select>
              </div>

              {formData.audience === 'custom' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Email Addresses (one per line)</label>
                  <textarea
                    value={formData.custom_emails}
                    onChange={(e) => setFormData({ ...formData, custom_emails: e.target.value })}
                    rows={4}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }}
                    placeholder="email1@example.com&#10;email2@example.com"
                  />
                </div>
              )}

              {/* Subject */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Subject *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }}
                  placeholder="Your email subject line"
                />
              </div>

              {/* Content */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                  Content (HTML) *
                  <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: '8px' }}>
                    Variables: {'{name}'}, {'{email}'}, {'{app_url}'}, {'{current_day}'}, {'{promo_code}'}, {'{discount}'}
                  </span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                  rows={12}
                  style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
              </div>

              {/* Preview */}
              <div style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, marginBottom: '8px', color: '#6b7280' }}>Preview:</div>
                <div style={{ background: 'white', padding: '16px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px' }}>{formData.subject || '(Subject)'}</div>
                  <div dangerouslySetInnerHTML={{ __html: formData.content || '<p>(Content)</p>' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: sending ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: sending ? 'not-allowed' : 'pointer'
                  }}
                >
                  {sending ? 'Sending...' : '📤 Send Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Campaign History */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontWeight: 600, margin: 0 }}>Campaign History</h2>
        </div>
        {campaigns.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
            No campaigns sent yet. Create your first campaign!
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#6b7280', fontWeight: 600 }}>Date</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#6b7280', fontWeight: 600 }}>Subject</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#6b7280', fontWeight: 600 }}>Audience</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: '#6b7280', fontWeight: 600 }}>Sent</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', color: '#6b7280', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px' }}>{new Date(campaign.sent_at).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{campaign.subject}</td>
                  <td style={{ padding: '12px 16px' }}>{campaign.audience?.replace('_', ' ')}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>{campaign.sent_count}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: campaign.status === 'sent' ? '#dcfce7' : '#fef3c7',
                      color: campaign.status === 'sent' ? '#10b981' : '#f59e0b'
                    }}>
                      {campaign.status?.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
