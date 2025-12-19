import { getServiceSupabase, getUserFromRequest } from '../../../lib/serverAuth';

/**
 * API route: /api/admin/quiz
 *
 * Admin API for managing quiz questions.
 *
 * GET: Get quiz questions for a day
 *   - ?day=1 - Required
 *
 * POST: Add a new quiz question
 *   Body: { day, question, options, correct_option }
 *
 * PUT: Update a quiz question
 *   Body: { id, question?, options?, correct_option? }
 *
 * DELETE: Delete a quiz question
 *   Body: { id }
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

    switch (req.method) {
      case 'GET':
        return handleGet(req, res, supabase);
      case 'POST':
        return handlePost(req, res, supabase);
      case 'PUT':
        return handlePut(req, res, supabase);
      case 'DELETE':
        return handleDelete(req, res, supabase);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (err) {
    console.error('Admin quiz error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

async function handleGet(req, res, supabase) {
  const { day } = req.query;

  if (!day) {
    return res.status(400).json({ error: 'Day parameter required' });
  }

  const { data: questions, error } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('day', parseInt(day))
    .order('id');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ questions: questions || [] });
}

async function handlePost(req, res, supabase) {
  const { day, question, options, correct_option } = req.body;

  if (!day || !question || !options || correct_option === undefined) {
    return res.status(400).json({ error: 'Missing required fields: day, question, options, correct_option' });
  }

  if (!Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'Options must be an array with at least 2 choices' });
  }

  const { data, error } = await supabase
    .from('quiz_questions')
    .insert({
      day: parseInt(day),
      question,
      options,
      correct_option: parseInt(correct_option),
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ success: true, question: data });
}

async function handlePut(req, res, supabase) {
  const { id, question, options, correct_option } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Question ID required' });
  }

  const updates = {};
  if (question !== undefined) updates.question = question;
  if (options !== undefined) updates.options = options;
  if (correct_option !== undefined) updates.correct_option = parseInt(correct_option);

  const { data, error } = await supabase
    .from('quiz_questions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, question: data });
}

async function handleDelete(req, res, supabase) {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Question ID required' });
  }

  const { error } = await supabase
    .from('quiz_questions')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, deleted: id });
}
