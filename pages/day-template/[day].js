import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { getUserFromRequest, getGateStatus, getUserChallengeStatus, getServiceSupabase } from '../../lib/serverAuth';

/**
 * Iframe Template Mode - renders the day template in an isolated iframe
 * with postMessage bridge for quiz/task completion
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

    const challengeStatus = await getUserChallengeStatus(user.id);
    const { unlockedDays } = challengeStatus;

    if (!unlockedDays.includes(dayNum)) {
      return { redirect: { destination: '/dashboard', permanent: false } };
    }

    // Get progress status from challenge_progress
    const supabase = getServiceSupabase();
    const { data: progress, error: progressError } = await supabase
      .from('challenge_progress')
      .select('completed, quiz_passed, task_submitted')
      .eq('user_id', user.id)
      .eq('day', dayNum)
      .single();

    console.log(`[Day ${dayNum}] User: ${user.id}, Progress:`, progress, 'Error:', progressError);

    // Also check task_submissions as fallback (in case challenge_progress wasn't updated)
    let taskSubmitted = progress?.task_submitted || false;
    if (!taskSubmitted) {
      const { data: taskSub, error: taskError } = await supabase
        .from('task_submissions')
        .select('id')
        .eq('user_id', user.id)
        .eq('day', dayNum)
        .limit(1)
        .maybeSingle();
      console.log(`[Day ${dayNum}] TaskSub check:`, taskSub, 'Error:', taskError);
      taskSubmitted = !!taskSub;
    }

    // Also check quiz_attempts as fallback for quiz_passed
    let quizPassed = progress?.quiz_passed || false;
    if (!quizPassed) {
      const { data: quizAttempt, error: quizError } = await supabase
        .from('quiz_attempts')
        .select('passed')
        .eq('user_id', user.id)
        .eq('day', dayNum)
        .eq('passed', true)
        .limit(1)
        .maybeSingle();
      console.log(`[Day ${dayNum}] QuizAttempt check:`, quizAttempt, 'Error:', quizError);
      quizPassed = !!quizAttempt;
    }

    console.log(`[Day ${dayNum}] Final values - taskSubmitted: ${taskSubmitted}, quizPassed: ${quizPassed}`);

    return {
      props: {
        day: dayNum,
        isCompleted: progress?.completed || false,
        quizPassed,
        taskSubmitted,
      },
    };
  } catch (err) {
    console.error('Day template page error:', err);
    return { redirect: { destination: '/dashboard', permanent: false } };
  }
}

export default function DayTemplatePage({ day, isCompleted, quizPassed, taskSubmitted: initialTaskSubmitted }) {
  const router = useRouter();
  const iframeRef = useRef(null);
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [taskSubmitted, setTaskSubmitted] = useState(initialTaskSubmitted);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  // Use ref for timestamp to prevent iframe reload on re-render
  const cacheBuster = useRef(Date.now());

  // Handle postMessage from iframe
  useEffect(() => {
    const handleMessage = async (event) => {
      // Only accept messages from same origin
      if (event.origin !== window.location.origin) return;

      const { type, ...data } = event.data;

      switch (type) {
        case 'TEMPLATE_LOADED':
          setTemplateLoaded(true);
          // Don't show "Template loaded" message - just send init data
          // Send init data to template
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
              type: 'INIT',
              quizPassed,
              taskSubmitted,
              isCompleted,
            }, '*');
          }
          break;

        case 'QUIZ_COMPLETE':
          setStatusMessage(`Quiz completed: ${data.score}/${data.total}`);
          // Call quiz submit API
          try {
            const res = await fetch('/api/quiz/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                day: data.day,
                answers: data.answers || {},
                score: data.score,
                total: data.total,
                passed: data.passed,
              }),
            });
            const result = await res.json();
            if (res.ok) {
              setQuizResult({ score: data.score, total: data.total, passed: data.passed });
              setStatusMessage(data.passed ? '✓ Quiz passed!' : 'Quiz not passed - try again');
            } else {
              setError(result.error || 'Failed to save quiz');
            }
          } catch (err) {
            setError('Network error saving quiz');
          }
          break;

        case 'TASK_COMPLETE':
          setStatusMessage('Task submitted');
          // Call task submit API
          try {
            const res = await fetch('/api/task/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                day: data.day,
                response: data.response || 'Completed via template',
              }),
            });
            const result = await res.json();
            if (res.ok) {
              setTaskSubmitted(true);
              setStatusMessage('✓ Task submitted! Day completed.');
            } else {
              setError(result.error || 'Failed to save task');
            }
          } catch (err) {
            setError('Network error saving task');
          }
          break;

        case 'NAVIGATE':
          router.push(data.to);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [quizPassed, taskSubmitted, isCompleted, router]);

  return (
    <>
      <Head>
        <title>Day {day} | Market Warrior</title>
      </Head>

      <div className="template-container">
        {/* Status Bar */}
        <div className="status-bar">
          <div className="status-left">
            <button className="nav-btn" onClick={() => router.push('/dashboard')}>
              ← Dashboard
            </button>
            <span className="day-indicator">Day {day} of 30</span>
          </div>
          <div className="status-center">
            {error && <span className="error">{error}</span>}
            {statusMessage && !error && <span className="status">{statusMessage}</span>}
          </div>
          <div className="status-right">
            <span className={`badge ${quizPassed || quizResult?.passed ? 'passed' : ''}`}>
              Quiz: {quizPassed || quizResult?.passed ? '✓' : '○'}
            </span>
            <span className={`badge ${taskSubmitted ? 'passed' : ''}`}>
              Task: {taskSubmitted ? '✓' : '○'}
            </span>
            {day < 30 && (
              <button
                className="nav-btn primary"
                onClick={() => router.push(`/day-template/${day + 1}`)}
                disabled={!taskSubmitted && !isCompleted}
              >
                Next Day →
              </button>
            )}
          </div>
        </div>

        {/* Loading indicator */}
        {!templateLoaded && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading Day {day} content...</p>
          </div>
        )}

        {/* Iframe for template - use ref timestamp to prevent reload on re-render */}
        <iframe
          ref={iframeRef}
          src={`/api/template/${day}?_t=${cacheBuster.current}`}
          className={`template-iframe ${templateLoaded ? 'loaded' : ''}`}
          title={`Day ${day} Content`}
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>

      <style jsx>{`
        .template-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #f5f7fa;
        }

        .status-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          z-index: 100;
        }

        .status-left, .status-right {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .status-center {
          flex: 1;
          text-align: center;
        }

        .day-indicator {
          font-weight: 600;
          color: #3b82f6;
        }

        .nav-btn {
          background: #6b7280;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nav-btn:hover:not(:disabled) {
          background: #4b5563;
        }

        .nav-btn.primary {
          background: #3b82f6;
        }

        .nav-btn.primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .nav-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .badge {
          background: #f3f4f6;
          color: #6b7280;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
        }

        .badge.passed {
          background: #d1fae5;
          color: #065f46;
        }

        .error {
          color: #dc2626;
          font-weight: 500;
        }

        .status {
          color: #059669;
          font-weight: 500;
        }

        .loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          z-index: 50;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 15px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .template-iframe {
          flex: 1;
          width: 100%;
          border: none;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .template-iframe.loaded {
          opacity: 1;
        }
      `}</style>
    </>
  );
}
