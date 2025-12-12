/**
 * Certificate Generation API
 * 
 * Generates a PDF certificate for users who complete all 30 days
 */

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Get authorization token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    
    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (userError || !userData) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    
    // Check if user completed all 30 days
    const { data: completedDays } = await supabase
      .from('challenge_progress')
      .select('day_number')
      .eq('user_id', user.id)
      .or('quiz_passed.eq.true,task_submitted.eq.true');
    
    const completedCount = completedDays?.length || 0;
    
    if (completedCount < 30) {
      return res.status(403).json({ 
        success: false, 
        error: `Complete all 30 days first. You've completed ${completedCount}/30 days.` 
      });
    }
    
    // Generate certificate data
    const certificateId = `MW-${Date.now().toString(36).toUpperCase()}-${user.id.slice(0, 6).toUpperCase()}`;
    const completionDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Return certificate data for client-side PDF generation
    // (Using html2canvas + jsPDF on client side for better rendering)
    return res.status(200).json({
      success: true,
      certificate: {
        id: certificateId,
        name: userData.full_name || 'Market Warrior Graduate',
        completion_date: completionDate,
        course_name: '30-Day Trading Challenge',
        issuer: 'Market Warrior Academy',
        skills: [
          'Technical Analysis',
          'Risk Management',
          'Trading Psychology',
          'Fundamental Analysis',
          'Portfolio Management'
        ]
      }
    });
    
  } catch (error) {
    console.error('Certificate generation error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
