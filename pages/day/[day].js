import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import fs from 'fs';
import path from 'path';
import { getUserFromRequest, getGateStatus, getServiceSupabase } from '../../lib/serverAuth';

/**
 * Day content page that loads templates directly.
 * Renders the exact HTML template while adding functional quiz/task handling.
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

    // Ensure day 1 progress exists for the user
    if (dayNum === 1) {
      await supabase
        .from('challenge_progress')
        .upsert({ user_id: user.id, day: 1, unlocked: true }, { onConflict: 'user_id,day' });
    }

    // Check if day is unlocked
    const { data: progress } = await supabase
      .from('challenge_progress')
      .select('unlocked, completed')
      .eq('user_id', user.id)
      .eq('day', dayNum)
      .single();

    if (!progress?.unlocked && dayNum !== 1) {
      return { redirect: { destination: '/dashboard', permanent: false } };
    }

    // For days > 1, check if previous day is completed
    if (dayNum > 1) {
      const { data: prevProgress } = await supabase
        .from('challenge_progress')
        .select('completed')
        .eq('user_id', user.id)
        .eq('day', dayNum - 1)
        .single();

      if (!prevProgress?.completed) {
        return { redirect: { destination: '/dashboard', permanent: false } };
      }

      // Check quiz was passed (60% threshold)
      const { data: quizAttempt } = await supabase
        .from('quiz_attempts')
        .select('score, max_score, passed')
        .eq('user_id', user.id)
        .eq('day', dayNum - 1)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();

      if (quizAttempt) {
        const passed = quizAttempt.passed || (quizAttempt.max_score > 0 && quizAttempt.score / quizAttempt.max_score >= 0.6);
        if (!passed) {
          return { redirect: { destination: '/dashboard', permanent: false } };
        }
      }

      // Check task was submitted
      const { data: taskSubmission } = await supabase
        .from('task_submissions')
        .select('id')
        .eq('user_id', user.id)
        .eq('day', dayNum - 1)
        .limit(1)
        .single();

      if (!taskSubmission) {
        return { redirect: { destination: '/dashboard', permanent: false } };
      }
    }

    // Load template file
    const templatesDir = path.join(process.cwd(), 'templates', 'days');
    let templateHtml = '';

    // Try different file naming patterns
    const patterns = [
      `day${dayNum}.html`,
      `day${dayNum}_*.html`,
    ];

    const files = fs.readdirSync(templatesDir);
    let templateFile = files.find(f => f === `day${dayNum}.html`) ||
                       files.find(f => f.startsWith(`day${dayNum}_`) && f.endsWith('.html'));

    if (templateFile) {
      templateHtml = fs.readFileSync(path.join(templatesDir, templateFile), 'utf8');
    }

    // Check if already completed
    const isCompleted = progress?.completed || false;

    return {
      props: {
        day: dayNum,
        templateHtml,
        isCompleted,
        userName: gate.fullName || 'Trader',
      },
    };
  } catch (err) {
    console.error('Day page error:', err);
    return { redirect: { destination: '/dashboard', permanent: false } };
  }
}

export default function DayPage({ day, templateHtml, isCompleted, userName }) {
  const router = useRouter();
  const contentRef = useRef(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [taskResponse, setTaskResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [taskSubmitted, setTaskSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Extract content from template
  const extractContent = (html) => {
    if (!html) return { styles: '', bodyContent: '', title: '' };

    // Extract styles from <style> tags
    const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
    const styles = styleMatches.map(s => s.replace(/<\/?style[^>]*>/gi, '')).join('\n');

    // Extract body content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let bodyContent = bodyMatch ? bodyMatch[1] : html;

    // Remove any script tags for security (we'll handle quiz/task via React)
    bodyContent = bodyContent.replace(/<script[\s\S]*?<\/script>/gi, '');

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : `Day ${day}`;

    return { styles, bodyContent, title };
  };

  const { styles, bodyContent, title } = extractContent(templateHtml);

  useEffect(() => {
    if (contentRef.current) {
      // Setup quiz functionality after content loads
      setupQuizHandlers();
      setupTaskHandlers();
    }
  }, [bodyContent]);

  const setupQuizHandlers = () => {
    const container = contentRef.current;
    if (!container) return;

    // Find all quiz options and attach handlers
    const quizOptions = container.querySelectorAll('.quiz-option, [data-quiz-option]');
    quizOptions.forEach((option, idx) => {
      option.addEventListener('click', (e) => {
        // Get question ID from parent or data attribute
        const question = option.closest('.quiz-question, [data-question-id]');
        const questionId = question?.dataset?.questionId || `q${Math.floor(idx / 4)}`;
        const value = option.dataset?.value || option.textContent?.trim();

        // Update state
        setQuizAnswers(prev => ({ ...prev, [questionId]: value }));

        // Visual feedback
        const siblings = question?.querySelectorAll('.quiz-option, [data-quiz-option]');
        siblings?.forEach(s => s.classList.remove('selected'));
        option.classList.add('selected');
      });
    });
  };

  const setupTaskHandlers = () => {
    const container = contentRef.current;
    if (!container) return;

    // Find task textarea if exists
    const taskTextarea = container.querySelector('.task-textarea, #taskResponse, [name="task"]');
    if (taskTextarea) {
      taskTextarea.addEventListener('input', (e) => {
        setTaskResponse(e.target.value);
      });
    }
  };

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
      if (data.passed) {
        setSuccess('Quiz passed! You can now complete the task.');
      } else {
        setError(`Score: ${data.score}/${data.total}. You need 60% to pass. Review and try again.`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
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
        body: JSON.stringify({ day, response: taskResponse }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit task');
      setTaskSubmitted(true);
      setSuccess('Day completed! Redirecting to dashboard...');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmitTask = quizResult?.passed || isCompleted;

  // If no template content, show database-driven fallback
  if (!templateHtml) {
    return (
      <>
        <Head>
          <title>Day {day} - Market Warrior</title>
        </Head>
        <style jsx global>{`
          body { background: #f5f7fa; font-family: 'Segoe UI', sans-serif; }
        `}</style>
        <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', textAlign: 'center' }}>
          <h1>Day {day} Content</h1>
          <p>Content for this day is being prepared. Please check back soon!</p>
          <a href="/dashboard" style={{ color: '#3b82f6' }}>← Back to Dashboard</a>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <link rel="icon" type="image/png" href="/logo.png" />
      </Head>

      {/* Inject template styles */}
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      {/* Additional functional styles */}
      <style jsx global>{`
        .mw-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 12px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 9999;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .mw-header a {
          color: white;
          text-decoration: none;
          font-weight: 700;
          font-size: 1.2em;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .mw-header img {
          width: 35px;
          height: 35px;
          border-radius: 8px;
        }
        .mw-header-right {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .mw-header-right span {
          color: rgba(255,255,255,0.9);
        }
        .mw-logout-btn {
          background: rgba(255,255,255,0.2);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }
        .mw-logout-btn:hover {
          background: rgba(255,255,255,0.3);
        }
        .mw-content-wrapper {
          padding-top: 70px;
        }
        .mw-controls {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9998;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .mw-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 10px;
          font-size: 1em;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          transition: all 0.3s;
        }
        .mw-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }
        .mw-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .mw-btn-success {
          background: linear-gradient(135deg, #10b981, #059669);
        }
        .mw-message {
          position: fixed;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          padding: 15px 30px;
          border-radius: 10px;
          font-weight: 600;
          z-index: 9999;
          max-width: 90%;
          text-align: center;
        }
        .mw-message.error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }
        .mw-message.success {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }
        .mw-completed-badge {
          position: fixed;
          top: 80px;
          right: 20px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 10px 20px;
          border-radius: 25px;
          font-weight: 700;
          z-index: 9998;
        }
        .quiz-option.selected {
          background: linear-gradient(135deg, #667eea, #764ba2) !important;
          color: white !important;
          border-color: #667eea !important;
        }
        .mw-task-input {
          position: fixed;
          bottom: 80px;
          right: 20px;
          width: 350px;
          z-index: 9998;
          background: white;
          border-radius: 15px;
          padding: 20px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          display: none;
        }
        .mw-task-input.visible {
          display: block;
        }
        .mw-task-input textarea {
          width: 100%;
          min-height: 120px;
          padding: 15px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 1em;
          resize: vertical;
          margin-bottom: 15px;
        }
        .mw-task-input textarea:focus {
          outline: none;
          border-color: #667eea;
        }
        .mw-task-input h4 {
          margin-bottom: 15px;
          color: #1e293b;
        }
      `}</style>

      {/* Fixed Header */}
      <header className="mw-header">
        <a href="/dashboard">
          <img src="/logo.png" alt="" onError={(e) => e.target.style.display = 'none'} />
          Market Warrior
        </a>
        <div className="mw-header-right">
          <span>{userName}</span>
          <button className="mw-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {/* Messages */}
      {error && <div className="mw-message error">{error}</div>}
      {success && <div className="mw-message success">{success}</div>}

      {/* Completed Badge */}
      {isCompleted && <div className="mw-completed-badge">✓ Day Completed</div>}

      {/* Template Content */}
      <div className="mw-content-wrapper">
        <div ref={contentRef} dangerouslySetInnerHTML={{ __html: bodyContent }} />
      </div>

      {/* Task Input Panel */}
      <div className={`mw-task-input ${canSubmitTask && !taskSubmitted && !isCompleted ? 'visible' : ''}`}>
        <h4>📝 Daily Task</h4>
        <textarea
          placeholder="Write your task response here..."
          value={taskResponse}
          onChange={(e) => setTaskResponse(e.target.value)}
        />
        <button
          className="mw-btn mw-btn-success"
          onClick={submitTask}
          disabled={submitting || !taskResponse.trim()}
          style={{ width: '100%' }}
        >
          {submitting ? 'Submitting...' : 'Submit Task & Complete Day'}
        </button>
      </div>

      {/* Floating Controls */}
      <div className="mw-controls">
        {!quizResult && !isCompleted && (
          <button
            className="mw-btn"
            onClick={submitQuiz}
            disabled={submitting || Object.keys(quizAnswers).length === 0}
          >
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        )}

        {quizResult && (
          <div style={{
            background: quizResult.passed ? '#f0fdf4' : '#fef2f2',
            color: quizResult.passed ? '#16a34a' : '#dc2626',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            {quizResult.passed ? `✓ Passed! ${quizResult.score}/${quizResult.total}` : `✗ ${quizResult.score}/${quizResult.total} - Need 60%`}
          </div>
        )}

        {taskSubmitted && (
          <div style={{
            background: '#f0fdf4',
            color: '#16a34a',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: '600'
          }}>
            ✓ Day Completed!
          </div>
        )}

        <a href="/dashboard" style={{
          background: 'rgba(0,0,0,0.1)',
          color: '#1e293b',
          padding: '12px 24px',
          borderRadius: '10px',
          textDecoration: 'none',
          fontWeight: '600',
          textAlign: 'center'
        }}>
          ← Dashboard
        </a>
      </div>
    </>
  );
}
