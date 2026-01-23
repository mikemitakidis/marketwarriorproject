import { getServiceSupabase, getUserFromRequest } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * API route: /api/quiz/submit
 *
 * Accepts POST with:
 *   - { day: number, answers: { [questionId]: selectedOption } }
 *
 * SECURITY: Always recalculates score server-side. Never trusts client-provided scores.
 * Stores the result in `quiz_attempts` and returns score to the client.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get user first for rate limiting
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Apply rate limiting per user
  const identifier = getIdentifier(req, user.id);
  const rateLimitResult = await applyRateLimit(req, res, rateLimiters.submission, identifier);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { day, answers } = req.body;
    if (!day) {
      return res.status(400).json({ error: 'Missing day' });
    }

    if (!answers) {
      return res.status(400).json({ error: 'Missing answers' });
    }

    const userId = user.id;
    const supabase = getServiceSupabase();

    // SECURITY: Always fetch quiz questions and calculate score server-side
    // Fetch quiz questions with correct answers for the day
    const { data: questions, error: qErr } = await supabase
      .from('quiz_questions')
      .select('id, correct_option')
      .eq('day', day);

    if (qErr) {
      logger.error('Error fetching questions:', qErr);
      return res.status(500).json({ error: 'Could not load quiz questions' });
    }

    if (!questions || questions.length === 0) {
      return res.status(404).json({ error: 'No quiz questions found for this day' });
    }

    // Calculate score - compare answer letters
    // userAnswer is an index (0, 1, 2, 3), correct_option is a letter ('A', 'B', 'C', 'D')
    const letters = ['A', 'B', 'C', 'D'];
    let score = 0;
    questions.forEach((q) => {
      const userAnswer = answers[q.id];
      if (userAnswer !== undefined && userAnswer !== null) {
        const userLetter = letters[parseInt(userAnswer)];
        if (userLetter === q.correct_option) {
          score += 1;
        }
      }
    });

    const total = questions.length;
    const passed = total > 0 && (score / total) >= 0.6;

    // Save result to quiz_attempts (correct table name from schema!)
    const { error: insertErr } = await supabase
      .from('quiz_attempts')
      .upsert({
        user_id: userId,
        day: day,
        answers: answers || null,
        score: score,
        max_score: total,
        passed: passed,
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'user_id,day' });

    if (insertErr) {
      logger.error('Error saving quiz attempt:', insertErr);
      // Try insert if upsert fails (might not have unique constraint)
      const { error: fallbackErr } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: userId,
          day: day,
          answers: answers || null,
          score: score,
          max_score: total,
          passed: passed,
          submitted_at: new Date().toISOString(),
        });

      if (fallbackErr) {
        logger.error('Error inserting quiz attempt:', fallbackErr);
      }
    }

    // Update challenge_progress if passed (use upsert in case row doesn't exist)
    if (passed) {
      await supabase
        .from('challenge_progress')
        .upsert({
          user_id: userId,
          day: day,
          quiz_passed: true,
          unlocked: true,
        }, { onConflict: 'user_id,day' });
    }

    return res.status(200).json({ score, total, passed });

  } catch (err) {
    logger.error('Quiz submit error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
