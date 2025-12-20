import { useRouter } from 'next/router';
import { useState } from 'react';
import Head from 'next/head';
import { getUserFromRequest, getGateStatus, getServiceSupabase, getUserChallengeStatus } from '../../lib/serverAuth';

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
    const challengeStatus = await getUserChallengeStatus(user.id);
    const { unlockedDays, welcomeCompletedAt } = challengeStatus;

    if (!unlockedDays.includes(dayNum)) {
      return { redirect: { destination: '/dashboard', permanent: false } };
    }

    await supabase
      .from('challenge_progress')
      .upsert({ user_id: user.id, day: dayNum, unlocked: true }, { onConflict: 'user_id,day' });

    const { data: progress } = await supabase
      .from('challenge_progress')
      .select('completed, quiz_passed, task_submitted')
      .eq('user_id', user.id)
      .eq('day', dayNum)
      .single();

    const { data: content } = await supabase
      .from('course_content')
      .select('title, html_content, video_url, task_prompt')
      .eq('day', dayNum)
      .single();

    const { data: rawQuizQuestions } = await supabase
      .from('quiz_questions')
      .select('id, question, options')
      .eq('day', dayNum)
      .order('id');

    const quizQuestions = (rawQuizQuestions || []).map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
    }));

    return {
      props: {
        day: dayNum,
        content: content || null,
        quizQuestions: quizQuestions || [],
        isCompleted: progress?.completed || false,
        quizPassed: progress?.quiz_passed || false,
        taskSubmitted: progress?.task_submitted || false,
        userName: gate.fullName || 'Trader',
        welcomeCompletedAt: welcomeCompletedAt || null,
      },
    };
  } catch (err) {
    console.error('Day page error:', err);
    return { redirect: { destination: '/dashboard', permanent: false } };
  }
}

