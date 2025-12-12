/**
 * Progress Status API - SECURE VERSION
 * Route: /api/progress/status
 * 
 * Security Features:
 * - Uses SERVER time for unlock calculations (not client clock)
 * - Returns complete progress state from database
 * - Includes next unlock times
 */

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
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
        
        // Get user profile
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
        
        if (profileError || !profile) {
            return res.status(404).json({ 
                success: false, 
                error: 'Profile not found',
                code: 'PROFILE_NOT_FOUND'
            });
        }
        
        // Check entitlements
        if (!profile.has_paid) {
            return res.status(200).json({
                success: true,
                status: 'unpaid',
                message: 'Please purchase the course to access content'
            });
        }
        
        if (!profile.agreed_to_terms) {
            return res.status(200).json({
                success: true,
                status: 'terms_pending',
                message: 'Please accept terms to continue'
            });
        }
        
        // Get SERVER time (not client time!)
        const { data: timeData } = await supabase.rpc('get_server_time');
        const serverNow = timeData ? new Date(timeData) : new Date();
        
        // Calculate days since challenge start
        const challengeStart = profile.challenge_start_date 
            ? new Date(profile.challenge_start_date) 
            : null;
        
        let daysElapsed = 0;
        let maxTimeUnlockedDay = 1;
        
        if (challengeStart) {
            const msElapsed = serverNow.getTime() - challengeStart.getTime();
            daysElapsed = Math.floor(msElapsed / (24 * 60 * 60 * 1000));
            maxTimeUnlockedDay = Math.min(daysElapsed + 1, 30);
        }
        
        // Get all progress records
        const { data: progressRecords } = await supabase
            .from('challenge_progress')
            .select('day_number, quiz_passed, quiz_score, task_completed')
            .eq('user_id', user.id)
            .order('day_number', { ascending: true });
        
        // Build progress map
        const progressMap = {};
        (progressRecords || []).forEach(p => {
            progressMap[p.day_number] = p;
        });
        
        // Calculate each day's status
        const days = [];
        let currentDay = 1;
        let completedDays = 0;
        let totalScore = 0;
        let scoreCount = 0;
        
        for (let d = 1; d <= 30; d++) {
            const progress = progressMap[d] || {};
            const prevProgress = progressMap[d - 1] || {};
            
            let status = 'locked';
            let unlockAt = null;
            
            if (d === 1) {
                // Day 1 is always unlocked for paid users
                status = progress.quiz_passed && progress.task_completed ? 'completed' : 'unlocked';
            } else {
                // Check if previous day is completed
                const prevCompleted = prevProgress.quiz_passed;
                
                // Check if time allows this day
                const timeAllows = d <= maxTimeUnlockedDay;
                
                if (prevCompleted && timeAllows) {
                    status = progress.quiz_passed && progress.task_completed ? 'completed' : 'unlocked';
                } else if (prevCompleted && !timeAllows) {
                    // Previous day done, waiting for time
                    status = 'locked';
                    const unlockDate = new Date(challengeStart);
                    unlockDate.setDate(unlockDate.getDate() + (d - 1));
                    unlockAt = unlockDate.toISOString();
                } else {
                    // Previous day not completed
                    status = 'locked';
                }
            }
            
            // Track stats
            if (status === 'completed') {
                completedDays++;
            }
            if (status === 'unlocked' && currentDay === d - 1 + 1) {
                currentDay = d;
            }
            if (progress.quiz_score != null) {
                totalScore += progress.quiz_score;
                scoreCount++;
            }
            
            days.push({
                day: d,
                status: status,
                quizPassed: progress.quiz_passed || false,
                quizScore: progress.quiz_score || null,
                taskCompleted: progress.task_completed || false,
                unlockAt: unlockAt
            });
        }
        
        // Find actual current day (highest unlocked but not completed)
        for (let d = 30; d >= 1; d--) {
            if (days[d-1].status === 'unlocked') {
                currentDay = d;
                break;
            }
            if (days[d-1].status === 'completed') {
                currentDay = Math.min(d + 1, 30);
            }
        }
        
        // Calculate average score
        const avgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
        
        return res.status(200).json({
            success: true,
            status: 'active',
            serverTime: serverNow.toISOString(),
            user: {
                name: profile.full_name,
                email: user.email,
                affiliateCode: profile.affiliate_code,
                challengeStartDate: profile.challenge_start_date,
                accessExpiresAt: profile.access_expires_at
            },
            stats: {
                currentDay: currentDay,
                completedDays: completedDays,
                avgQuizScore: avgScore,
                progressPercent: Math.round((completedDays / 30) * 100)
            },
            days: days
        });
        
    } catch (error) {
        console.error('Progress API error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
};
