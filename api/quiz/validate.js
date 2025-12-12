/**
 * Quiz Validation API - SERVER-SIDE ONLY
 * 
 * CRITICAL SECURITY: This endpoint validates quiz answers WITHOUT
 * ever sending correct answers to the client. The client only
 * receives: score, passed (true/false), and after submission
 * can optionally receive which answers were correct for review.
 */

const { createClient } = require('@supabase/supabase-js');

// Correct answers - NEVER sent to client until after submission
const QUIZ_ANSWERS = {
  "1": ["b", "c", "b", "b", "c"],
  "2": ["b", "c", "b", "c", "c"],
  "3": ["a", "b", "c", "c", "b"],
  "4": ["b", "c", "b", "b", "b"],
  "5": ["a", "c", "b", "b", "c"],
  "6": ["b", "c", "c", "c", "b"],
  "7": ["a", "a", "c", "b", "b"],
  "8": ["a", "b", "b", "b", "b"],
  "9": ["a", "b", "a", "b", "b"],
  "10": ["a", "b", "a", "b", "c"],
  "11": ["a", "b", "a", "a", "b"],
  "12": ["a", "a", "a", "a", "a"],
  "13": ["a", "a", "a", "a", "a"],
  "14": ["c", "b", "b", "c", "b"],
  "15": ["a", "c", "b", "c", "b"],
  "16": ["a", "a", "b", "b", "a"],
  "17": ["a", "a", "a", "a", "b"],
  "18": ["a", "a", "a", "a", "a"],
  "19": ["a", "a", "a", "a", "a"],
  "20": ["a", "b", "c", "b", "b"],
  "21": ["a", "b", "c", "b", "a"],
  "22": ["a", "c", "b", "c", "a"],
  "23": ["c", "b", "c", "a", "c"],
  "24": ["b"],
  "25": ["c", "b", "b", "b", "c"],
  "26": ["a", "b", "c", "b", "c"],
  "27": ["c", "b", "b", "b", "c"],
  "28": ["c", "a", "b", "b", "b"],
  "29": ["b", "c", "a", "c", "c"],
  "30": ["b", "c", "b", "b", "a", "c", "b", "b", "b", "d"]
};

const PASS_PERCENTAGE = 60;

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const { day_number, user_answers, user_id, include_review } = req.body;
    
    // Validate input
    if (!day_number || !user_answers || !user_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: day_number, user_answers, user_id' 
      });
    }
    
    // Get correct answers for this day
    const correctAnswers = QUIZ_ANSWERS[String(day_number)];
    if (!correctAnswers) {
      return res.status(400).json({ 
        success: false, 
        error: `No quiz found for day ${day_number}` 
      });
    }
    
    // Validate user has exactly the right number of answers
    if (user_answers.length !== correctAnswers.length) {
      return res.status(400).json({ 
        success: false, 
        error: `Expected ${correctAnswers.length} answers, got ${user_answers.length}` 
      });
    }
    
    // Calculate score
    let correct = 0;
    const results = [];
    
    for (let i = 0; i < correctAnswers.length; i++) {
      const isCorrect = user_answers[i]?.toLowerCase() === correctAnswers[i];
      if (isCorrect) correct++;
      results.push({
        question: i + 1,
        user_answer: user_answers[i],
        is_correct: isCorrect
      });
    }
    
    const score = correct;
    const total = correctAnswers.length;
    const percentage = Math.round((correct / total) * 100);
    const passed = percentage >= PASS_PERCENTAGE;
    
    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Get current attempt count
    const { data: existingProgress } = await supabase
      .from('challenge_progress')
      .select('quiz_attempts, quiz_score')
      .eq('user_id', user_id)
      .eq('day_number', day_number)
      .single();
    
    const attempts = (existingProgress?.quiz_attempts || 0) + 1;
    const bestScore = Math.max(existingProgress?.quiz_score || 0, score);
    
    // Update progress in database
    const { error: updateError } = await supabase
      .from('challenge_progress')
      .upsert({
        user_id: user_id,
        day_number: parseInt(day_number),
        quiz_completed: passed,
        quiz_passed: passed,
        quiz_score: bestScore,
        quiz_attempts: attempts,
        last_quiz_attempt: new Date().toISOString()
      }, {
        onConflict: 'user_id,day_number'
      });
    
    if (updateError) {
      console.error('Failed to update progress:', updateError);
    }
    
    // Log activity
    await supabase.from('activity_log').insert({
      user_id: user_id,
      action: 'quiz_attempt',
      details: JSON.stringify({
        day: day_number,
        score: score,
        total: total,
        percentage: percentage,
        passed: passed,
        attempt: attempts
      })
    });
    
    // Prepare response
    const response = {
      success: true,
      score: score,
      total: total,
      percentage: percentage,
      passed: passed,
      attempts: attempts,
      pass_required: PASS_PERCENTAGE,
      message: passed 
        ? `🎉 Congratulations! You passed with ${percentage}%!` 
        : `📚 You scored ${percentage}%. You need ${PASS_PERCENTAGE}% to pass. Please review and try again.`
    };
    
    // Only include review data AFTER submission (not before)
    if (include_review && passed) {
      response.review = results.map((r, i) => ({
        question: r.question,
        your_answer: r.user_answer,
        correct_answer: correctAnswers[i],
        is_correct: r.is_correct
      }));
    }
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Quiz validation error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};
