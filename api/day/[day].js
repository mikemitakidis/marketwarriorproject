/**
 * Day Content API
 * 
 * Returns day content for authenticated users.
 * SECURITY: Quiz questions are returned WITHOUT correct answers.
 * Quiz validation happens server-side at /api/quiz/validate
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load lesson content
let LESSON_CONTENT = {};
try {
  const lessonPath = path.join(__dirname, '..', '..', 'lesson_content.json');
  LESSON_CONTENT = JSON.parse(fs.readFileSync(lessonPath, 'utf8'));
} catch (e) {
  console.log('Lesson content not found, using fallback');
}

// Day metadata
const DAY_METADATA = {
  "1": { title: "Introduction to Trading & Financial Markets", subtitle: "Understanding the world of trading and different market types", has_youtube: true },
  "2": { title: "Setting Up a Virtual/Demo Account", subtitle: "Practice trading without risking real money", has_youtube: true },
  "3": { title: "Essential Trading Terms & Order Types", subtitle: "Master the language of trading", has_youtube: true },
  "4": { title: "Investment vs Trading", subtitle: "Understanding the key differences in approach and mindset", has_youtube: true },
  "5": { title: "Market Indexes", subtitle: "Understanding market benchmarks and how they work", has_youtube: true },
  "6": { title: "Stop Loss, Take Profit, Leverage & Margin", subtitle: "Essential risk management tools for every trader", has_youtube: true },
  "7": { title: "Reading Price Charts & Candlestick Basics", subtitle: "Understanding how to read and interpret price action", has_youtube: true },
  "8": { title: "Trend Lines & Chart Patterns", subtitle: "Identifying trends and key chart formations", has_youtube: true },
  "9": { title: "Moving Averages & Support/Resistance", subtitle: "Key technical analysis indicators", has_youtube: true },
  "10": { title: "Chart Patterns", subtitle: "Recognizing and trading common chart formations", has_youtube: true },
  "11": { title: "Key Indicators - RSI, MACD & Moving Averages", subtitle: "Technical indicators that help predict price movements", has_youtube: true },
  "12": { title: "Fundamental Analysis Basics", subtitle: "Understanding company financials and economic data", has_youtube: true },
  "13": { title: "Stock Research & Key Financial Ratios", subtitle: "How to evaluate companies before investing", has_youtube: true },
  "14": { title: "Simulated Trading Exercise", subtitle: "Put your knowledge into practice with paper trading", has_youtube: true },
  "15": { title: "Risk Management & Position Sizing", subtitle: "The most important skill for long-term trading success", has_youtube: true },
  "16": { title: "Moving Averages & Crossovers Strategy", subtitle: "Building your first technical trading strategy", has_youtube: true },
  "17": { title: "Fibonacci Retracements & Advanced Chart Analysis", subtitle: "Using mathematical ratios to find key price levels", has_youtube: true },
  "18": { title: "Backtesting Strategies & Chart Review", subtitle: "Testing your strategies on historical data", has_youtube: true },
  "19": { title: "Creating a Trading Plan & ROI", subtitle: "Building your personalized trading framework", has_youtube: true },
  "20": { title: "Trading Psychology - Emotional Mastery", subtitle: "Controlling emotions for better trading decisions", has_youtube: true },
  "21": { title: "Dividends, Bonds & Fixed Income Assets", subtitle: "Understanding income-generating investments", has_youtube: true },
  "22": { title: "IPOs, Penny Stocks, Crypto & Market Volatility", subtitle: "High-risk, high-reward investment vehicles", has_youtube: true },
  "23": { title: "Hedge Funds & Copy Trading", subtitle: "Alternative investment strategies and social trading", has_youtube: true },
  "24": { title: "Portfolio Rebalancing Basics", subtitle: "Maintaining your target asset allocation", has_youtube: true },
  "25": { title: "Monitoring Virtual Portfolio Performance", subtitle: "Tracking and analyzing your demo trades", has_youtube: true },
  "26": { title: "Adjusting Your Strategy Based on Results", subtitle: "Continuous improvement through data analysis", has_youtube: true },
  "27": { title: "Trade Journaling & Performance Tracking", subtitle: "The habit that separates pros from amateurs", has_youtube: true },
  "28": { title: "Global Economic Indicators", subtitle: "Understanding macroeconomic factors that move markets", has_youtube: true },
  "29": { title: "SMART Goals Setting & Review", subtitle: "Creating actionable trading goals", has_youtube: true },
  "30": { title: "Final Assessment & Graduation", subtitle: "Test your knowledge and earn your certificate!", has_youtube: true }
};

// Quiz questions (WITHOUT correct answers)
const QUIZ_QUESTIONS = {
  "1": [
    { q: "What is the primary difference between trading and investing?", options: ["Both have the same time horizon", "Trading is short-term, investing is long-term", "Investing requires more capital", "Trading is only for professionals"] },
    { q: "Which market operates 24/7 without closing?", options: ["Stock market", "Bond market", "Cryptocurrency market", "Forex market"] },
    { q: "What does ETF stand for?", options: ["Electronic Trading Fund", "Exchange-Traded Fund", "Equity Transfer Function", "External Trading Format"] },
    { q: "Which market is considered the largest by daily trading volume?", options: ["Stock market", "Forex market", "Cryptocurrency market", "Commodities market"] },
    { q: "What is the main risk associated with CFD trading?", options: ["Limited trading hours", "High minimum capital requirements", "Amplified losses due to leverage", "Inability to trade different markets"] }
  ],
  "2": [
    { q: "What is a demo account?", options: ["A premium trading account", "A practice account with virtual money", "An account for professional traders", "A bank savings account"] },
    { q: "Why should beginners start with a demo account?", options: ["To earn real money faster", "To avoid fees", "To practice without risking real capital", "Because real accounts require $100,000"] },
    { q: "How long should you practice on a demo account before trading real money?", options: ["1 day", "At least 6 months", "1 year minimum", "No practice needed"] },
    { q: "What's the main difference between demo and live trading?", options: ["Demo has no market data", "Demo uses delayed prices", "Demo doesn't involve real emotions/money", "There's no difference"] },
    { q: "Which of these is NOT a recommended demo trading platform?", options: ["eToro", "Trading 212", "Social media trading groups", "MetaTrader"] }
  ],
  "3": [
    { q: "What is a market order?", options: ["An order to buy/sell immediately at current price", "A scheduled future order", "An order with price limits", "A canceled order"] },
    { q: "What is a limit order?", options: ["An unlimited buy order", "An order to buy/sell at a specific price or better", "A time-limited order", "An order with no restrictions"] },
    { q: "What does 'bid' price mean?", options: ["The price you can sell at", "The price you can buy at", "The highest price available", "The average price"] },
    { q: "What is the 'spread' in trading?", options: ["The profit on a trade", "The difference between bid and ask price", "The trading fee", "The daily range"] },
    { q: "What is a stop-loss order?", options: ["An order to maximize profit", "An order to limit potential losses", "A free trading feature", "An order to stop trading"] }
  ],
  "4": [
    { q: "What is the typical time horizon for investing?", options: ["Minutes to hours", "Years to decades", "Days to weeks", "Exactly one month"] },
    { q: "Which requires more frequent monitoring?", options: ["Long-term investing", "Buy and hold", "Active trading", "Index fund investing"] },
    { q: "What is the main goal of trading?", options: ["To collect dividends", "To profit from short-term price movements", "To own company shares long-term", "To avoid taxes"] },
    { q: "Which strategy typically has lower transaction costs?", options: ["Day trading", "Long-term investing", "Scalping", "High-frequency trading"] },
    { q: "What does 'buy and hold' mean?", options: ["Buy and sell quickly", "Buy assets and keep them long-term", "Only buy, never sell", "Hold cash only"] }
  ],
  "5": [
    { q: "What does the S&P 500 track?", options: ["500 largest US companies by market cap", "500 random stocks", "Top 500 worldwide companies", "500 tech stocks only"] },
    { q: "What is the Dow Jones Industrial Average?", options: ["A real-time price index", "A bond index", "An index of 30 major US companies", "A cryptocurrency index"] },
    { q: "Why are market indexes useful?", options: ["They guarantee profits", "They provide market benchmarks", "They replace individual stocks", "They eliminate risk"] },
    { q: "What does NASDAQ primarily represent?", options: ["Only banks", "Technology and growth stocks", "Only commodities", "Government bonds"] },
    { q: "What is a market cap weighted index?", options: ["All stocks weighted equally", "Larger companies have more influence", "Smaller companies dominate", "Only price matters"] }
  ],
  "6": [
    { q: "What does a stop-loss order do?", options: ["Increases your profits", "Automatically exits a losing trade at a set price", "Guarantees no losses", "Stops all trading"] },
    { q: "What is leverage in trading?", options: ["A type of stock", "Using borrowed money to increase position size", "A risk-free strategy", "A government regulation"] },
    { q: "What is margin trading?", options: ["Trading on margin call", "Trading with borrowed funds from your broker", "Trading without fees", "A beginner strategy"] },
    { q: "What happens in a margin call?", options: ["You receive a bonus", "You must deposit more funds or close positions", "Your profits increase", "Nothing happens"] },
    { q: "What is a take-profit order?", options: ["An order to close a winning trade at a target price", "A stop-loss variant", "An unlimited profit order", "A market order type"] }
  ],
  "7": [
    { q: "What does a green/white candlestick indicate?", options: ["Price closed higher than it opened (bullish)", "Price closed lower", "No price change", "Market is closed"] },
    { q: "What does a red/black candlestick indicate?", options: ["Price closed higher than it opened", "Price closed lower than it opened (bearish)", "Volume increased", "Market holiday"] },
    { q: "What is the 'body' of a candlestick?", options: ["The highest price", "The difference between open and close", "The lowest price", "The trading volume"] },
    { q: "What do the 'wicks' or 'shadows' show?", options: ["Tomorrow's price", "The high and low prices during that period", "Trading volume", "News events"] },
    { q: "What is a 'doji' candlestick?", options: ["A very large candle", "When open and close prices are nearly equal", "Only appears on Fridays", "A bullish signal always"] }
  ],
  "8": [
    { q: "What is a trend line?", options: ["A line connecting highs or lows to show direction", "A random drawing", "A profit indicator", "A news feed line"] },
    { q: "What is a support level?", options: ["A price ceiling", "A price floor where buying interest increases", "A trading platform feature", "A government regulation"] },
    { q: "What is a resistance level?", options: ["A price ceiling where selling pressure increases", "A price floor", "A type of order", "A broker fee"] },
    { q: "What is an uptrend?", options: ["Prices making lower highs", "Prices making higher highs and higher lows", "Sideways movement", "A down market"] },
    { q: "What is a head and shoulders pattern?", options: ["A random formation", "A reversal pattern suggesting trend change", "A bullish continuation", "A volume indicator"] }
  ],
  "9": [
    { q: "What is a moving average?", options: ["The average of all-time prices", "An average of prices over a specific period", "Tomorrow's predicted price", "A static price level"] },
    { q: "What does a 50-day moving average show?", options: ["The average price over the last 50 days", "Exactly 50 trades", "A future prediction", "Annual average"] },
    { q: "What happens when price crosses above a moving average?", options: ["Often a bearish signal", "Often a bullish signal", "Nothing significant", "Market closes"] },
    { q: "What is a 'golden cross'?", options: ["A bearish pattern", "When short-term MA crosses above long-term MA", "A candlestick pattern", "A trading fee"] },
    { q: "What is a 'death cross'?", options: ["A bullish pattern", "When short-term MA crosses below long-term MA", "A chart error", "A buying signal"] }
  ],
  "10": [
    { q: "What is a double top pattern?", options: ["A bullish reversal pattern", "A bearish reversal pattern at resistance", "A continuation pattern", "A random formation"] },
    { q: "What is a double bottom pattern?", options: ["A bearish signal", "A bullish reversal pattern at support", "A continuation pattern", "A daily chart only"] },
    { q: "What does a triangle pattern indicate?", options: ["A consolidation before breakout", "Immediate reversal", "Market closure", "No trading activity"] },
    { q: "What is a flag pattern?", options: ["A reversal pattern", "A continuation pattern after sharp move", "A random occurrence", "An error"] },
    { q: "What is a wedge pattern?", options: ["A bullish pattern only", "A pattern showing narrowing price range", "A volume indicator", "A news-based pattern"] }
  ],
  "11": [
    { q: "What does RSI measure?", options: ["Relative Strength Index - momentum indicator", "Real Stock Information", "Random Signal Indicator", "Resistance Support Index"] },
    { q: "What RSI reading typically indicates overbought?", options: ["Below 30", "Above 70", "Exactly 50", "Below 10"] },
    { q: "What does MACD stand for?", options: ["Moving Average Convergence Divergence", "Market Average Daily Change", "Maximum Average Data Count", "Moving Asset Direction Calculator"] },
    { q: "What does a MACD crossover signal?", options: ["Market closure", "Potential trend change", "Volume spike", "Price freeze"] },
    { q: "When is a stock considered 'oversold' by RSI?", options: ["Above 80", "Below 30", "At 50", "Above 90"] }
  ],
  "12": [
    { q: "What is fundamental analysis?", options: ["Analyzing company financials and economic data", "Only looking at charts", "Trading based on rumors", "Ignoring all data"] },
    { q: "What is a company's P/E ratio?", options: ["Price to Earnings ratio", "Profit to Expense ratio", "Price to Employee ratio", "Performance to Equity ratio"] },
    { q: "What does EPS stand for?", options: ["Earnings Per Share", "Equity Per Stock", "Expected Price Scenario", "Economic Performance Score"] },
    { q: "Why is revenue growth important?", options: ["Shows company is shrinking", "Shows company is growing sales", "Only matters for tech", "It's not important"] },
    { q: "What is a balance sheet?", options: ["A trading strategy", "A snapshot of company assets and liabilities", "A chart pattern", "A broker statement"] }
  ],
  "13": [
    { q: "What is a good P/E ratio?", options: ["Depends on industry and growth expectations", "Always below 5", "Always above 100", "Exactly 20 always"] },
    { q: "What does debt-to-equity ratio show?", options: ["Company's profitability", "How much debt vs shareholder equity", "Stock price history", "Trading volume"] },
    { q: "What is return on equity (ROE)?", options: ["A chart pattern", "How efficiently a company generates profit from equity", "A trading fee", "A government tax"] },
    { q: "Why check a company's cash flow?", options: ["It doesn't matter", "Shows actual cash generated vs accounting profits", "Only for banks", "It's outdated info"] },
    { q: "What is market capitalization?", options: ["Total value of all outstanding shares", "Daily trading volume", "A broker fee", "A chart indicator"] }
  ],
  "14": [
    { q: "What is the purpose of simulated trading?", options: ["To earn real money", "To lose real money", "To practice strategies without financial risk", "To skip learning"] },
    { q: "How should you treat demo trading?", options: ["Carelessly, since it's not real", "As seriously as real trading to build good habits", "Skip it entirely", "Only trade maximum amounts"] },
    { q: "What should you document during practice trades?", options: ["Nothing needed", "Entry/exit points, reasoning, and results", "Only winning trades", "Only losses"] },
    { q: "What's a realistic practice trading goal?", options: ["100% returns monthly", "Consistent small gains while managing risk", "Never losing any trade", "Doubling money daily"] },
    { q: "When should you move from demo to real trading?", options: ["Immediately", "After consistent profitable months in demo", "Never", "After one good trade"] }
  ],
  "15": [
    { q: "What is the recommended maximum risk per trade?", options: ["1-2% of account", "50% of account", "All of your capital", "10% minimum"] },
    { q: "What is position sizing?", options: ["Making your screen bigger", "Determining how much to invest in each trade", "A chart pattern", "A broker requirement"] },
    { q: "Why is risk management crucial?", options: ["It's not important", "Protects capital and ensures longevity", "Only for professionals", "To increase losses"] },
    { q: "What is a risk-reward ratio?", options: ["A trading fee", "Potential profit vs potential loss on a trade", "A chart indicator", "A news metric"] },
    { q: "What does 2:1 risk-reward mean?", options: ["Risk twice as much as reward", "Potential reward is twice the risk", "Two trades for one", "Two accounts needed"] }
  ],
  "16": [
    { q: "What is a moving average crossover?", options: ["When two MAs cross each other signaling trend change", "When price hits zero", "A broken chart", "A trading error"] },
    { q: "What is a golden cross?", options: ["50-day MA crossing above 200-day MA (bullish)", "200-day crossing above 50-day", "Any cross", "A gold trading strategy"] },
    { q: "What is a death cross?", options: ["A bullish signal", "50-day MA crossing below 200-day MA (bearish)", "A market holiday", "An error"] },
    { q: "Why combine multiple MAs?", options: ["More confusion", "Confirmation and filtering false signals", "No reason", "It's required by law"] },
    { q: "What timeframe works best for MA crossovers?", options: ["Only 1 minute", "Depends on trading style and goals", "Only monthly", "Random"] }
  ],
  "17": [
    { q: "What is a Fibonacci retracement?", options: ["A support/resistance tool based on Fibonacci ratios", "A random number generator", "A trading platform", "A news source"] },
    { q: "What are key Fibonacci levels?", options: ["23.6%, 38.2%, 50%, 61.8%, 78.6%", "Only 50%", "Random percentages", "100% only"] },
    { q: "How do you use Fibonacci retracements?", options: ["Ignore them", "To identify potential support/resistance during pullbacks", "Only for forex", "Replace all other analysis"] },
    { q: "What is the 'golden ratio' in Fibonacci?", options: ["1.0", "0.618 or 61.8%", "2.0", "0.5"] },
    { q: "When should Fibonacci be used?", options: ["Only on weekends", "In trending markets to find pullback levels", "Never", "Only with options"] }
  ],
  "18": [
    { q: "What is backtesting?", options: ["Testing strategies on historical data", "Testing new computers", "Forward testing only", "Ignoring history"] },
    { q: "Why is backtesting important?", options: ["It's not important", "Validates strategy performance before risking real money", "Guaranteed profits", "Required by brokers"] },
    { q: "What are limitations of backtesting?", options: ["None", "Past performance doesn't guarantee future results", "Too accurate", "Too simple"] },
    { q: "What should you track in backtesting?", options: ["Nothing", "Win rate, profit factor, drawdown, etc.", "Only wins", "Only losses"] },
    { q: "How much historical data should you test?", options: ["1 day", "As much relevant data as possible", "Only yesterday", "No data needed"] }
  ],
  "19": [
    { q: "What should a trading plan include?", options: ["Nothing specific", "Entry/exit rules, risk management, goals", "Only entry points", "Only profit targets"] },
    { q: "Why have a written trading plan?", options: ["It's unnecessary", "Removes emotion and ensures consistency", "Makes trading harder", "For tax purposes only"] },
    { q: "What is ROI?", options: ["Random Order Indicator", "Return on Investment", "Risk of Inflation", "Rate of Interest"] },
    { q: "How often should you review your plan?", options: ["Never", "Regularly based on performance data", "Only when losing", "Once a decade"] },
    { q: "What makes a good trading goal?", options: ["Unrealistic targets", "Specific, measurable, achievable targets", "Vague ideas", "No goals needed"] }
  ],
  "20": [
    { q: "What is the biggest enemy of traders?", options: ["Their emotions", "The market", "Their broker", "Other traders"] },
    { q: "What is FOMO in trading?", options: ["A stock ticker", "Fear of Missing Out - leading to impulsive trades", "A chart pattern", "A trading strategy"] },
    { q: "How do you combat revenge trading?", options: ["Trade more aggressively", "Step away and follow your plan", "Double your position", "Ignore losses"] },
    { q: "Why keep a trading journal?", options: ["Waste of time", "Track emotions and improve decision-making", "Required by law", "For fun only"] },
    { q: "What is emotional discipline?", options: ["Ignoring all emotions", "Managing emotions to stick to your plan", "Trading based on feelings", "Never trading"] }
  ],
  "21": [
    { q: "What is a dividend?", options: ["A type of bond", "Company profit distributed to shareholders", "A trading fee", "A chart pattern"] },
    { q: "What is a bond?", options: ["A type of stock", "A loan to government or corporation", "A trading strategy", "A market index"] },
    { q: "What is fixed income?", options: ["Random income", "Predictable income stream from bonds/dividends", "No income", "Variable income"] },
    { q: "Why include bonds in a portfolio?", options: ["They're worthless", "Stability and income diversification", "Maximum risk", "To avoid stocks"] },
    { q: "What is dividend yield?", options: ["A chart indicator", "Annual dividend as percentage of stock price", "A bond term", "A trading fee"] }
  ],
  "22": [
    { q: "What is an IPO?", options: ["Initial Public Offering - company's first stock sale to public", "Internal Profit Order", "Investment Portfolio Option", "Index Price Order"] },
    { q: "What are penny stocks?", options: ["Expensive stocks", "Low-priced, speculative stocks", "Government bonds", "Index funds"] },
    { q: "What is cryptocurrency volatility?", options: ["Crypto prices are very stable", "Crypto experiences significant price swings", "Crypto never changes", "Volatility doesn't exist"] },
    { q: "Why are IPOs risky?", options: ["They're not risky", "Limited history, hype-driven pricing", "Guaranteed returns", "Government backed"] },
    { q: "How should beginners approach high-volatility assets?", options: ["All-in immediately", "Small positions, thorough research", "Avoid all trading", "Maximum leverage"] }
  ],
  "23": [
    { q: "What is a hedge fund?", options: ["A gardening fund", "A fund using advanced strategies for qualified investors", "A public mutual fund", "A government program"] },
    { q: "What is copy trading?", options: ["Cheating", "Automatically copying trades of successful traders", "Illegal trading", "Manual copying"] },
    { q: "What are risks of copy trading?", options: ["No risks", "Copied trader can lose too, hidden fees", "Guaranteed profits", "Only benefits"] },
    { q: "What should you check before copy trading?", options: ["Nothing", "Track record, risk profile, fees", "Only follower count", "Random selection"] },
    { q: "Are hedge fund strategies suitable for beginners?", options: ["Yes, always", "Generally no - too complex and risky", "Required for all", "Mandatory"] }
  ],
  "24": [
    { q: "What is portfolio rebalancing?", options: ["A type of trading", "Adjusting holdings back to target allocation", "Selling everything", "Buying random stocks"] }
  ],
  "25": [
    { q: "How often should you review portfolio performance?", options: ["Never", "Every minute", "Regularly - weekly/monthly", "Once every 10 years"] },
    { q: "What metrics matter in portfolio review?", options: ["Only gains", "Returns, risk, diversification, benchmark comparison", "Nothing matters", "Only losses"] },
    { q: "What is a benchmark?", options: ["A furniture piece", "A standard for comparison like S&P 500", "A trading tool", "A broker fee"] },
    { q: "Why track unrealized gains/losses?", options: ["No reason", "Shows current position value vs cost", "Only realized matters", "For fun"] },
    { q: "What indicates a need for strategy adjustment?", options: ["Everything is perfect", "Consistent underperformance vs benchmark", "One bad day", "Nothing ever"] }
  ],
  "26": [
    { q: "When should you adjust your strategy?", options: ["After every trade", "When data shows consistent issues", "Never change", "Randomly"] },
    { q: "What data helps strategy adjustment?", options: ["No data needed", "Win rate, drawdown, risk-reward analysis", "Only profits", "Only feelings"] },
    { q: "What is a drawdown?", options: ["A sketch", "Peak to trough decline in portfolio value", "A chart type", "A trading order"] },
    { q: "How do you avoid over-optimization?", options: ["Optimize more", "Use out-of-sample testing, keep rules simple", "Ignore all testing", "Add more indicators"] },
    { q: "What's the danger of changing strategy too often?", options: ["No danger", "Prevents any strategy from proving itself", "Guaranteed profits", "Required by brokers"] }
  ],
  "27": [
    { q: "What is the minimum recommended profit factor for a healthy trading strategy?", options: ["0.5 or higher", "1.0 or higher", "1.5 or higher", "3.0 or higher"] },
    { q: "Why is tracking emotional state important in a trading journal?", options: ["It helps you justify bad trades", "It helps identify patterns between emotions and trading performance", "It's required by trading regulations", "It's not important"] },
    { q: "How often should you review your trading journal according to best practices?", options: ["Only when you have losing trades", "Weekly and monthly reviews", "Once a year is sufficient", "Never"] },
    { q: "What does a 70% win rate mean?", options: ["70% of your capital is at risk", "7 out of 10 trades are winners", "You make 70% profit on each trade", "70% of your time is spent trading"] },
    { q: "What should you track beyond just profit and loss?", options: ["Only entry and exit prices", "Just win rate is enough", "Strategy used, emotions, market conditions, and screenshots", "Nothing else matters"] }
  ],
  "28": [
    { q: "What is GDP?", options: ["A stock ticker", "A chart pattern", "Gross Domestic Product - total economic output", "A trading strategy"] },
    { q: "How does inflation affect markets?", options: ["No effect", "Can increase interest rates, affect stock valuations", "Only affects bonds", "Inflation doesn't exist"] },
    { q: "What are interest rates?", options: ["A trading fee", "Cost of borrowing money, set by central banks", "Stock prices", "A chart indicator"] },
    { q: "Why watch employment data?", options: ["No reason", "Indicates economic health, affects Fed policy", "Only for job seekers", "Outdated information"] },
    { q: "What is the Federal Reserve?", options: ["A bank for reserves", "US central bank that sets monetary policy", "A trading platform", "A hedge fund"] }
  ],
  "29": [
    { q: "What does SMART stand for in goal setting?", options: ["Simple, Manageable, Achievable, Realistic, Timely", "Specific, Measurable, Achievable, Relevant, Time-bound", "Strategic, Meaningful, Attainable, Reasonable, Targeted", "Short, Medium, And Real-time Trading"] },
    { q: "Why are specific goals important?", options: ["They're not", "Clear targets are easier to achieve and measure", "Vague is better", "Only profits matter"] },
    { q: "What's a realistic monthly return goal for beginners?", options: ["100%+ returns", "2-5% consistent returns", "500% minimum", "Instant millions"] },
    { q: "How should you handle unmet goals?", options: ["Give up immediately", "Analyze why and adjust approach", "Blame the market", "Double your risk"] },
    { q: "What makes goals time-bound?", options: ["No deadline needed", "Setting clear deadlines for achievement", "Infinite time always", "Goals don't need time"] }
  ],
  "30": [
    { q: "What is the PRIMARY difference between investing and trading?", options: ["There is no difference", "Trading is short-term, investing is long-term", "Trading requires more capital", "Investing is more risky"] },
    { q: "What is the recommended maximum risk per trade for beginners?", options: ["10%", "50%", "1-2%", "25%"] },
    { q: "What does a bullish trend indicate?", options: ["Prices going down", "Prices going up", "Sideways movement", "Market closed"] },
    { q: "What does RSI above 70 typically indicate?", options: ["Oversold", "Overbought", "Neutral", "Broken indicator"] },
    { q: "What is a MACD bullish crossover?", options: ["MACD line crossing above signal line", "MACD going to zero", "Signal line crossing above MACD", "Both lines at zero"] },
    { q: "What should you do when a trade goes against your plan?", options: ["Add more to your position", "Remove your stop-loss", "Stick to your plan and exit criteria", "Panic sell"] },
    { q: "What does P/E ratio measure?", options: ["Price to Employees", "Price to Earnings", "Profit to Expense", "Performance to Efficiency"] },
    { q: "How should you handle major news events?", options: ["Always trade news", "Reduce position sizes or stay out", "Ignore all news", "Maximum leverage"] },
    { q: "What is a support level?", options: ["A price ceiling", "A price floor where buying interest increases", "A trading fee", "A broker limit"] },
    { q: "How long should you practice on a demo account?", options: ["1 day", "1 week", "1 month", "At least 6 months"] }
  ]
};

// Quiz question counts per day
const QUIZ_COUNTS = {
  "1": 5, "2": 5, "3": 5, "4": 5, "5": 5, "6": 5, "7": 5, "8": 5, "9": 5, "10": 5,
  "11": 5, "12": 5, "13": 5, "14": 5, "15": 5, "16": 5, "17": 5, "18": 5, "19": 5, "20": 5,
  "21": 5, "22": 5, "23": 5, "24": 1, "25": 5, "26": 5, "27": 5, "28": 5, "29": 5, "30": 10
};

module.exports = async (req, res) => {
  // Set CORS headers
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
    const { day } = req.query;
    const dayNum = parseInt(day);
    
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 30) {
      return res.status(400).json({ success: false, error: 'Invalid day number' });
    }
    
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
    
    // Check if user has paid access
    if (userData.payment_status !== 'paid') {
      return res.status(403).json({ success: false, error: 'Payment required' });
    }
    
    // Check day access using SERVER TIME
    const serverTime = new Date();
    const challengeStart = new Date(userData.challenge_start_date);
    const daysSinceStart = Math.floor((serverTime - challengeStart) / (24 * 60 * 60 * 1000));
    
    // Day 1 is always unlocked, others require previous day completion and time
    if (dayNum > 1) {
      // Check time requirement
      if (daysSinceStart < dayNum - 1) {
        return res.status(403).json({ 
          success: false, 
          error: `Day ${dayNum} unlocks in ${(dayNum - 1) - daysSinceStart} day(s)`,
          unlock_time: new Date(challengeStart.getTime() + (dayNum - 1) * 24 * 60 * 60 * 1000).toISOString()
        });
      }
      
      // Check previous day completion
      const { data: prevDay } = await supabase
        .from('challenge_progress')
        .select('quiz_passed, task_submitted')
        .eq('user_id', user.id)
        .eq('day_number', dayNum - 1)
        .single();
      
      if (!prevDay || (!prevDay.quiz_passed && !prevDay.task_submitted)) {
        return res.status(403).json({ 
          success: false, 
          error: `Complete Day ${dayNum - 1} first` 
        });
      }
    }
    
    // Get user's progress for this day
    const { data: progress } = await supabase
      .from('challenge_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('day_number', dayNum)
      .single();
    
    // Prepare day content (WITHOUT correct answers)
    const dayData = DAY_METADATA[String(dayNum)];
    const quizQuestions = QUIZ_QUESTIONS[String(dayNum)] || [];
    
    const response = {
      success: true,
      day: dayNum,
      content: {
        title: dayData.title,
        subtitle: dayData.subtitle,
        has_youtube: dayData.has_youtube,
        youtube_id: null,
        lesson_html: LESSON_CONTENT[String(dayNum)]?.html || '<p>Lesson content loading...</p>'
      },
      quiz: {
        questions: quizQuestions.map((q, idx) => ({
          number: idx + 1,
          question: q.q,
          options: q.options.map((opt, optIdx) => ({
            letter: String.fromCharCode(97 + optIdx), // a, b, c, d
            text: opt
          }))
        })),
        total_questions: quizQuestions.length,
        pass_percentage: 60
        // NOTE: Correct answers are NOT included - validate via /api/quiz/validate
      },
      progress: {
        quiz_completed: progress?.quiz_passed || false,
        quiz_score: progress?.quiz_score || 0,
        quiz_attempts: progress?.quiz_attempts || 0,
        task_submitted: progress?.task_submitted || false
      }
    };
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Day content error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
