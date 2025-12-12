/**
 * Quiz Submission API - SECURE VERSION
 * Route: /api/quiz/submit
 * 
 * Security Features:
 * - Requires authentication
 * - Loads correct answers from DATABASE (never from client)
 * - Calculates score SERVER-SIDE
 * - Determines pass/fail SERVER-SIDE
 * - 60% minimum to pass
 */

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    // CRITICAL: Require environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
        console.error('CRITICAL: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
        return res.status(500).json({ 
            success: false, 
            error: 'Server configuration error' 
        });
    }
    
    try {
        // SECURITY: Require authentication
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required' 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );
        
        // Verify user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid session' 
            });
        }
        
        // Get submission data - ONLY answers, NOT score/passed
        const { dayNumber, answers } = req.body;
        
        if (!dayNumber || !answers || !Array.isArray(answers)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid submission. Required: dayNumber, answers[]' 
            });
        }
        
        // Validate day number
        const day = parseInt(dayNumber);
        if (day < 1 || day > 30) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid day number' 
            });
        }
        
        // Check user entitlements
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('has_paid, agreed_to_terms')
            .eq('user_id', user.id)
            .single();
        
        if (!profile?.has_paid) {
            return res.status(403).json({ 
                success: false, 
                error: 'Purchase required' 
            });
        }
        
        // CRITICAL: Load correct answers from DATABASE
        const { data: questions, error: questionsError } = await supabase
            .from('quiz_questions')
            .select('id, correct_answer')
            .eq('day_number', day)
            .order('question_order', { ascending: true });
        
        if (questionsError || !questions || questions.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Quiz not found for this day' 
            });
        }
        
        // CRITICAL: Calculate score SERVER-SIDE
        let correctCount = 0;
        const totalQuestions = questions.length;
        const gradedAnswers = [];
        
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            const userAnswer = answers[i];
            const isCorrect = userAnswer === question.correct_answer;
            
            if (isCorrect) {
                correctCount++;
            }
            
            gradedAnswers.push({
                questionId: question.id,
                userAnswer: userAnswer,
                correct: isCorrect
            });
        }
        
        // Calculate percentage and determine pass/fail
        const score = Math.round((correctCount / totalQuestions) * 100);
        const passed = score >= 60;  // 60% minimum to pass
        
        // Save quiz result
        const { error: saveError } = await supabase
            .from('quiz_results')
            .upsert({
                user_id: user.id,
                day_number: day,
                score: score,
                passed: passed,
                correct_count: correctCount,
                total_questions: totalQuestions,
                answers: gradedAnswers,
                completed_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,day_number'
            });
        
        if (saveError) {
            console.error('Quiz save error:', saveError);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to save quiz result' 
            });
        }
        
        // Update challenge progress
        const { error: progressError } = await supabase
            .from('challenge_progress')
            .upsert({
                user_id: user.id,
                day_number: day,
                quiz_passed: passed,
                quiz_score: score,
                quiz_completed_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,day_number'
            });
        
        if (progressError) {
            console.error('Progress update error:', progressError);
        }
        
        // If passed, unlock next day
        if (passed && day < 30) {
            await supabase
                .from('challenge_progress')
                .upsert({
                    user_id: user.id,
                    day_number: day + 1,
                    unlocked: true,
                    unlocked_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,day_number'
                });
        }
        
        // Load explanations for feedback (only after submission)
        const { data: explanations } = await supabase
            .from('quiz_questions')
            .select('id, explanation, correct_answer')
            .eq('day_number', day)
            .order('question_order', { ascending: true });
        
        // Return result with explanations
        return res.status(200).json({
            success: true,
            score: score,
            passed: passed,
            correctCount: correctCount,
            totalQuestions: totalQuestions,
            message: passed 
                ? `Great job! You scored ${score}%. You can now submit your task.`
                : `You scored ${score}%. You need 60% to pass. Review the material and try again.`,
            // Return correct answers and explanations ONLY after submission
            feedback: explanations?.map((q, i) => ({
                questionId: q.id,
                userAnswer: answers[i],
                correctAnswer: q.correct_answer,
                wasCorrect: answers[i] === q.correct_answer,
                explanation: q.explanation
            }))
        });
        
    } catch (error) {
        console.error('Quiz submission error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
};
