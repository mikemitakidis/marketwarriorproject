'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function DayPage() {
  const router = useRouter();
  const params = useParams();
  const dayNumber = parseInt(params.day);
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [submittingTask, setSubmittingTask] = useState(false);
  const [taskSubmitted, setTaskSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState('lesson');

  useEffect(() => {
    loadContent();
  }, [dayNumber]);

  async function loadContent() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    try {
      const res = await fetch(`/api/day/${dayNumber}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Access denied');
        router.push('/dashboard');
        return;
      }

      const data = await res.json();
      setContent(data);
      
      if (data.progress?.task_completed) {
        setTaskSubmitted(true);
      }
      if (data.progress?.quiz_passed) {
        setQuizResult({ passed: true, score: data.progress.quiz_score });
      }
    } catch (err) {
      console.error(err);
      router.push('/dashboard');
    }
    setLoading(false);
  }

  async function submitQuiz() {
    if (Object.keys(quizAnswers).length < content.quiz_questions.length) {
      alert('Please answer all questions');
      return;
    }

    setSubmittingQuiz(true);
    const { data: { session } } = await supabase.auth.getSession();

    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          day_number: dayNumber,
          answers: content.quiz_questions.map((_, i) => quizAnswers[i] ?? -1)
        })
      });

      const result = await res.json();
      setQuizResult(result);

      if (result.passed) {
        alert(`🎉 Congratulations! You scored ${result.score}%!`);
      } else {
        alert(`You scored ${result.score}%. You need 60% to pass. Try again!`);
      }
    } catch (err) {
      alert('Error submitting quiz');
    }
    setSubmittingQuiz(false);
  }

  async function submitTask() {
    if (!taskText.trim()) {
      alert('Please complete the task');
      return;
    }

    setSubmittingTask(true);
    const { data: { session } } = await supabase.auth.getSession();

    try {
      const res = await fetch('/api/task/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          day_number: dayNumber,
          task_text: taskText
        })
      });

      const result = await res.json();
      if (result.success) {
        setTaskSubmitted(true);
        if (result.completed) {
          alert(`🎉 Day ${dayNumber} completed! ${dayNumber < 30 ? 'Next day unlocks in 24 hours.' : 'You completed the challenge!'}`);
        } else {
          alert('Task saved! Complete the quiz to finish this day.');
        }
      }
    } catch (err) {
      alert('Error submitting task');
    }
    setSubmittingTask(false);
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}><div className="spinner" /></div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#f1f5f9' }}>
      {/* Header */}
      <header style={{ background: 'rgba(15, 23, 42, 0.95)', padding: '15px 30px', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'white' }}>
          <span style={{ fontSize: '24px' }}>←</span>
          <span>Back to Dashboard</span>
        </Link>
        <h1 style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Day {dayNumber}: {content?.title}
        </h1>
        <div style={{ width: '150px' }} />
      </header>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
          {['lesson', 'quiz', 'task'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 30px',
                background: activeTab === tab ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'rgba(255,255,255,0.1)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {tab === 'lesson' && '📚 '}{tab === 'quiz' && '📝 '}{tab === 'task' && '✅ '}{tab}
              {tab === 'quiz' && quizResult?.passed && ' ✓'}
              {tab === 'task' && taskSubmitted && ' ✓'}
            </button>
          ))}
        </div>

        {/* Lesson Tab */}
        {activeTab === 'lesson' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '40px' }}>
            {content?.youtube_video_id && (
              <div style={{ marginBottom: '30px', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${content.youtube_video_id}`}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    allowFullScreen
                  />
                </div>
              </div>
            )}
            
            <div 
              style={{ lineHeight: 1.8, fontSize: '1.1rem' }}
              dangerouslySetInnerHTML={{ __html: content?.content_html || '<p>Loading content...</p>' }}
            />

            {content?.next_preview && (
              <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(102, 126, 234, 0.2)', borderRadius: '12px', borderLeft: '4px solid #667eea' }}>
                <h4 style={{ marginBottom: '10px' }}>📅 Coming Up Next</h4>
                <p style={{ color: '#94a3b8' }}>{content.next_preview}</p>
              </div>
            )}
          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '40px' }}>
            <h2 style={{ marginBottom: '30px' }}>📝 Day {dayNumber} Quiz</h2>
            
            {quizResult?.passed ? (
              <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '30px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎉</div>
                <h3 style={{ color: '#10b981', marginBottom: '10px' }}>Quiz Passed!</h3>
                <p>You scored {quizResult.score}%</p>
              </div>
            ) : (
              <>
                {content?.quiz_questions?.map((q, i) => (
                  <div key={i} style={{ marginBottom: '30px', padding: '25px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                    <p style={{ fontWeight: 600, marginBottom: '15px' }}>Q{i + 1}: {q.question}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {q.options?.map((opt, j) => (
                        <label 
                          key={j}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            background: quizAnswers[i] === j ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255,255,255,0.05)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            border: quizAnswers[i] === j ? '2px solid #667eea' : '2px solid transparent'
                          }}
                        >
                          <input
                            type="radio"
                            name={`q${i}`}
                            checked={quizAnswers[i] === j}
                            onChange={() => setQuizAnswers({ ...quizAnswers, [i]: j })}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  onClick={submitQuiz}
                  disabled={submittingQuiz}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: submittingQuiz ? '#9ca3af' : 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    cursor: submittingQuiz ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submittingQuiz ? 'Submitting...' : 'Submit Quiz'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Task Tab */}
        {activeTab === 'task' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '40px' }}>
            <h2 style={{ marginBottom: '20px' }}>✅ Today's Task</h2>
            
            <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', marginBottom: '30px' }}>
              <p style={{ lineHeight: 1.8 }}>{content?.task_description || 'Complete the practical task for this day.'}</p>
            </div>

            {taskSubmitted ? (
              <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '30px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>✅</div>
                <h3 style={{ color: '#10b981' }}>Task Completed!</h3>
              </div>
            ) : (
              <>
                <textarea
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                  placeholder="Describe how you completed the task..."
                  style={{
                    width: '100%',
                    minHeight: '150px',
                    padding: '16px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '1rem',
                    marginBottom: '20px',
                    resize: 'vertical'
                  }}
                />

                <button
                  onClick={submitTask}
                  disabled={submittingTask || !quizResult?.passed}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: (submittingTask || !quizResult?.passed) ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    cursor: (submittingTask || !quizResult?.passed) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {!quizResult?.passed ? 'Pass quiz first' : submittingTask ? 'Submitting...' : 'Submit Task'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
