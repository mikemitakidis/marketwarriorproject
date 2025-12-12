// Day Content API - Server-side security check
// Route: /api/day/[dayNumber]

const { createClient } = require('@supabase/supabase-js');

// Day content database (in production, this would come from database/CMS)
const dayContent = {
    1: {
        title: "Introduction to Trading & Financial Markets",
        subtitle: "Understanding the world of trading and different market types",
        youtube_id: null, // Add YouTube video ID here
        next_preview: "Tomorrow you'll set up your demo trading account and explore trading platforms!",
        task: {
            description: "Research and identify which type of market interests you most and why.",
            steps: [
                "Review the four main market types: Stocks, Forex, Commodities, and Crypto",
                "Research the pros and cons of each market type",
                "Write a short paragraph (3-5 sentences) explaining which market interests you most",
                "Take a screenshot of a chart from your chosen market on TradingView.com",
                "Upload your screenshot showing the market you've chosen to focus on"
            ]
        },
        quiz: [
            {
                question: "What is the primary purpose of a stock market?",
                options: [
                    "To allow companies to raise capital by selling shares",
                    "To trade currencies between countries",
                    "To buy and sell physical goods",
                    "To store money safely"
                ],
                correct: 0,
                explanation: "Stock markets allow companies to raise capital by selling ownership shares to investors."
            },
            {
                question: "Which market operates 24 hours a day, 5 days a week?",
                options: [
                    "Stock Market",
                    "Forex Market",
                    "Commodity Market",
                    "Bond Market"
                ],
                correct: 1,
                explanation: "The Forex (foreign exchange) market operates 24/5 due to global time zones."
            },
            {
                question: "What does 'going long' mean in trading?",
                options: [
                    "Holding a position for a long time",
                    "Buying an asset expecting its price to rise",
                    "Selling an asset expecting its price to fall",
                    "Taking a break from trading"
                ],
                correct: 1,
                explanation: "Going long means buying an asset with the expectation that its price will increase."
            },
            {
                question: "What is a bear market?",
                options: [
                    "A market with high volatility",
                    "A market dominated by sellers with falling prices",
                    "A market dominated by buyers with rising prices",
                    "A market for trading animal products"
                ],
                correct: 1,
                explanation: "A bear market is characterized by falling prices and pessimistic sentiment."
            },
            {
                question: "Why is it important to practice with a demo account first?",
                options: [
                    "To make real money faster",
                    "To learn trading without risking real money",
                    "Because demo accounts are required by law",
                    "Demo accounts offer better returns"
                ],
                correct: 1,
                explanation: "Demo accounts let you practice strategies and learn the platform without risking real money."
            }
        ]
    },
    2: {
        title: "Setting Up Your Demo Trading Account",
        subtitle: "Getting hands-on with trading platforms using virtual money",
        youtube_id: null,
        next_preview: "Day 3 covers essential trading terminology and order types!",
        task: {
            description: "Set up a demo account on eToro or another trading platform.",
            steps: [
                "Visit eToro.com (recommended) or another broker like Trading212",
                "Create a free account using your email",
                "Switch to the DEMO/VIRTUAL portfolio (not real money!)",
                "Explore the platform interface and find the search function",
                "Take a screenshot showing your demo account balance and username",
                "Upload the screenshot as evidence of your completed demo setup"
            ]
        },
        quiz: [
            {
                question: "What is the main benefit of using a demo account?",
                options: [
                    "You can make real profits",
                    "You can practice without risking real money",
                    "Demo accounts have lower fees",
                    "You can access insider information"
                ],
                correct: 1,
                explanation: "Demo accounts use virtual money so you can learn without financial risk."
            },
            {
                question: "How long should you practice on a demo account before trading real money?",
                options: [
                    "1-2 weeks",
                    "1 month",
                    "At least 6 months of consistent profitability",
                    "You can start real trading immediately"
                ],
                correct: 2,
                explanation: "We recommend at least 6 months of consistent demo profitability before considering real money."
            },
            {
                question: "What should you look for when choosing a trading platform?",
                options: [
                    "Only the lowest fees",
                    "User interface, security, fees, and available markets",
                    "The platform with the most users",
                    "Only the most advanced features"
                ],
                correct: 1,
                explanation: "Consider multiple factors: ease of use, security, fees, available markets, and features."
            },
            {
                question: "What is eToro known for?",
                options: [
                    "Only cryptocurrency trading",
                    "Social trading and copy trading features",
                    "Only forex trading",
                    "Physical commodity delivery"
                ],
                correct: 1,
                explanation: "eToro is known for its social trading features where you can copy successful traders."
            },
            {
                question: "True or False: Demo accounts perfectly simulate real market conditions.",
                options: [
                    "True - they are exactly the same",
                    "False - there can be differences in execution and emotional pressure",
                    "True - only the money is different",
                    "False - demo accounts don't use real prices"
                ],
                correct: 1,
                explanation: "Demo accounts use real prices but lack the emotional pressure of real money and may have different execution."
            }
        ]
    },
    3: {
        title: "Essential Trading Terms & Order Types",
        subtitle: "Master the vocabulary and mechanics of placing trades",
        youtube_id: null,
        next_preview: "Day 4 introduces you to reading price charts and candlestick basics!",
        task: {
            description: "Practice placing different order types on your demo account.",
            steps: [
                "Open your demo trading platform",
                "Find any stock or asset (e.g., Apple - AAPL)",
                "Practice placing a MARKET order (small amount)",
                "Practice setting up a LIMIT order",
                "Practice setting up a STOP-LOSS order",
                "Take screenshots showing each order type you placed",
                "Upload your screenshots as evidence"
            ]
        },
        quiz: [
            {
                question: "What is a Market Order?",
                options: [
                    "An order to buy/sell at a specific price",
                    "An order to buy/sell immediately at the current market price",
                    "An order that expires at market close",
                    "An order to buy/sell a market index"
                ],
                correct: 1,
                explanation: "A market order executes immediately at the best available current price."
            },
            {
                question: "What is a Limit Order?",
                options: [
                    "An order with a maximum quantity limit",
                    "An order to buy/sell at a specific price or better",
                    "An order that only works during limited hours",
                    "An order for limited partnership stocks"
                ],
                correct: 1,
                explanation: "A limit order specifies the maximum price to buy or minimum price to sell."
            },
            {
                question: "What is the purpose of a Stop-Loss order?",
                options: [
                    "To maximize profits",
                    "To automatically limit potential losses",
                    "To stop the market from moving",
                    "To prevent you from trading"
                ],
                correct: 1,
                explanation: "A stop-loss automatically sells your position when price reaches a certain level to limit losses."
            },
            {
                question: "What does 'Bid' price mean?",
                options: [
                    "The price at which you can buy",
                    "The price at which you can sell (what buyers will pay)",
                    "The average price",
                    "The opening price"
                ],
                correct: 1,
                explanation: "The bid price is what buyers are willing to pay - the price you receive when selling."
            },
            {
                question: "What is the 'Spread' in trading?",
                options: [
                    "The difference between bid and ask prices",
                    "The range of a day's price movement",
                    "The profit from a trade",
                    "The commission charged by brokers"
                ],
                correct: 0,
                explanation: "The spread is the difference between the bid (sell) and ask (buy) prices."
            }
        ]
    }
};