export default function DayPage({ day, content, quizQuestions, isCompleted, quizPassed, taskSubmitted: initialTaskSubmitted, userName, welcomeCompletedAt }) {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [taskResponse, setTaskResponse] = useState('');
  const [taskFile, setTaskFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [taskSubmitted, setTaskSubmitted] = useState(initialTaskSubmitted);
  const [error, setError] = useState('');
  const [showQuizResults, setShowQuizResults] = useState(false);

  const totalQuestions = quizQuestions.length;
  const progressPercent = ((day) / 30) * 100;

  const selectOption = (questionId, optionIndex) => {
    if (quizResult?.passed || quizPassed) return;
    setQuizAnswers({ ...quizAnswers, [questionId]: optionIndex });
  };

  const nextQuestion = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      submitQuiz();
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
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
      setShowQuizResults(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const retakeQuiz = () => {
    setQuizAnswers({});
    setCurrentQuestion(0);
    setQuizResult(null);
    setShowQuizResults(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    if (!taskResponse.trim() || taskResponse.trim().split(/\s+/).length < 10) {
      setError('Please write at least 10 words for your task response');
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
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmitTask = quizResult?.passed || quizPassed;

  // Calculate unlock times
  const getUnlockTime = (targetDay) => {
    if (!welcomeCompletedAt) return 'TBD';
    const start = new Date(welcomeCompletedAt);
    const unlockDate = new Date(start.getTime() + ((targetDay - 1) * 24 * 60 * 60 * 1000));
    return unlockDate.toLocaleDateString() + ' at ' + unlockDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Convert YouTube URL to embed format
  const getEmbedUrl = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    return url;
  };

  return (
    <>
      <Head>
        <title>Day {day}: {content?.title || 'Lesson'} | Market Warrior</title>
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          background: #f5f7fa;
          color: #1e293b;
        }

        /* Lesson Content Styles - from HTML templates */
        .lesson-content h2 {
          color: #1e293b;
          margin: 30px 0 20px;
          font-size: 1.8em;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .lesson-content h3 {
          color: #3b82f6;
          font-size: 1.4em;
          margin: 25px 0 15px;
        }
        .lesson-content h4 {
          color: #3b82f6;
          font-size: 1.2em;
          margin: 20px 0 10px;
        }
        .lesson-content p {
          margin-bottom: 15px;
          color: #475569;
        }
        .lesson-content ul, .lesson-content ol {
          margin: 15px 0 15px 25px;
        }
        .lesson-content li {
          margin-bottom: 8px;
        }
        .lesson-content strong {
          color: #1e293b;
        }

        /* Highlight Box */
        .highlight-box {
          background: #f8fafc;
          border: 2px solid #3b82f6;
          border-radius: 12px;
          padding: 25px;
          margin: 25px 0;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.1);
        }

        /* Market Cards Grid */
        .market-comparison {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 25px;
          margin: 30px 0;
        }
        .market-card {
          background: #f8fafc;
          padding: 25px;
          border-radius: 15px;
          border-left: 5px solid #3b82f6;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        .market-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0,0,0,0.1);
        }
        .market-card h4 {
          color: #3b82f6;
          margin-bottom: 15px;
          font-size: 1.3em;
        }

        /* Market Visual Box */
        .market-visual {
          text-align: center;
          margin: 40px 0;
          padding: 30px;
          background: white;
          border-radius: 20px;
          border: 2px solid #3b82f6;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }
        .market-visual h3 {
          color: #3b82f6;
          margin-bottom: 20px;
        }

        /* Market Icons Grid */
        .market-icons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        .market-icon {
          text-align: center;
          padding: 20px;
          background: #f8fafc;
          border-radius: 15px;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }
        .market-icon:hover {
          background: #f1f5f9;
          transform: scale(1.05);
          border-color: #3b82f6;
        }
        .market-icon span {
          font-size: 2.5em;
          display: block;
          margin-bottom: 10px;
        }
        .market-icon h5 {
          color: #1e293b;
          font-weight: 600;
        }

        /* Why Popular Section */
        .why-popular {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          padding: 40px;
          border-radius: 20px;
          margin: 40px 0;
        }
        .why-popular h2 {
          color: white !important;
          text-align: center;
          margin-bottom: 30px;
        }
        .why-popular .market-card {
          background: rgba(255,255,255,0.15);
          color: white;
          border-left-color: white;
        }
        .why-popular .market-card h4 {
          color: white !important;
        }
        .why-popular .market-card p {
          color: rgba(255,255,255,0.9);
        }
        .why-popular ul {
          list-style: none;
          padding: 0;
        }
        .why-popular li {
          padding: 10px 0;
          padding-left: 25px;
          position: relative;
        }
        .why-popular li::before {
          content: '•';
          position: absolute;
          left: 0;
          color: white;
        }

        /* Safety Warning */
        .safety-warning {
          background: #fef2f2;
          color: #dc2626;
          padding: 20px;
          border-radius: 10px;
          border-left: 5px solid #dc2626;
          margin: 20px 0;
          font-weight: 600;
        }

        /* Interactive Element */
        .interactive-element {
          background: rgba(59, 130, 246, 0.1);
          border: 2px dashed #3b82f6;
          border-radius: 15px;
          padding: 25px;
          margin: 25px 0;
          text-align: center;
        }
        .interactive-element h4 {
          color: #3b82f6;
          margin-bottom: 15px;
        }

        /* Tables */
        .lesson-content table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          margin: 20px 0;
        }
        .lesson-content thead tr {
          background: linear-gradient(135deg, #1e293b, #475569);
          color: white;
        }
        .lesson-content th {
          padding: 18px 15px;
          text-align: left;
          font-weight: 600;
        }
        .lesson-content td {
          padding: 16px 15px;
          border-bottom: 1px solid #e2e8f0;
        }
        .lesson-content tbody tr:nth-child(even) {
          background: #f8fafc;
        }
        .lesson-content tbody tr:hover {
          background: #f1f5f9;
        }

        /* Extra Learning Notes */
        .extra-notes {
          background: white;
          padding: 40px;
          border-radius: 20px;
          border-left: 6px solid #3b82f6;
          margin: 40px 0;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }

        /* Sneak Peek from HTML */
        .lesson-content .sneak-peek,
        div[class*="sneak"] {
          background: linear-gradient(135deg, #7c3aed, #5b21b6) !important;
          color: white !important;
          padding: 30px;
          border-radius: 15px;
          margin: 40px 0;
          text-align: center;
        }
        .lesson-content .sneak-peek h2,
        .lesson-content .sneak-peek p {
          color: white !important;
        }

        /* Completion Section from HTML */
        .lesson-content .completion-section {
          background: linear-gradient(135deg, #059669, #047857) !important;
          color: white !important;
          padding: 30px;
          border-radius: 15px;
          text-align: center;
          margin: 40px 0;
        }
        .lesson-content .completion-section h2,
        .lesson-content .completion-section p {
          color: white !important;
        }
        .lesson-content .completion-button {
          background: #3b82f6;
          color: white;
          padding: 15px 30px;
          border: none;
          border-radius: 25px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin: 10px;
          transition: all 0.3s ease;
          text-decoration: none;
          display: inline-block;
        }
        .lesson-content .completion-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }

        /* Video Placeholder */
        .video-placeholder {
          background: #111;
          border-radius: 15px;
          aspect-ratio: 16/9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.2em;
        }

        /* Task Section from HTML */
        .lesson-content .task-section {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          color: #92400e;
          padding: 30px;
          border-radius: 15px;
          border-left: 6px solid #f59e0b;
          margin: 40px 0;
        }
        .lesson-content .task-section h2 {
          color: #92400e;
        }

        /* Quiz Container from HTML */
        .lesson-content .quiz-container {
          background: white;
          padding: 30px;
          border-radius: 15px;
          border-left: 6px solid #10b981;
          margin: 30px 0;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }
        .lesson-content .quiz-header {
          text-align: center;
          margin-bottom: 30px;
        }
        .lesson-content .quiz-header h2 {
          color: #065f46;
        }

        /* Rewards Section */
        .rewards-section {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          padding: 40px;
          border-radius: 20px;
          margin: 40px 0;
        }
        .rewards-section h2 {
          color: white !important;
        }
      `}</style>

      <div className="container">
        {/* Day Header */}
        <div className="day-header">
          <div className="day-badge">DAY {day} OF 30</div>
          <h1>{content?.title || `Day ${day} Lesson`}</h1>
          <p>Welcome to Day {day} of your trading journey!</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        {!content ? (
          <div className="section">
            <h2>Content Coming Soon</h2>
            <p>The content for Day {day} is being prepared. Check back soon!</p>
          </div>
        ) : (
          <>
            {/* Video Section */}
            {content.video_url && (
              <div className="section">
                <h2>📹 Video Lesson</h2>
                <div className="video-container">
                  <iframe
                    src={getEmbedUrl(content.video_url)}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* Lesson Content */}
            <div className="section">
              <h2>📖 Lesson Content</h2>
              <div
                className="lesson-content"
                dangerouslySetInnerHTML={{ __html: content.html_content || '<p>No lesson content available.</p>' }}
              />
            </div>

            {/* Task Section */}
            {content.task_prompt && (
              <div className="task-section">
                <h2>📝 Day {day} Task</h2>
                <h3>Your Mission:</h3>
                <div className="task-prompt" dangerouslySetInnerHTML={{ __html: content.task_prompt }} />

                <div className="task-submission-box">
                  <h4>📋 Task Submission Required</h4>
                  <p><strong>⚠️ Important:</strong> You must submit this task to complete Day {day}. Day {day + 1} will become available 24 hours after you started the challenge.</p>

                  {taskSubmitted ? (
                    <div className="success-message">
                      <strong>✓ Task Submitted Successfully!</strong>
                      <p>You've completed Day {day}.</p>
                    </div>
                  ) : (
                    <>
                      <textarea
                        placeholder="Write your response here... (minimum 10 words)"
                        value={taskResponse}
                        onChange={(e) => setTaskResponse(e.target.value)}
                        disabled={!canSubmitTask}
                        className="task-textarea"
                      />

                      <div className="file-upload">
                        <label>Optional: Upload additional file (image, document, etc.)</label>
                        <input
                          type="file"
                          onChange={handleFileChange}
                          disabled={!canSubmitTask || uploadingFile}
                          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.mp4,.mov"
                        />
                        {uploadingFile && <p className="uploading">Uploading file...</p>}
                        {uploadedFileUrl && <p className="uploaded">✓ File uploaded: {taskFile?.name}</p>}
                      </div>

                      <button
                        className="submit-task-btn"
                        onClick={submitTask}
                        disabled={submitting || uploadingFile || !canSubmitTask || !taskResponse.trim()}
                      >
                        {submitting ? 'Submitting...' : `Submit Day ${day} Task`}
                      </button>

                      {!canSubmitTask && (
                        <p className="hint">⚠️ Pass the quiz first (60% minimum) to unlock task submission.</p>
                      )}
                    </>
                  )}
                </div>

                <div className="unlock-schedule">
                  <h4>🕐 Day Unlock Schedule</h4>
                  <p><strong>Day {day}:</strong> Available now</p>
                  {day < 30 && <p><strong>Day {day + 1}:</strong> Unlocks: {getUnlockTime(day + 1)}</p>}
                  {day < 29 && <p><strong>Day {day + 2}:</strong> Unlocks: {getUnlockTime(day + 2)}</p>}
                  <p className="schedule-note"><em>Each day requires completion of the previous day's task and quiz.</em></p>
                </div>
              </div>
            )}

            {/* Quiz Section */}
            {quizQuestions.length > 0 && (
              <div className="quiz-container">
                <div className="quiz-header">
                  <h2>Day {day} Knowledge Quiz</h2>
                  <p>Test your understanding of today's lesson</p>
                  <div className="quiz-progress">
                    <div className="quiz-progress-fill" style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}></div>
                  </div>
                  <p className="question-counter">Question {currentQuestion + 1} of {totalQuestions}</p>
                </div>

                {showQuizResults ? (
                  <div className="quiz-results">
                    <h3>Quiz Complete!</h3>
                    <div className="score-circle">
                      <div className="score-text">{quizResult?.score}/{quizResult?.total}</div>
                    </div>
                    <div className={`performance-message ${quizResult?.passed ? 'passed' : 'failed'}`}>
                      {quizResult?.passed
                        ? 'Great job! You passed. You can now submit your task.'
                        : 'You need at least 60% to proceed. Please review and try again.'}
                    </div>
                    <div className="quiz-summary">
                      <div className="summary-item">
                        <div className="summary-number correct">{quizResult?.score}</div>
                        <div className="summary-label">Correct</div>
                      </div>
                      <div className="summary-item">
                        <div className="summary-number incorrect">{quizResult?.total - quizResult?.score}</div>
                        <div className="summary-label">Incorrect</div>
                      </div>
                      <div className="summary-item">
                        <div className="summary-number">{Math.round((quizResult?.score / quizResult?.total) * 100)}%</div>
                        <div className="summary-label">Score</div>
                      </div>
                    </div>
                    {quizResult?.passed ? (
                      <button className="quiz-btn next" onClick={() => setShowQuizResults(false)}>
                        Continue to Task
                      </button>
                    ) : (
                      <button className="quiz-btn" onClick={retakeQuiz}>
                        Retake Quiz
                      </button>
                    )}
                  </div>
                ) : quizPassed ? (
                  <div className="quiz-results">
                    <h3>Quiz Already Passed!</h3>
                    <div className="performance-message passed">
                      You've already passed this quiz. Complete the task above to finish Day {day}.
                    </div>
                  </div>
                ) : (
                  <>
                    {quizQuestions.map((q, qIdx) => (
                      <div
                        key={q.id}
                        className={`question-container ${qIdx === currentQuestion ? 'active' : ''}`}
                        style={{ display: qIdx === currentQuestion ? 'block' : 'none' }}
                      >
                        <div className="question-number">{qIdx + 1}</div>
                        <div className="question-text">{q.question}</div>
                        <div className="quiz-options">
                          {q.options?.map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              className={`quiz-option ${quizAnswers[q.id] === optIdx ? 'selected' : ''}`}
                              onClick={() => selectOption(q.id, optIdx)}
                            >
                              <div className="option-letter">{['A', 'B', 'C', 'D'][optIdx]}</div>
                              <span>{opt}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div className="quiz-navigation">
                      <button
                        className="quiz-btn"
                        onClick={prevQuestion}
                        disabled={currentQuestion === 0}
                      >
                        Previous
                      </button>
                      <div className="question-info">{currentQuestion + 1} of {totalQuestions}</div>
                      <button
                        className="quiz-btn next"
                        onClick={nextQuestion}
                        disabled={quizAnswers[quizQuestions[currentQuestion]?.id] === undefined || submitting}
                      >
                        {currentQuestion === totalQuestions - 1 ? (submitting ? 'Submitting...' : 'Finish Quiz') : 'Next'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Sneak Peek */}
            {day < 30 && (
              <div className="sneak-peek">
                <h2>👀 Sneak Peek: Day {day + 1}</h2>
                <p>Tomorrow, you'll continue your trading journey with more advanced concepts.</p>
                <p><strong>Get ready:</strong> Each day builds on the previous one!</p>
              </div>
            )}

            {/* Completion Section */}
            <div className="completion-section">
              <h2>🎉 Day {day} {isCompleted ? 'Complete!' : 'Progress'}</h2>
              {isCompleted ? (
                <>
                  <p>Congratulations! You've completed Day {day}.</p>
                  <button className="completion-button" onClick={() => router.push('/dashboard')}>
                    Back to Dashboard
                  </button>
                  {day < 30 && (
                    <button className="completion-button primary" onClick={() => router.push(`/day/${day + 1}`)}>
                      Continue to Day {day + 1}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p>Complete the quiz (60% minimum) and submit your task to finish Day {day}.</p>
                  <button className="completion-button" onClick={() => router.push('/dashboard')}>
                    Back to Dashboard
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
        }

        .day-header {
          background: white;
          padding: 40px;
          text-align: center;
          border-radius: 20px;
          margin-bottom: 40px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }

        .day-badge {
          background: linear-gradient(135deg, #ff6b6b, #ee5a24);
          color: white;
          padding: 10px 20px;
          border-radius: 25px;
          font-weight: bold;
          display: inline-block;
          margin-bottom: 20px;
          box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
        }

        .day-header h1 {
          font-size: 2.5em;
          margin-bottom: 10px;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .day-header p {
          color: #64748b;
          font-size: 1.2em;
        }

        .progress-bar {
          width: 100%;
          height: 12px;
          background: rgba(59, 130, 246, 0.2);
          border-radius: 6px;
          margin: 25px 0 0;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
          border-radius: 6px;
          transition: width 0.8s ease;
        }

        .error-box {
          background: #fef2f2;
          color: #dc2626;
          padding: 15px 20px;
          border-radius: 10px;
          border-left: 5px solid #dc2626;
          margin-bottom: 20px;
        }

        .section {
          background: white;
          padding: 40px;
          border-radius: 20px;
          margin-bottom: 40px;
          border-left: 6px solid #3b82f6;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }

        .section h2 {
          color: #1e293b;
          margin-bottom: 25px;
          font-size: 1.8em;
        }

        .lesson-content {
          line-height: 1.8;
          color: #475569;
        }

        .video-container {
          position: relative;
          padding-bottom: 56.25%;
          border-radius: 15px;
          overflow: hidden;
          background: #111;
        }

        .video-container iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }

        /* Task Section Styles */
        .task-section {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          color: #92400e;
          padding: 30px;
          border-radius: 20px;
          border-left: 6px solid #f59e0b;
          margin-bottom: 40px;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }

        .task-section h2 {
          color: #92400e;
          margin-bottom: 15px;
        }

        .task-section h3 {
          color: #92400e;
          margin-bottom: 10px;
        }

        .task-prompt {
          margin-bottom: 20px;
        }

        .task-submission-box {
          background: rgba(255,193,7,0.2);
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
          border-left: 5px solid #ffc107;
        }

        .task-submission-box h4 {
          margin-bottom: 10px;
        }

        .task-textarea {
          width: 100%;
          height: 120px;
          padding: 15px;
          border: 2px solid #ffc107;
          border-radius: 8px;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
          margin: 15px 0;
          background: white;
        }

        .file-upload {
          margin: 15px 0;
        }

        .file-upload label {
          display: block;
          margin-bottom: 10px;
          font-weight: 600;
        }

        .file-upload input {
          padding: 10px;
          background: white;
          border: 2px solid #ffc107;
          border-radius: 5px;
          width: 100%;
        }

        .uploading { color: #3b82f6; margin-top: 5px; }
        .uploaded { color: #10b981; margin-top: 5px; }

        .submit-task-btn {
          background: #1e293b;
          color: white;
          padding: 15px 30px;
          border: none;
          border-radius: 25px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .submit-task-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }

        .submit-task-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .hint {
          margin-top: 15px;
          color: #92400e;
          font-style: italic;
        }

        .success-message {
          background: #d1fae5;
          color: #065f46;
          padding: 20px;
          border-radius: 10px;
          border-left: 5px solid #10b981;
        }

        .unlock-schedule {
          background: #e0f2fe;
          color: #0369a1;
          padding: 20px;
          border-radius: 10px;
          margin-top: 20px;
          border-left: 5px solid #0ea5e9;
        }

        .unlock-schedule h4 {
          margin-bottom: 10px;
        }

        .schedule-note {
          font-size: 0.9em;
          margin-top: 10px;
        }

        /* Quiz Styles */
        .quiz-container {
          background: white;
          padding: 30px;
          border-radius: 20px;
          border-left: 6px solid #10b981;
          margin-bottom: 40px;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }

        .quiz-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .quiz-header h2 {
          color: #065f46;
          margin-bottom: 10px;
        }

        .quiz-progress {
          background: #e5e7eb;
          height: 8px;
          border-radius: 4px;
          margin: 20px 0;
          overflow: hidden;
        }

        .quiz-progress-fill {
          background: #10b981;
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .question-counter {
          color: #6b7280;
        }

        .question-container {
          padding: 25px;
          background: #f8fafc;
          border-radius: 12px;
          border: 2px solid #e5e7eb;
          margin-bottom: 20px;
        }

        .question-container.active {
          border-color: #10b981;
          background: #f0fdf4;
        }

        .question-number {
          background: #10b981;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          margin-bottom: 15px;
        }

        .question-text {
          font-size: 1.1em;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 20px;
        }

        .quiz-options {
          display: grid;
          gap: 12px;
        }

        .quiz-option {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .quiz-option:hover {
          border-color: #3b82f6;
          background: #f8fafc;
        }

        .quiz-option.selected {
          border-color: #10b981;
          background: #f0fdf4;
        }

        .option-letter {
          background: #e5e7eb;
          color: #374151;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          flex-shrink: 0;
        }

        .quiz-option.selected .option-letter {
          background: #10b981;
          color: white;
        }

        .quiz-navigation {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .quiz-btn {
          background: #6b7280;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .quiz-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .quiz-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .quiz-btn.next {
          background: #10b981;
        }

        .question-info {
          color: #6b7280;
          font-weight: 500;
        }

        .quiz-results {
          text-align: center;
          padding: 40px;
        }

        .score-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 20px auto;
        }

        .score-text {
          font-size: 1.8em;
          font-weight: bold;
          color: white;
        }

        .performance-message {
          font-size: 1.2em;
          font-weight: 600;
          margin: 20px 0;
          padding: 20px;
          border-radius: 10px;
        }

        .performance-message.passed {
          background: #d1fae5;
          color: #065f46;
        }

        .performance-message.failed {
          background: #fee2e2;
          color: #991b1b;
        }

        .quiz-summary {
          display: flex;
          justify-content: center;
          gap: 30px;
          margin: 30px 0;
        }

        .summary-item {
          text-align: center;
        }

        .summary-number {
          font-size: 2em;
          font-weight: bold;
          color: #10b981;
        }

        .summary-number.incorrect {
          color: #ef4444;
        }

        .summary-label {
          color: #6b7280;
          font-size: 0.9em;
        }

        /* Sneak Peek */
        .sneak-peek {
          background: linear-gradient(135deg, #7c3aed, #5b21b6);
          color: white;
          padding: 30px;
          border-radius: 20px;
          margin-bottom: 40px;
          text-align: center;
        }

        .sneak-peek h2 {
          margin-bottom: 15px;
        }

        /* Completion Section */
        .completion-section {
          background: linear-gradient(135deg, #059669, #047857);
          color: white;
          padding: 40px;
          border-radius: 20px;
          text-align: center;
        }

        .completion-section h2 {
          margin-bottom: 15px;
        }

        .completion-button {
          background: white;
          color: #059669;
          padding: 15px 30px;
          border: none;
          border-radius: 25px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin: 10px;
          transition: all 0.3s ease;
        }

        .completion-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }

        .completion-button.primary {
          background: #3b82f6;
          color: white;
        }

        @media (max-width: 768px) {
          .container { padding: 15px; }
          .day-header { padding: 25px; }
          .day-header h1 { font-size: 1.8em; }
          .section { padding: 20px; }
          .quiz-summary { flex-direction: column; gap: 15px; }
        }
      `}</style>
    </>
  );
}
