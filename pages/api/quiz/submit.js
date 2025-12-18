import { getServiceSupabase } from '../../../lib/supabase';
import { getUserFromJwt } from '../../../lib/auth';

/**
 * API route: /api/quiz/submit
 *
 * Accepts a POST request with `{ day: number, answers: { [questionId]: option } }`.
 * The service fetches the correct answers from the database, computes the
 * score, and stores the result in `quiz_results`.  The score is
 * returned to the client.  This route should only be called from the
 * client after the user completes the quiz; direct access to the
 * correct answers in the database is restricted via RLS.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { day, answers } = req.body;
    if (!day || !answers) throw new Error('Missing day or answers');
    const user = await getUserFromJwt(req);
    const userId = user.id;
    const supabase = getServiceSupabase();
    // Fetch quiz questions with correct answers for the day
    const { data: questions, error: qErr } = await supabase
      .from('quiz_questions')
      .select('id, correct_answer')
      .eq('day', day);
    if (qErr || !questions) throw new Error('Could not load quiz questions');
    let score = 0;
    questions.forEach((q) => {
      const ans = answers[q.id];
      if (ans && ans.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()) {
        score += 1;
      }
    });
    const total = questions.length;
    // Save result
    const { error: upErr } = await supabase
      .from('quiz_results')
      .upsert({ user_id: userId, day, score, total }, { onConflict: 'user_id,day' });
    if (upErr) console.error('Error saving quiz result', upErr);
    // Determine pass/fail (>=60%) and update progress if passed
    const passRate = total > 0 ? score / total : 0;
    if (passRate >= 0.6) {
      // Mark day passed; do not mark completed; the task submission will complete
      await supabase
        .from('challenge_progress')
        .update({ quiz_passed: true })
        .eq('user_id', userId)
        .eq('day', day);
    }
    return res.status(200).json({ score, total, passed: passRate >= 0.6 });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: err.message });
  }
}