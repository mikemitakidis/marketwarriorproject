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
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  } catch (err) {
    console.error('Admin users error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
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
