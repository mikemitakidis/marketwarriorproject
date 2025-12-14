'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function AdminContent() {
  const supabase = createClient();
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  async function loadContent() {
    const { data } = await supabase
      .from('course_content')
      .select('day_number, title, has_video, quiz_questions')
      .order('day_number', { ascending: true });

    setContent(data || []);
    setLoading(false);
  }

  if (loading) return <div className="spinner" style={{ margin: '100px auto' }} />;

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '24px', color: '#1e3a5f' }}>Content Management</h1>
      
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Day</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Title</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Video</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Questions</th>
            </tr>
          </thead>
          <tbody>
            {content.map((day) => (
              <tr key={day.day_number} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '16px', fontWeight: 600 }}>Day {day.day_number}</td>
                <td style={{ padding: '16px' }}>{day.title}</td>
                <td style={{ padding: '16px' }}>{day.has_video ? '✓' : '—'}</td>
                <td style={{ padding: '16px' }}>{day.quiz_questions?.length || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
