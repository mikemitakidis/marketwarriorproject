/**
 * Day Content API - SECURE VERSION
 * Route: /api/day/[day]
 * 
 * Security Features:
 * - Requires authentication (Bearer token)
 * - Verifies user has paid
 * - Verifies user has accepted terms
 * - Verifies day is unlocked (server-side time check)
 * - Quiz answers are NEVER sent to browser
 */

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    // CRITICAL: Require environment variables - fail fast if missing
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
        console.error('CRITICAL: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
        return res.status(500).json({ 
            success: false, 
            error: 'Server configuration error' 
        });
    }
    
    try {
        // Get day number from URL
        const dayNumber = parseInt(req.query.day || req.url.split('/').pop()) || 0;
        
        // Validate day number
        if (dayNumber < 1 || dayNumber > 30) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid day number. Must be between 1 and 30.' 
            });
        }
        
        // SECURITY: Always require authentication
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required. Please log in.' 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        
        // Create Supabase client with SERVICE key (never anon for server operations)
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );
        
        // Verify the user's token
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid or expired session. Please log in again.' 
            });
        }
        
        // Get user profile to check entitlements
        const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
        
        if (profileError || !userProfile) {
            return res.status(403).json({ 
                success: false, 
                error: 'User profile not found. Please complete registration.' 
            });
        }
        
        // SECURITY CHECK 1: Has user paid?
        if (!userProfile.has_paid) {
            return res.status(403).json({ 
                success: false, 
                error: 'Access denied. Please purchase the course.',
                code: 'PAYMENT_REQUIRED'
            });
        }
        
        // SECURITY CHECK 2: Has access expired?
        if (userProfile.access_expires_at) {
            const expiryDate = new Date(userProfile.access_expires_at);
            if (expiryDate < new Date()) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Your access has expired. Please renew.',
                    code: 'ACCESS_EXPIRED'
                });
            }
        }
        
        // SECURITY CHECK 3: Has user accepted terms?
        if (!userProfile.agreed_to_terms) {
            return res.status(403).json({ 
                success: false, 
                error: 'Please accept terms and conditions first.',
                code: 'TERMS_NOT_ACCEPTED'
            });
        }
        
        // SECURITY CHECK 4: Is this day unlocked? (server-side time calculation)
        if (dayNumber > 1) {
            const challengeStart = userProfile.challenge_start_date 
                ? new Date(userProfile.challenge_start_date) 
                : null;
            
            if (!challengeStart) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Challenge not started. Please complete Day 1 first.',
                    code: 'NOT_STARTED'
                });
            }
            
            // Calculate days elapsed using SERVER time (Postgres NOW())
            const { data: timeData, error: timeError } = await supabase
                .rpc('get_server_time');
            
            const serverNow = timeError ? new Date() : new Date(timeData);
            const msElapsed = serverNow.getTime() - challengeStart.getTime();
            const daysElapsed = Math.floor(msElapsed / (24 * 60 * 60 * 1000));
            const maxUnlockedDay = daysElapsed + 1;
            
            if (dayNumber > maxUnlockedDay) {
                const unlockDate = new Date(challengeStart);
                unlockDate.setDate(unlockDate.getDate() + (dayNumber - 1));
                
                return res.status(403).json({ 
                    success: false, 
                    error: `Day ${dayNumber} unlocks on ${unlockDate.toLocaleDateString()}`,
                    code: 'DAY_LOCKED',
                    unlockAt: unlockDate.toISOString()
                });
            }
            
            // Check previous day completion
            const { data: prevProgress } = await supabase
                .from('challenge_progress')
                .select('quiz_passed, task_completed')
                .eq('user_id', user.id)
                .eq('day_number', dayNumber - 1)
                .single();
            
            if (!prevProgress || !prevProgress.quiz_passed) {
                return res.status(403).json({ 
                    success: false, 
                    error: `Complete Day ${dayNumber - 1} quiz first to access Day ${dayNumber}.`,
                    code: 'PREVIOUS_DAY_INCOMPLETE'
                });
            }
        }
        
        // Load content from database
        const { data: content, error: contentError } = await supabase
            .from('course_content')
            .select('day_number, title, subtitle, content_html, youtube_video_id, task_description, task_steps, next_preview')
            .eq('day_number', dayNumber)
            .single();
        
        if (contentError || !content) {
            return res.status(404).json({ 
                success: false, 
                error: 'Content not found for this day' 
            });
        }
        
        // Load quiz questions WITHOUT correct answers
        const { data: quizQuestions, error: quizError } = await supabase
            .from('quiz_questions')
            .select('id, question, options, explanation')  // NOTE: No 'correct_answer' field!
            .eq('day_number', dayNumber)
            .order('question_order', { ascending: true });
        
        // Get user's progress for this day
        const { data: progress } = await supabase
            .from('challenge_progress')
            .select('quiz_passed, quiz_score, task_completed, task_submitted_at')
            .eq('user_id', user.id)
            .eq('day_number', dayNumber)
            .single();
        
        // Return content (NO quiz answers!)
        return res.status(200).json({
            success: true,
            day: dayNumber,
            content: {
                title: content.title,
                subtitle: content.subtitle,
                html: content.content_html,
                youtubeId: content.youtube_video_id,
                task: {
                    description: content.task_description,
                    steps: content.task_steps
                },
                nextPreview: content.next_preview
            },
            quiz: quizQuestions || [],  // Questions only, no answers!
            progress: {
                quizPassed: progress?.quiz_passed || false,
                quizScore: progress?.quiz_score || null,
                taskCompleted: progress?.task_completed || false
            }
        });
        
    } catch (error) {
        console.error('Day API Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
};
