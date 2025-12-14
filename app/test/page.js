'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// TEST MODE - Direct access to all course content without login
export default function TestPage() {
  const [dayContent, setDayContent] = useState(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [loading, setLoading] = useState(false);

  async function loadDay(day) {
    setLoading(true);
    setSelectedDay(day);
    try {
      const res = await fetch(`/api/test/day/${day}`);
      const data = await res.json();
      setDayContent(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadDay(1);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ background: '#dc2626', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
          <strong>⚠️ TEST MODE - No Authentication Required</strong>
          <p style={{ margin: '5px 0 0', fontSize: '14px' }}>This page bypasses all security for testing purposes only</p>
        </div>

        {/* Day Navigation */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '30px' }}>
          {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
            <button
              key={day}
              onClick={() => loadDay(day)}
              style={{
                padding: '10px 15px',
                background: selectedDay === day ? '#667eea' : '#1e293b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: selectedDay === day ? 'bold' : 'normal'
              }}
            >
              Day {day}
            </button>
          ))}
        </div>

        {/* Quick Links */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
          <Link href="/test/dashboard" style={{ padding: '12px 20px', background: '#059669', color: 'white', borderRadius: '8px', textDecoration: 'none' }}>
            📊 Test Dashboard
          </Link>
          <Link href="/test/quiz/1" style={{ padding: '12px 20px', background: '#7c3aed', color: 'white', borderRadius: '8px', textDecoration: 'none' }}>
            📝 Test Quiz (Day 1)
          </Link>
          <Link href="/test/certificate" style={{ padding: '12px 20px', background: '#ea580c', color: 'white', borderRadius: '8px', textDecoration: 'none' }}>
            🎓 Test Certificate
          </Link>
          <Link href="/admin" style={{ padding: '12px 20px', background: '#dc2626', color: 'white', borderRadius: '8px', textDecoration: 'none' }}>
            👑 Admin Panel
          </Link>
        </div>

        {/* Content Display */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>Loading Day {selectedDay}...</div>
        ) : dayContent ? (
          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '30px' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>{dayContent.title || `Day ${selectedDay}`}</h1>
            <p style={{ color: '#94a3b8', marginBottom: '30px' }}>{dayContent.subtitle}</p>
            
            {dayContent.youtube_video_id && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '15px' }}>📹 Video</h3>
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${dayContent.youtube_video_id}`}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '8px' }}
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {dayContent.content_html && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '15px' }}>📚 Lesson Content</h3>
                <div 
                  style={{ background: '#0f172a', padding: '20px', borderRadius: '8px', lineHeight: 1.8 }}
                  dangerouslySetInnerHTML={{ __html: dayContent.content_html }}
                />
              </div>
            )}

            {dayContent.task_description && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '15px' }}>✅ Task</h3>
                <div style={{ background: '#0f172a', padding: '20px', borderRadius: '8px' }}>
                  <p>{dayContent.task_description}</p>
                </div>
              </div>
            )}

            {dayContent.quiz_questions && dayContent.quiz_questions.length > 0 && (
              <div>
                <h3 style={{ marginBottom: '15px' }}>📝 Quiz ({dayContent.quiz_questions.length} questions)</h3>
                {dayContent.quiz_questions.map((q, i) => (
                  <div key={i} style={{ background: '#0f172a', padding: '20px', borderRadius: '8px', marginBottom: '15px' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Q{i+1}: {q.question}</p>
                    <ul style={{ paddingLeft: '20px' }}>
                      {q.options?.map((opt, j) => (
                        <li key={j} style={{ color: j === q.correct_answer ? '#22c55e' : '#94a3b8', marginBottom: '5px' }}>
                          {opt} {j === q.correct_answer && '✓'}
                        </li>
                      ))}
                    </ul>
                    {q.explanation && <p style={{ color: '#60a5fa', marginTop: '10px', fontSize: '14px' }}>💡 {q.explanation}</p>}
                  </div>
                ))}
              </div>
            )}

            {!dayContent.content_html && !dayContent.quiz_questions?.length && (
              <div style={{ background: '#fef3c7', color: '#92400e', padding: '20px', borderRadius: '8px' }}>
                <strong>⚠️ No content found for Day {selectedDay}</strong>
                <p>This day may not have content in the database yet.</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '50px' }}>Select a day to view content</div>
        )}
      </div>
    </div>
  );
}
