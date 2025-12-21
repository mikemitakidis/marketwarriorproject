import { getServiceSupabase, getUserFromRequest } from '../../../lib/serverAuth';

/**
 * API route: /api/task/submit
 *
 * Accepts POST `{ day: number, response: string }` and records a
 * submission in `task_submissions`. Marks the day as completed and
 * unlocks the next day.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { day, response: taskResponse, attachmentUrl } = req.body;
    if (!day || !taskResponse) {
      return res.status(400).json({ error: 'Missing day or response' });
    }

    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = user.id;
    const supabase = getServiceSupabase();

    // Ensure quiz is passed before accepting task
    // Check quiz_attempts table (correct table from schema!)
    const { data: quizAttempt, error: quizErr } = await supabase
      .from('quiz_attempts')
      .select('score, max_score, passed')
      .eq('user_id', userId)
      .eq('day', day)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    if (quizErr || !quizAttempt) {
      return res.status(403).json({ error: 'Complete the quiz first' });
    }

    // Check if passed (60% threshold)
    const passed = quizAttempt.passed || (quizAttempt.max_score > 0 && quizAttempt.score / quizAttempt.max_score >= 0.6);
    if (!passed) {
      return res.status(403).json({ error: 'Pass the quiz (60%) before submitting the task' });
    }

    // Insert task submission (using correct column names from schema)
    const { error: insertErr } = await supabase
      .from('task_submissions')
      .insert({
        user_id: userId,
        day: day,
        submission_text: taskResponse,
        attachment_url: attachmentUrl || null,
        status: 'submitted',
      });

    if (insertErr) {
      console.error('Error saving task:', insertErr);
      return res.status(500).json({ error: 'Could not save task' });
    }

    // Mark current day as completed (use upsert in case row doesn't exist)
    const now = new Date().toISOString();
    await supabase
      .from('challenge_progress')
      .upsert({
        user_id: userId,
        day: day,
        completed: true,
        completed_at: now,
        task_submitted: true,
        unlocked: true,
      }, { onConflict: 'user_id,day' });

    // Unlock the next day (if exists in course_content)
    const nextDay = Number(day) + 1;
    if (nextDay <= 30) {
      // Check if next day content exists
      const { data: nextContent } = await supabase
        .from('course_content')
        .select('day')
        .eq('day', nextDay)
        .maybeSingle();

      if (nextContent) {
        await supabase
          .from('challenge_progress')
          .upsert({
            user_id: userId,
            day: nextDay,
            unlocked: true,
          }, { onConflict: 'user_id,day' });
      }
    }

    return res.status(200).json({ success: true, nextDay: nextDay <= 30 ? nextDay : null });

  } catch (err) {
    console.error('Task submit error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
