import { useRouter } from 'next/router';
import { useState } from 'react';
import Head from 'next/head';
import { getUserFromRequest, getGateStatus, getServiceSupabase, getUserChallengeStatus } from '../../lib/serverAuth';

/**
 * Day content page with server-side gate logic.
 *
 * Flow: Users must be authenticated, paid, and have completed welcome.
 * Days unlock based on time since welcome_completed_at (24 hours per day).
 * User can access any unlocked day without completing previous days.
 */
export async function getServerSideProps({ req, params }) {
  try {
    const dayNum = parseInt(params.day, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 30) {
      return { redirect: { destination: '/dashboard', permanent: false } };
    }

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

    // Get time-based unlock status
    const challengeStatus = await getUserChallengeStatus(user.id);
    const { unlockedDays } = challengeStatus;

    // Check if this day is unlocked based on time
    if (!unlockedDays.includes(dayNum)) {
      return { redirect: { destination: '/dashboard', permanent: false } };
    }

    // Ensure progress record exists for this day
    await supabase
      .from('challenge_progress')
      .upsert({ user_id: user.id, day: dayNum, unlocked: true }, { onConflict: 'user_id,day' });

    // Get progress for this day
    const { data: progress } = await supabase
      .from('challenge_progress')
      .select('completed, quiz_passed, task_submitted')
      .eq('user_id', user.id)
      .eq('day', dayNum)
      .single();

    // Fetch lesson content
    const { data: content } = await supabase
      .from('course_content')
      .select('title, html_content, video_url, task_prompt')
      .eq('day', dayNum)
      .single();

    // Fetch quiz questions (without correct answers)
    const { data: rawQuizQuestions } = await supabase
      .from('quiz_questions')
      .select('id, question, options')
      .eq('day', dayNum)
      .order('id');

    // Transform to frontend format
    const quizQuestions = (rawQuizQuestions || []).map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
    }));

    // Check if already completed
    const isCompleted = progress?.completed || false;

    return {
      props: {
        day: dayNum,
        content: content || null,
        quizQuestions: quizQuestions || [],
        isCompleted,
        userName: gate.fullName || 'Trader',
      },
    };
  } catch (err) {
    console.error('Day page error:', err);
    return { redirect: { destination: '/dashboard', permanent: false } };
  }
}

