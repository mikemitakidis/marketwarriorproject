/**
 * Task Submission API - SECURE VERSION
 * Route: /api/task/submit
 * 
 * Security Features:
 * - Requires authentication
 * - Validates user has passed quiz first
 * - Handles file upload URLs
 * - Updates progress server-side
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
        console.error('CRITICAL: Missing environment variables');
        return res.status(500).json({ 
            success: false, 
            error: 'Server configuration error' 
        });
    }
    
    try {
        // Require authentication
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
        
        // Get submission data
        const { dayNumber, taskText, fileUrl } = req.body;
        
        if (!dayNumber) {
            return res.status(400).json({ 
                success: false, 
                error: 'Day number required' 
            });
        }
        
        const day = parseInt(dayNumber);
        if (day < 1 || day > 30) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid day number' 
            });
        }
        
        // Check if user has passed the quiz for this day
        const { data: progress, error: progressError } = await supabase
            .from('challenge_progress')
            .select('quiz_passed, task_completed')
            .eq('user_id', user.id)
            .eq('day_number', day)
            .single();
        
        if (!progress?.quiz_passed) {
            return res.status(403).json({ 
                success: false, 
                error: 'You must pass the quiz before submitting the task',
                code: 'QUIZ_NOT_PASSED'
            });
        }
        
        if (progress?.task_completed) {
            return res.status(400).json({ 
                success: false, 
                error: 'Task already submitted for this day',
                code: 'ALREADY_SUBMITTED'
            });
        }
        
        // Save task submission
        const { error: taskError } = await supabase
            .from('task_submissions')
            .upsert({
                user_id: user.id,
                day_number: day,
                task_text: taskText || null,
                file_url: fileUrl || null,
                submitted_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,day_number'
            });
        
        if (taskError) {
            console.error('Task save error:', taskError);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to save task' 
            });
        }
        
        // Update progress to mark task as completed
        const { error: updateError } = await supabase
            .from('challenge_progress')
            .update({
                task_completed: true,
                task_submitted_at: new Date().toISOString(),
                completed: true  // Day is fully completed when quiz passed + task done
            })
            .eq('user_id', user.id)
            .eq('day_number', day);
        
        if (updateError) {
            console.error('Progress update error:', updateError);
        }
        
        // Update user's current day if this was the current day
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('current_day, days_completed')
            .eq('user_id', user.id)
            .single();
        
        if (profile && day >= (profile.current_day || 1)) {
            await supabase
                .from('user_profiles')
                .update({
                    current_day: Math.min(day + 1, 30),
                    days_completed: (profile.days_completed || 0) + 1
                })
                .eq('user_id', user.id);
        }
        
        // Check if this was day 30 (course completed!)
        let courseCompleted = false;
        if (day === 30) {
            courseCompleted = true;
            await supabase
                .from('user_profiles')
                .update({
                    course_completed: true,
                    course_completed_at: new Date().toISOString()
                })
                .eq('user_id', user.id);
        }
        
        return res.status(200).json({
            success: true,
            message: courseCompleted 
                ? 'Congratulations! You have completed the 30-day challenge!'
                : `Day ${day} completed! Day ${day + 1} will unlock tomorrow.`,
            dayCompleted: day,
            nextDay: day < 30 ? day + 1 : null,
            courseCompleted: courseCompleted
        });
        
    } catch (error) {
        console.error('Task submission error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
};
