// Quiz Submission API
// Route: /api/quiz/submit

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { userId, dayNumber, answers, score, passed } = req.body;
        
        if (!userId || !dayNumber) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const supabase = createClient(
            process.env.SUPABASE_URL || 'https://gvpaendpmwyncdztlczy.supabase.co',
            process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
        );
        
        // Save quiz result
        const { error: quizError } = await supabase
            .from('quiz_results')
            .upsert({
                user_id: userId,
                day_number: dayNumber,
                score: score,
                passed: passed,
                answers: answers,
                completed_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,day_number'
            });
        
        if (quizError) {
            console.error('Quiz save error:', quizError);
            return res.status(500).json({ error: 'Failed to save quiz result' });
        }
        
        // Update progress
        const { error: progressError } = await supabase
            .from('progress')
            .upsert({
                user_id: userId,
                day_number: dayNumber,
                quiz_passed: passed,
                quiz_score: score,
                unlocked: true
            }, {
                onConflict: 'user_id,day_number'
            });
        
        if (progressError) {
            console.error('Progress update error:', progressError);
        }
        
        return res.status(200).json({
            success: true,
            score: score,
            passed: passed,
            message: passed ? 'Quiz passed! You can now submit your task.' : 'Quiz not passed. You need 60% to continue.'
        });
        
    } catch (error) {
        console.error('Quiz submission error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};
