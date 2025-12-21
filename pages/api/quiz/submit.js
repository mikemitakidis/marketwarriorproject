import { getServiceSupabase, getUserFromRequest } from '../../../lib/serverAuth';

/**
 * API route: /api/quiz/submit
 *
 * Accepts POST with:
 *   - { day: number, answers: { [questionId]: selectedOption } } - standard mode
 *   - { day: number, answers: [...], score: N, total: N, passed: bool } - iframe template mode
 *
 * Stores the result in `quiz_attempts` and returns score to the client.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { day, answers, score: providedScore, total: providedTotal, passed: providedPassed } = req.body;
    if (!day) {
      return res.status(400).json({ error: 'Missing day' });
    }

    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = user.id;
    const supabase = getServiceSupabase();

    let score, total, passed;

    // Check if this is from iframe template mode (score/total/passed already provided)
    if (providedScore !== undefined && providedTotal !== undefined && providedPassed !== undefined) {
      // Trust the values from the template's JS calculation
      score = parseInt(providedScore);
      total = parseInt(providedTotal);
      passed = Boolean(providedPassed);
    } else {
      // Standard mode: calculate score from answers
      if (!answers) {
        return res.status(400).json({ error: 'Missing answers' });
      }

      // Fetch quiz questions with correct answers for the day
      // Schema: quiz_questions has correct_option, question_text, options (jsonb)
      const { data: questions, error: qErr } = await supabase
        .from('quiz_questions')
        .select('id, correct_option')
        .eq('day', day);

      if (qErr) {
        console.error('Error fetching questions:', qErr);
        return res.status(500).json({ error: 'Could not load quiz questions' });
      }

      if (!questions || questions.length === 0) {
        return res.status(404).json({ error: 'No quiz questions found for this day' });
      }

      // Calculate score - compare answer letters
      // userAnswer is an index (0, 1, 2, 3), correct_option is a letter ('A', 'B', 'C', 'D')
      const letters = ['A', 'B', 'C', 'D'];
      score = 0;
      questions.forEach((q) => {
        const userAnswer = answers[q.id];
        if (userAnswer !== undefined && userAnswer !== null) {
          const userLetter = letters[parseInt(userAnswer)];
          if (userLetter === q.correct_option) {
            score += 1;
          }
        }
      });

      total = questions.length;
      passed = total > 0 && (score / total) >= 0.6;
    }

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
      console.error('Error saving quiz attempt:', insertErr);
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
        console.error('Error inserting quiz attempt:', fallbackErr);
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
    console.error('Quiz submit error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
