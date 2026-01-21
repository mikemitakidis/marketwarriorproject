import { getServiceSupabase, getUserFromRequest, verifyAdminAccess } from '../../../lib/serverAuth';

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
    // SECURITY: Verify admin authorization (checks is_admin + email allowlist)
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const isAdmin = await verifyAdminAccess(user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const supabase = getServiceSupabase();

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
    .order('order_index');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Convert to format expected by frontend (question_text -> question, options object -> array)
  const formattedQuestions = (questions || []).map(q => {
    const optionsArray = [];
    if (q.options && typeof q.options === 'object') {
      ['A', 'B', 'C', 'D'].forEach(letter => {
        if (q.options[letter]) optionsArray.push(q.options[letter]);
      });
    }
    return {
      id: q.id,
      day: q.day,
      question: q.question_text,
      options: optionsArray,
      correct_option: ['A', 'B', 'C', 'D'].indexOf(q.correct_option),
      order_index: q.order_index,
    };
  });

  return res.status(200).json({ questions: formattedQuestions });
}

async function handlePost(req, res, supabase) {
  const { day, question, options, correct_option } = req.body;

  if (!day || !question || !options || correct_option === undefined) {
    return res.status(400).json({ error: 'Missing required fields: day, question, options, correct_option' });
  }

  if (!Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'Options must be an array with at least 2 choices' });
  }

  // Convert options array to object format {"A":"..","B":".."}
  const letters = ['A', 'B', 'C', 'D'];
  const optionsObj = {};
  options.forEach((opt, i) => {
    optionsObj[letters[i]] = opt;
  });

  // Get max order_index for this day
  const { data: existing } = await supabase
    .from('quiz_questions')
    .select('order_index')
    .eq('day', parseInt(day))
    .order('order_index', { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.order_index || 0) + 1;

  const { data, error } = await supabase
    .from('quiz_questions')
    .insert({
      day: parseInt(day),
      question_text: question,
      options: optionsObj,
      correct_option: letters[parseInt(correct_option)] || 'A',
      order_index: nextOrder,
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

  const letters = ['A', 'B', 'C', 'D'];
  const updates = {};

  if (question !== undefined) updates.question_text = question;

  if (options !== undefined) {
    // Convert options array to object format
    const optionsObj = {};
    options.forEach((opt, i) => {
      optionsObj[letters[i]] = opt;
    });
    updates.options = optionsObj;
  }

  if (correct_option !== undefined) {
    updates.correct_option = letters[parseInt(correct_option)] || 'A';
  }

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