// Generate content for days 4-30 (simplified template)
for (let i = 4; i <= 30; i++) {
    if (!dayContent[i]) {
        dayContent[i] = {
            title: `Day ${i} Content`,
            subtitle: "Building your trading knowledge",
            youtube_id: null,
            next_preview: i < 30 ? `Day ${i + 1} continues your trading journey!` : "Congratulations on completing the challenge!",
            task: {
                description: "Complete today's practical exercise.",
                steps: [
                    "Review today's lesson content carefully",
                    "Take notes on key concepts",
                    "Complete the practical exercise as described",
                    "Take a screenshot of your work",
                    "Upload as evidence of completion"
                ]
            },
            quiz: [
                {
                    question: "Sample question for Day " + i,
                    options: ["Option A", "Option B", "Option C", "Option D"],
                    correct: 0,
                    explanation: "Explanation for the correct answer."
                },
                {
                    question: "Second question for Day " + i,
                    options: ["Option A", "Option B", "Option C", "Option D"],
                    correct: 1,
                    explanation: "Explanation for the correct answer."
                },
                {
                    question: "Third question for Day " + i,
                    options: ["Option A", "Option B", "Option C", "Option D"],
                    correct: 2,
                    explanation: "Explanation for the correct answer."
                },
                {
                    question: "Fourth question for Day " + i,
                    options: ["Option A", "Option B", "Option C", "Option D"],
                    correct: 3,
                    explanation: "Explanation for the correct answer."
                },
                {
                    question: "Fifth question for Day " + i,
                    options: ["Option A", "Option B", "Option C", "Option D"],
                    correct: 0,
                    explanation: "Explanation for the correct answer."
                }
            ]
        };
    }
}

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
        
        // Get authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // For now, return content without auth check
            // In production, you'd verify the JWT token
            const content = dayContent[dayNumber];
            
            if (!content) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Content not found for this day' 
                });
            }
            
            return res.status(200).json({
                success: true,
                day: dayNumber,
                content: content,
                quiz: content.quiz
            });
        }
        
        // If auth header is present, verify with Supabase
        const token = authHeader.replace('Bearer ', '');
        
        const supabase = createClient(
            process.env.SUPABASE_URL || 'https://gvpaemdpmwyncdztlczy.supabase.co',
            process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
        );
        
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Unauthorized' 
            });
        }
        
        // Get user data
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (userError || !userData || !userData.has_paid) {
            return res.status(403).json({ 
                success: false, 
                error: 'Access denied. Please purchase the course.' 
            });
        }
        
        // Check day access
        if (dayNumber > 1) {
            // Check previous day completion
            const { data: prevProgress } = await supabase
                .from('progress')
                .select('completed')
                .eq('user_id', user.id)
                .eq('day_number', dayNumber - 1)
                .single();
            
            if (!prevProgress || !prevProgress.completed) {
                return res.status(403).json({ 
                    success: false, 
                    error: `Complete Day ${dayNumber - 1} first to access Day ${dayNumber}.` 
                });
            }
            
            // Check time-based unlock
            if (userData.challenge_start_time) {
                const startTime = new Date(userData.challenge_start_time).getTime();
                const now = Date.now();
                const daysPassed = Math.floor((now - startTime) / (24 * 60 * 60 * 1000));
                
                if (dayNumber > daysPassed + 1) {
                    return res.status(403).json({ 
                        success: false, 
                        error: `Day ${dayNumber} is not yet unlocked. Please wait.` 
                    });
                }
            }
        }
        
        // Return content
        const content = dayContent[dayNumber];
        
        if (!content) {
            return res.status(404).json({ 
                success: false, 
                error: 'Content not found for this day' 
            });
        }
        
        return res.status(200).json({
            success: true,
            day: dayNumber,
            content: content,
            quiz: content.quiz
        });
        
    } catch (error) {
        console.error('Day API Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
};
