'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function AdminSettings() {
  const supabase = createClient();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const { data: { session } } = await supabase.auth.getSession();
    
    const res = await fetch('/api/admin/settings', {
      headers: { 'Authorization': `Bearer ${session?.access_token}` }
    });
    
    if (res.ok) {
      const data = await res.json();
      setSettings(data.settings || {});
    }
    setLoading(false);
  }

  async function saveSetting(key, value) {
    setSaving(key);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ key, value })
    });
    
    setSaving(null);
  }

  if (loading) {
    return <div className="spinner" style={{ margin: '100px auto' }} />;
  }

  const settingFields = [
    { key: 'course_price', label: 'Course Price ($)', type: 'number', default: 39.99 },
    { key: 'access_duration_days', label: 'Access Duration (days)', type: 'number', default: 120 },
    { key: 'max_devices', label: 'Max Devices per User', type: 'number', default: 2 },
    { key: 'quiz_pass_threshold', label: 'Quiz Pass Threshold (%)', type: 'number', default: 60 },
    { key: 'affiliate_commission_rate', label: 'Affiliate Commission (%)', type: 'number', default: 30 },
    { key: 'maintenance_mode', label: 'Maintenance Mode', type: 'boolean', default: false },
  ];

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '24px', color: '#1e3a5f' }}>Site Settings</h1>
      
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {settingFields.map(field => {
          const currentValue = settings[field.key] !== undefined 
            ? JSON.parse(settings[field.key]) 
            : field.default;
          
          return (
            <div key={field.key} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '16px 0',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <label style={{ fontWeight: 500 }}>{field.label}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {field.type === 'boolean' ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={currentValue}
                      onChange={(e) => {
                        setSettings({ ...settings, [field.key]: JSON.stringify(e.target.checked) });
                        saveSetting(field.key, e.target.checked);
                      }}
                      style={{ width: '20px', height: '20px' }}
                    />
                    <span>{currentValue ? 'Enabled' : 'Disabled'}</span>
                  </label>
                ) : (
                  <input
                    type={field.type}
                    value={currentValue}
                    onChange={(e) => setSettings({ ...settings, [field.key]: JSON.stringify(parseFloat(e.target.value)) })}
                    onBlur={(e) => saveSetting(field.key, parseFloat(e.target.value))}
                    style={{
                      width: '120px',
                      padding: '8px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      textAlign: 'right'
                    }}
                  />
                )}
                {saving === field.key && <span style={{ color: '#667eea', fontSize: '0.875rem' }}>Saving...</span>}
              </div>
            </div>
          );
        })}
      </div>
      
      <p style={{ marginTop: '16px', color: '#6b7280', fontSize: '0.875rem' }}>
        Note: Some settings require app restart to take effect. Price changes only affect new checkouts.
      </p>
    </div>
  );
}
