'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function DayPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const dayNumber = parseInt(params.day);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dayContent, setDayContent] = useState(null);
  const [activeTab, setActiveTab] = useState('lesson');
  
  // Quiz state
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  
  // Task state
  const [taskText, setTaskText] = useState('');
  const [taskFile, setTaskFile] = useState(null);
  const [taskFileUrl, setTaskFileUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submittingTask, setSubmittingTask] = useState(false);

  useEffect(() => {
    if (dayNumber < 1 || dayNumber > 30) {
      router.push('/dashboard');
      return;
    }
    loadDay();
  }, [dayNumber]);

  async function loadDay() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const res = await fetch(`/api/day/${dayNumber}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (res.status === 403) {
        const data = await res.json();
        setError(data.error || 'Access denied');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to load day content');
      }

      const data = await res.json();
      setDayContent(data);
      
      // Load existing task submission if any
      if (data.task_submission) {
        setTaskText(data.task_submission.task_text || '');
        setTaskFileUrl(data.task_submission.file_url || '');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Load day error:', err);
      setError('Failed to load day content');
      setLoading(false);
    }
  }

  async function handleQuizSubmit(e) {
    e.preventDefault();
    setSubmittingQuiz(true);
    setQuizResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          day_number: dayNumber,
          answers
        })
      });

      const result = await res.json();
      setQuizResult(result);

      if (result.passed) {
        // Reload to update progress
        setTimeout(() => loadDay(), 1500);
      }
    } catch (err) {
      console.error('Quiz submit error:', err);
      setQuizResult({ error: 'Failed to submit quiz' });
    }

    setSubmittingQuiz(false);
  }

  async function handleFileUpload(file) {
    if (!file) return;
    
    setUploadingFile(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('day_number', dayNumber);
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: formData
      });
      
      const result = await res.json();
      
      if (result.success) {
        setTaskFileUrl(result.url);
        setTaskFile(null);
      } else {
        alert(result.error || 'Upload failed');
      }
    } catch (err) {
      console.error('File upload error:', err);
      alert('Failed to upload file');
    }
    
    setUploadingFile(false);
  }

  async function handleTaskSubmit(e) {
    e.preventDefault();
    
    if (!taskText.trim() && !taskFileUrl) {
      alert('Please provide a response or upload a file');
      return;
    }
    
    setSubmittingTask(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/task/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          day_number: dayNumber,
          task_text: taskText.trim(),
          file_url: taskFileUrl
        })
      });

      const result = await res.json();

      if (result.success) {
        alert(result.message || 'Task submitted!');
        loadDay();
      } else {
        alert(result.error || 'Failed to submit task');
      }
    } catch (err) {
      console.error('Task submit error:', err);
      alert('Failed to submit task');
    }

    setSubmittingTask(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔒</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px', color: '#1e3a5f' }}>
            {error}
          </h1>
          <Link href="/dashboard" style={{ color: '#667eea', fontWeight: 500 }}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const progress = dayContent?.progress || {};
  const quizQuestions = dayContent?.quiz_questions || [];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/dashboard" style={{ color: '#667eea', fontWeight: 500, fontSize: '0.875rem' }}>
              ← Dashboard
            </Link>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e3a5f' }}>
              Day {dayNumber}: {dayContent?.title}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {progress.quiz_passed && <span style={{ background: '#dcfce7', color: '#10b981', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>Quiz ✓</span>}
            {progress.task_completed && <span style={{ background: '#dcfce7', color: '#10b981', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>Task ✓</span>}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '32px', padding: '0 24px' }}>
          {['lesson', 'quiz', 'task'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '16px 0',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid #667eea' : '3px solid transparent',
                color: activeTab === tab ? '#667eea' : '#64748b',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {tab === 'lesson' && '📚'} {tab === 'quiz' && '❓'} {tab === 'task' && '📝'} {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Lesson Tab */}
        {activeTab === 'lesson' && (
          <div>
            {dayContent?.youtube_video_id && (
              <div style={{ marginBottom: '32px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                <div style={{ position: 'relative', paddingTop: '56.25%' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${dayContent.youtube_video_id}`}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
            <div 
              style={{ background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', lineHeight: 1.7 }}
              dangerouslySetInnerHTML={{ __html: dayContent?.content_html || '' }}
            />
          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && (
          <div style={{ background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            {progress.quiz_passed ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉</div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>Quiz Completed!</h2>
                <p style={{ color: '#64748b', marginTop: '8px' }}>Score: {progress.quiz_score}%</p>
              </div>
            ) : (
              <form onSubmit={handleQuizSubmit}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '24px', color: '#1e3a5f' }}>
                  Day {dayNumber} Quiz
                </h2>
                
                {quizQuestions.map((q, idx) => (
                  <div key={idx} style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: idx < quizQuestions.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                    <p style={{ fontWeight: 600, marginBottom: '12px' }}>
                      {idx + 1}. {q.question}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {q.options.map((option, optIdx) => {
                        const optionLetter = String.fromCharCode(97 + optIdx);
                        return (
                          <label
                            key={optIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '12px',
                              background: answers[idx + 1] === optionLetter ? '#eff6ff' : '#f8fafc',
                              border: answers[idx + 1] === optionLetter ? '2px solid #667eea' : '2px solid transparent',
                              borderRadius: '8px',
                              cursor: 'pointer'
                            }}
                          >
                            <input
                              type="radio"
                              name={`q${idx + 1}`}
                              value={optionLetter}
                              checked={answers[idx + 1] === optionLetter}
                              onChange={() => setAnswers({ ...answers, [idx + 1]: optionLetter })}
                            />
                            <span>{option}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {quizResult && (
                  <div style={{
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    background: quizResult.passed ? '#dcfce7' : '#fef2f2',
                    color: quizResult.passed ? '#10b981' : '#dc2626'
                  }}>
                    {quizResult.message || quizResult.error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingQuiz || Object.keys(answers).length < quizQuestions.length}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: submittingQuiz ? '#9ca3af' : '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: submittingQuiz ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submittingQuiz ? 'Submitting...' : 'Submit Quiz'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Task Tab */}
        {activeTab === 'task' && (
          <div style={{ background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', color: '#1e3a5f' }}>
              Day {dayNumber} Task
            </h2>
            
            {dayContent?.task_instructions && (
              <div 
                style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', marginBottom: '24px', lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: dayContent.task_instructions }}
              />
            )}

            {progress.task_completed ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>✅</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>Task Completed!</h3>
                <p style={{ color: '#64748b', marginTop: '8px' }}>You can update your submission below.</p>
              </div>
            ) : null}

            <form onSubmit={handleTaskSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px' }}>Your Response</label>
                <textarea
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                  placeholder="Write your response here..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px' }}>
                  Upload Screenshot (optional)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  disabled={uploadingFile}
                  style={{ marginBottom: '8px' }}
                />
                {uploadingFile && <div style={{ color: '#667eea' }}>Uploading...</div>}
                {taskFileUrl && (
                  <div style={{ marginTop: '8px', padding: '12px', background: '#f0fdf4', borderRadius: '8px' }}>
                    ✓ File uploaded: <a href={taskFileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>View file</a>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submittingTask || (!taskText.trim() && !taskFileUrl)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: submittingTask ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: submittingTask ? 'not-allowed' : 'pointer'
                }}
              >
                {submittingTask ? 'Submitting...' : progress.task_completed ? 'Update Task' : 'Submit Task'}
              </button>
            </form>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
          {dayNumber > 1 ? (
            <Link href={`/day/${dayNumber - 1}`} style={{ color: '#667eea', fontWeight: 500 }}>
              ← Day {dayNumber - 1}
            </Link>
          ) : <div />}
          {dayNumber < 30 ? (
            <Link href={`/day/${dayNumber + 1}`} style={{ color: '#667eea', fontWeight: 500 }}>
              Day {dayNumber + 1} →
            </Link>
          ) : <div />}
        </div>
      </div>
    </div>
  );
}
