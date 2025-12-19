import { getServiceSupabase, getUserFromRequest } from '../../../lib/serverAuth';

/**
 * API route: /api/admin/content
 *
 * Admin API for managing course content.
 *
 * GET: List all days or get specific day
 *   - ?day=1 - Get specific day
 *   - No params - Get all days
 *
 * PUT: Update day content
 *   Body: { day, title?, html_content?, video_url?, task_prompt? }
 */
export default async function handler(req, res) {
  try {
    const adminUser = await getUserFromRequest(req);
    if (!adminUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const supabase = getServiceSupabase();

    // Check if current user is admin
    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', adminUser.id)
      .single();

    if (!adminProfile?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (req.method === 'GET') {
      return handleGet(req, res, supabase);
    } else if (req.method === 'PUT') {
      return handlePut(req, res, supabase);
    } else if (req.method === 'POST') {
      return handlePost(req, res, supabase);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (err) {
    console.error('Admin content error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

async function handleGet(req, res, supabase) {
  const { day } = req.query;

  if (day) {
    // Get specific day with quiz questions
    const { data: content, error } = await supabase
      .from('course_content')
      .select('*')
      .eq('day', parseInt(day))
      .single();

    // Return empty object if day doesn't exist yet (editor can create it)
    const dayData = content || { day: parseInt(day), title: '', html_content: '', video_url: '', task_prompt: '' };

    const { data: quizQuestions } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('day', parseInt(day))
      .order('id');

    return res.status(200).json({
      day: dayData,
      quizQuestions: quizQuestions || [],
    });
  }

  // Get all days
  const { data: allContent, error } = await supabase
    .from('course_content')
    .select('day, title, video_url, created_at, updated_at')
    .order('day');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Get quiz question counts per day
  const { data: quizCounts } = await supabase
    .from('quiz_questions')
    .select('day');

  const quizCountMap = {};
  (quizCounts || []).forEach(q => {
    quizCountMap[q.day] = (quizCountMap[q.day] || 0) + 1;
  });

  const contentWithCounts = (allContent || []).map(c => ({
    ...c,
    quiz_count: quizCountMap[c.day] || 0,
  }));

  return res.status(200).json({ days: contentWithCounts });
}

async function handlePut(req, res, supabase) {
  const { day, title, html_content, video_url, task_prompt } = req.body;

  if (!day) {
    return res.status(400).json({ error: 'Day number required' });
  }

  // Use upsert to create or update
  const contentData = {
    day: parseInt(day),
    title: title || `Day ${day} Lesson`,
    html_content: html_content || '',
    video_url: video_url || null,
    task_prompt: task_prompt || 'Complete the daily task.',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('course_content')
    .upsert(contentData, { onConflict: 'day' })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, content: data });
}

async function handlePost(req, res, supabase) {
  const { day, title, html_content, video_url, task_prompt } = req.body;

  if (!day || !title) {
    return res.status(400).json({ error: 'Day number and title required' });
  }

  const { data, error } = await supabase
    .from('course_content')
    .upsert({
      day: parseInt(day),
      title,
      html_content: html_content || '<p>Content coming soon.</p>',
      video_url: video_url || null,
      task_prompt: task_prompt || 'Complete the daily task.',
    }, { onConflict: 'day' })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, content: data });
}