export default function DayPage({ day, content, quizQuestions, isCompleted, userName }) {
  const router = useRouter();
  const [quizAnswers, setQuizAnswers] = useState({});
  const [taskResponse, setTaskResponse] = useState('');
  const [taskFile, setTaskFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [taskSubmitted, setTaskSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const submitQuiz = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ day, answers: quizAnswers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit quiz');
      setQuizResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    setTaskFile(file);
    setUploadingFile(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('day', day);

      const res = await fetch('/api/upload/task-file', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload file');

      setUploadedFileUrl(data.url);
    } catch (err) {
      setError(err.message);
      setTaskFile(null);
    } finally {
      setUploadingFile(false);
    }
  };

  const submitTask = async () => {
    if (!taskResponse.trim()) {
      setError('Please write your task response before submitting');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/task/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          day,
          response: taskResponse,
          attachmentUrl: uploadedFileUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit task');
      setTaskSubmitted(true);
      // Refresh page to show next day availability
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmitTask = quizResult?.passed || isCompleted;

  return (
    <>
      <Head>
        <title>Day {day} - Market Warrior</title>
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
        .logo img { width: 40px; height: 40px; border-radius: 8px; }
        .user-section { display: flex; align-items: center; gap: 16px; }
        .user-name { color: #94a3b8; }
        .logout-btn {
          background: #ef4444;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }
        .container { max-width: 1100px; margin: 0 auto; padding: 24px; }
        .back-link {
          color: #667eea;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 24px;
        }
        .back-link:hover { text-decoration: underline; }
        .day-header {
          background: linear-gradient(135deg, #667eea, #764ba2);
          padding: 32px;
          border-radius: 16px;
          margin-bottom: 24px;
        }
        .day-header h1 { font-size: 2rem; margin-bottom: 8px; }
        .day-header p { opacity: 0.9; }
        .section {
          background: #1e293b;
          padding: 24px;
          border-radius: 12px;
          border: 1px solid #334155;
          margin-bottom: 24px;
        }
        .section h2 {
          font-size: 1.5rem;
          margin-bottom: 16px;
          color: #667eea;
        }
        .lesson-content {
          line-height: 1.8;
          color: #cbd5e1;
        }
        .lesson-content h3 { color: white; margin: 20px 0 10px; }
        .lesson-content p { margin-bottom: 12px; }
        .lesson-content ul, .lesson-content ol { margin: 12px 0 12px 24px; }
        .lesson-content li { margin-bottom: 8px; }
        .video-container {
          position: relative;
          padding-bottom: 56.25%;
          margin: 24px 0;
          border-radius: 12px;
          overflow: hidden;
          background: #0f172a;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          min-height: 400px;
        }
        .video-container iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }
        .quiz-question {
          background: #0f172a;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .quiz-question p { font-weight: 600; margin-bottom: 12px; }
        .quiz-option {
          display: block;
          padding: 12px;
          margin: 8px 0;
          background: #1e293b;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .quiz-option:hover { background: #334155; }
        .quiz-option input { margin-right: 12px; }
        .btn {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn:hover:not(:disabled) { transform: translateY(-2px); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary {
          background: #334155;
        }
        .result-box {
          padding: 16px;
          border-radius: 8px;
          margin-top: 16px;
        }
        .result-box.success { background: #166534; color: #bbf7d0; }
        .result-box.fail { background: #991b1b; color: #fecaca; }
        .error-box {
          background: #991b1b;
          color: #fecaca;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .task-textarea {
          width: 100%;
          min-height: 150px;
          padding: 16px;
          border: 2px solid #334155;
          border-radius: 8px;
          background: #0f172a;
          color: white;
          font-size: 1rem;
          resize: vertical;
          margin-bottom: 16px;
        }
        .task-textarea:focus { outline: none; border-color: #667eea; }
        .completed-badge {
          display: inline-block;
          background: #22c55e;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.875rem;
          margin-left: 12px;
        }
        .no-content {
          text-align: center;
          padding: 40px;
          color: #94a3b8;
        }
        @media (max-width: 768px) {
          .container { padding: 16px; }
          .day-header { padding: 24px; }
        }
      `}</style>

      <header className="header">
        <a href="/dashboard" className="logo">
          <img src="/logo.png" alt="" onError={(e) => e.target.style.display = 'none'} />
          <span>Market Warrior</span>
        </a>
        <div className="user-section">
          <span className="user-name">{userName}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="container">
        <a href="/dashboard" className="back-link">← Back to Dashboard</a>

        <div className="day-header">
          <h1>
            Day {day}
            {isCompleted && <span className="completed-badge">Completed</span>}
          </h1>
          <p>{content?.title || `Day ${day} Lesson`}</p>
        </div>

        {error && <div className="error-box">{error}</div>}

        {!content ? (
          <div className="section no-content">
            <h2>Content Coming Soon</h2>
            <p>The content for Day {day} is being prepared. Check back soon!</p>
          </div>
        ) : (
          <>
            {/* Lesson Section */}
            <div className="section">
              <h2>Lesson</h2>
              {content.video_url && (
                <div className="video-container">
                  <iframe
                    src={content.video_url}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
              <div
                className="lesson-content"
                dangerouslySetInnerHTML={{ __html: content.html_content || '<p>No lesson content available.</p>' }}
              />
            </div>

            {/* Quiz Section */}
            {quizQuestions.length > 0 && (
              <div className="section">
                <h2>Quiz</h2>
                {quizQuestions.map((q) => (
                  <div key={q.id} className="quiz-question">
                    <p>{q.question}</p>
                    {q.options?.map((opt, idx) => (
                      <label key={idx} className="quiz-option">
                        <input
                          type="radio"
                          name={`q${q.id}`}
                          value={idx}
                          checked={quizAnswers[q.id] === idx}
                          onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: idx })}
                          disabled={quizResult?.passed || isCompleted}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                ))}

                {!quizResult && !isCompleted && (
                  <button
                    className="btn"
                    onClick={submitQuiz}
                    disabled={submitting || Object.keys(quizAnswers).length < quizQuestions.length}
                  >
                    {submitting ? 'Submitting...' : 'Submit Quiz'}
                  </button>
                )}

                {quizResult && (
                  <div className={`result-box ${quizResult.passed ? 'success' : 'fail'}`}>
                    <strong>Score: {quizResult.score}/{quizResult.total}</strong>
                    {quizResult.passed
                      ? ' - Great job! You passed. Complete the task below to unlock the next day.'
                      : ' - You need 60% to pass. Review the lesson and try again.'}
                  </div>
                )}

                {isCompleted && (
                  <div className="result-box success">
                    <strong>Quiz completed!</strong> You've already passed this day's quiz.
                  </div>
                )}
              </div>
            )}

            {/* Task Section */}
            {content.task_prompt && (
              <div className="section">
                <h2>Daily Task</h2>
                <p style={{ marginBottom: 16, color: '#cbd5e1' }}>{content.task_prompt}</p>

                {taskSubmitted ? (
                  <div className="result-box success">
                    <strong>Task submitted!</strong> Day {day} completed. Redirecting to dashboard...
                  </div>
                ) : isCompleted ? (
                  <div className="result-box success">
                    <strong>Task already completed!</strong> You've finished this day.
                  </div>
                ) : (
                  <>
                    <textarea
                      className="task-textarea"
                      placeholder="Write your task response here..."
                      value={taskResponse}
                      onChange={(e) => setTaskResponse(e.target.value)}
                      disabled={!canSubmitTask}
                    />

                    {/* File Upload Section */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', marginBottom: 8, color: '#94a3b8', fontSize: '0.875rem' }}>
                        Attach file (optional - PDF, Word, images, video up to 50MB)
                      </label>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        disabled={!canSubmitTask || uploadingFile}
                        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.mp4,.mov,.avi"
                        style={{
                          padding: 12,
                          background: '#0f172a',
                          border: '2px solid #334155',
                          borderRadius: 8,
                          color: 'white',
                          width: '100%',
                          cursor: canSubmitTask ? 'pointer' : 'not-allowed',
                        }}
                      />
                      {uploadingFile && (
                        <p style={{ marginTop: 8, color: '#667eea', fontSize: '0.875rem' }}>
                          Uploading file...
                        </p>
                      )}
                      {uploadedFileUrl && (
                        <p style={{ marginTop: 8, color: '#22c55e', fontSize: '0.875rem' }}>
                          ✓ File uploaded: {taskFile?.name}
                        </p>
                      )}
                    </div>

                    <button
                      className="btn"
                      onClick={submitTask}
                      disabled={submitting || uploadingFile || !canSubmitTask || !taskResponse.trim()}
                    >
                      {submitting ? 'Submitting...' : 'Submit Task & Complete Day'}
                    </button>
                    {!canSubmitTask && (
                      <p style={{ marginTop: 12, color: '#94a3b8', fontSize: '0.875rem' }}>
                        Pass the quiz first to unlock the task submission.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </button>
              {isCompleted && day < 30 && (
                <button className="btn" onClick={() => router.push(`/day/${day + 1}`)}>
                  Continue to Day {day + 1}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
