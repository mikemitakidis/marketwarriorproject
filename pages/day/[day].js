import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';

/**
 * Day content page.
 *
 * This dynamic route fetches the lesson for a specific day along with
 * quiz questions and tasks from the secure API endpoint `/api/day/[day]`.
 * The server handles all entitlement checks (ownership, unlocks, RLS)
 * and returns only the data the user is allowed to see.  Users must
 * submit the quiz and tasks via the provided endpoints to progress.
 *
 * Authentication is handled via HTTP-only cookies, so no Authorization
 * headers are needed - cookies are automatically sent with fetch requests.
 */
export default function Day() {
  const router = useRouter();
  const { day } = router.query;
  const [data, setData] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [taskResponse, setTaskResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null);

  useEffect(() => {
    if (!day) return;
    async function load() {
      try {
        // Cookies are automatically sent with fetch requests
        const res = await fetch(`/api/day/${day}`, {
          credentials: 'include',
        });
        if (!res.ok) {
          const text = await res.text();
          try {
            const json = JSON.parse(text);
            throw new Error(json.error || res.statusText);
          } catch {
            throw new Error(text || res.statusText);
          }
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [day]);

  async function submitQuiz() {
    setSubmissionStatus('Submitting…');
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ day: Number(day), answers: quizAnswers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setSubmissionStatus(`Quiz score: ${json.score}/${json.total}${json.passed ? ' - Passed!' : ' - Try again'}`);
    } catch (err) {
      setSubmissionStatus(`Error: ${err.message}`);
    }
  }

  async function submitTask() {
    setSubmissionStatus('Submitting task…');
    try {
      const res = await fetch('/api/task/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ day: Number(day), response: taskResponse }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setSubmissionStatus('Task submitted successfully! Next day unlocked.');
    } catch (err) {
      setSubmissionStatus(`Error: ${err.message}`);
    }
  }

  if (loading) return <div className="p-4">Loading…</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!data) return null;

  return (
    <div className="container mx-auto p-4">
      <Head>
        <title>Day {day} – Market Warrior</title>
      </Head>
      <h1 className="text-3xl font-bold mb-4">Day {day}</h1>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Lesson</h2>
        <div dangerouslySetInnerHTML={{ __html: data.lessonHtml }} />
      </div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Quiz</h2>
        {data.quizQuestions.map((q) => (
          <div key={q.id} className="mb-4">
            <p className="font-medium">{q.question}</p>
            {q.options.map((opt, idx) => (
              <label key={idx} className="block">
                <input
                  type="radio"
                  name={`q${q.id}`}
                  value={opt}
                  onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: opt })}
                  className="mr-2"
                />
                {opt}
              </label>
            ))}
          </div>
        ))}
        <button onClick={submitQuiz} className="bg-blue-600 text-white px-4 py-2">
          Submit Quiz
        </button>
      </div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Task</h2>
        <p className="mb-2">{data.taskPrompt}</p>
        <textarea
          value={taskResponse}
          onChange={(e) => setTaskResponse(e.target.value)}
          className="w-full border p-2 mb-2"
          rows={4}
        />
        <button onClick={submitTask} className="bg-green-600 text-white px-4 py-2">
          Submit Task
        </button>
      </div>
      {submissionStatus && <p className="mt-4">{submissionStatus}</p>}
    </div>
  );
}