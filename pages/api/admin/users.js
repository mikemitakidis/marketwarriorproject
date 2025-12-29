import { getServiceSupabase, getUserFromRequest } from '../../../lib/serverAuth';

/**
 * API route: /api/admin/users
 *
 * Admin API for managing users.
 *
 * GET: List users with stats
 *   - ?userId=xxx - Get specific user details
 *   - ?search=email - Search by email
 *   - No params - List all users
 *
 * POST: Admin actions
 *   - action: 'unlock_all' - Unlock all 30 days for a user
 *   - action: 'reset_user' - Reset user progress (delete all progress data)
 */
export default async function handler(req, res) {
  try {
    const adminUser = await getUserFromRequest(req);
    if (!adminUser) {
      console.log('[ADMIN] No user found in request');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log('[ADMIN] User from request:', adminUser.id, adminUser.email);

    const supabase = getServiceSupabase();

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_admin, email')
      .eq('id', adminUser.id)
      .single();

    console.log('[ADMIN] Profile lookup:', JSON.stringify(profile), 'Error:', profileError?.message);

    // Only check is_admin flag
    if (!profile?.is_admin) {
      console.log('[ADMIN] Access denied - is_admin:', profile?.is_admin);
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('[ADMIN] Access granted for:', adminUser.email);

    if (req.method === 'GET') {
      return handleGet(req, res, supabase);
    } else if (req.method === 'POST') {
      return handlePost(req, res, supabase);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (err) {
    console.error('Admin users error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

async function handleGet(req, res, supabase) {
  const { userId, search } = req.query;

  if (userId) {
    // Get specific user details
    return getUserDetails(res, supabase, userId);
  }

  // List all users
  let query = supabase
    .from('user_profiles')
    .select('id, email, full_name, has_paid, paid_at, is_admin, created_at')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.ilike('email', `%${search}%`);
  }

  const { data: users, error } = await query.limit(100);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Get progress stats for each user
  const userIds = users.map(u => u.id);

  const { data: progressData } = await supabase
    .from('challenge_progress')
    .select('user_id, completed')
    .in('user_id', userIds);

  const { data: quizData } = await supabase
    .from('quiz_attempts')
    .select('user_id, passed')
    .in('user_id', userIds);

  // Build stats map
  const progressMap = {};
  (progressData || []).forEach(p => {
    if (!progressMap[p.user_id]) {
      progressMap[p.user_id] = { completed: 0 };
    }
    if (p.completed) progressMap[p.user_id].completed++;
  });

  const quizMap = {};
  (quizData || []).forEach(q => {
    if (!quizMap[q.user_id]) {
      quizMap[q.user_id] = { passed: 0, total: 0 };
    }
    quizMap[q.user_id].total++;
    if (q.passed) quizMap[q.user_id].passed++;
  });

  const usersWithStats = users.map(u => ({
    ...u,
    days_completed: progressMap[u.id]?.completed || 0,
    quizzes_passed: quizMap[u.id]?.passed || 0,
    quizzes_taken: quizMap[u.id]?.total || 0,
  }));

  return res.status(200).json({ users: usersWithStats });
}

async function handlePost(req, res, supabase) {
  const { action, userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  if (action === 'unlock_all') {
    // Unlock all 30 days for the user
    // Set welcome_completed_at to 30 days ago so all days are unlocked
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error: onboardingError } = await supabase
      .from('user_onboarding')
      .update({
        welcome_completed: true,
        welcome_completed_at: thirtyDaysAgo.toISOString(),
      })
      .eq('user_id', userId);

    if (onboardingError) {
      console.error('Unlock all - onboarding error:', onboardingError);
      return res.status(500).json({ error: 'Failed to update onboarding: ' + onboardingError.message });
    }

    console.log(`[ADMIN] Unlocked all days for user ${userId}`);
    return res.status(200).json({ success: true, message: 'All 30 days unlocked for user' });

  } else if (action === 'reset_user') {
    // Reset user - delete all progress data
    const errors = [];

    // Delete from challenge_progress
    const { error: progressError } = await supabase
      .from('challenge_progress')
      .delete()
      .eq('user_id', userId);
    if (progressError) errors.push('challenge_progress: ' + progressError.message);

    // Delete from quiz_attempts
    const { error: quizError } = await supabase
      .from('quiz_attempts')
      .delete()
      .eq('user_id', userId);
    if (quizError) errors.push('quiz_attempts: ' + quizError.message);

    // Delete from task_submissions
    const { error: taskError } = await supabase
      .from('task_submissions')
      .delete()
      .eq('user_id', userId);
    if (taskError) errors.push('task_submissions: ' + taskError.message);

    // Reset welcome_completed_at to restart the challenge timer
    // This determines when Day 1 unlocked and subsequent days unlock
    const { error: onboardingError } = await supabase
      .from('user_onboarding')
      .update({
        welcome_completed_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    if (onboardingError) errors.push('user_onboarding: ' + onboardingError.message);

    if (errors.length > 0) {
      console.error('Reset user errors:', errors);
      return res.status(500).json({ error: 'Partial reset: ' + errors.join(', ') });
    }

    console.log(`[ADMIN] Reset all progress for user ${userId}`);
    return res.status(200).json({ success: true, message: 'User progress reset successfully' });

  } else {
    return res.status(400).json({ error: 'Unknown action. Use: unlock_all, reset_user' });
  }
}

async function getUserDetails(res, supabase, userId) {
  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Get onboarding data
  const { data: onboarding } = await supabase
    .from('user_onboarding')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Get challenge progress
  const { data: progress } = await supabase
    .from('challenge_progress')
    .select('*')
    .eq('user_id', userId)
    .order('day');

  // Get quiz attempts
  const { data: quizAttempts } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });

  // Get task submissions
  const { data: taskSubmissions } = await supabase
    .from('task_submissions')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });

  return res.status(200).json({
    profile,
    onboarding,
    progress: progress || [],
    quizAttempts: quizAttempts || [],
    taskSubmissions: taskSubmissions || [],
  });
}
