-- =============================================================
-- Forum Seed Data: Realistic posts and comments
-- Uses a single seed user_id with varied author_name values
-- SAFE: Does not affect real users. To remove all seed data:
--   DELETE FROM forum_posts WHERE user_id = '1f40b7b9-329a-4d89-b8b8-2a09176fa7ea';
-- (Comments, likes, views cascade-delete automatically)
-- =============================================================

DO $$
DECLARE
  seed_uid uuid := '1f40b7b9-329a-4d89-b8b8-2a09176fa7ea';
  cat_general int;
  cat_days int;
  cat_journal int;
  cat_other int;
  p1 uuid := gen_random_uuid();
  p2 uuid := gen_random_uuid();
  p3 uuid := gen_random_uuid();
  p4 uuid := gen_random_uuid();
  p5 uuid := gen_random_uuid();
  p6 uuid := gen_random_uuid();
  p7 uuid := gen_random_uuid();
  p8 uuid := gen_random_uuid();
  p9 uuid := gen_random_uuid();
  p10 uuid := gen_random_uuid();
  p11 uuid := gen_random_uuid();
  p12 uuid := gen_random_uuid();
  p13 uuid := gen_random_uuid();
  p14 uuid := gen_random_uuid();
  p15 uuid := gen_random_uuid();
  p16 uuid := gen_random_uuid();
  p17 uuid := gen_random_uuid();
  p18 uuid := gen_random_uuid();
BEGIN
  -- Get category IDs by slug
  SELECT id INTO cat_general FROM forum_categories WHERE slug = 'general';
  SELECT id INTO cat_days FROM forum_categories WHERE slug = 'days-1-30';
  SELECT id INTO cat_journal FROM forum_categories WHERE slug = 'trading-journal';
  SELECT id INTO cat_other FROM forum_categories WHERE slug = 'other';

  -- ============================================================
  -- POSTS (18 total across all categories)
  -- ============================================================

  -- P1: Pinned welcome post (General)
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, is_pinned, created_at)
  VALUES (p1, seed_uid, cat_general, 'Market Warrior Team',
    'Welcome to the Community Forum!',
    'Hey everyone! Welcome to the Market Warrior community forum. This is the place to connect with fellow traders, share your progress, ask questions, and support each other through the 30-day challenge and beyond.

A few guidelines:
- Be respectful and supportive
- Share your wins AND your losses — we learn from both
- Use the Days 1-30 category to discuss specific challenge days
- Trading Journal is perfect for posting your trade setups and getting feedback

Looking forward to seeing this community grow. Let''s get after it!',
    true,
    NOW() - interval '21 days');

  -- P2: General intro
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, created_at)
  VALUES (p2, seed_uid, cat_general, 'John Smith',
    'New here - excited to start the challenge!',
    'Hey everyone, I''m John. I''ve been swing trading for about 6 months but my results have been inconsistent. Found Market Warrior through a friend who completely turned his trading around with it. Starting Day 1 tomorrow — any tips for getting the most out of the first week?',
    NOW() - interval '18 days');

  -- P3: General discussion
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, created_at)
  VALUES (p3, seed_uid, cat_general, 'Claire Jones',
    'What broker are you guys using?',
    'Quick question for the group — what broker do you recommend for someone trading US stocks and options? I''m currently on Robinhood but thinking of switching to something with better charts and order execution. Would love to hear what''s working for you.',
    NOW() - interval '14 days');

  -- P4: General - mindset
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, created_at)
  VALUES (p4, seed_uid, cat_general, 'Kwame Asante',
    'The hardest part of trading is doing nothing',
    'Something I''ve realized going through this challenge: the hardest part isn''t finding setups, it''s sitting on your hands when there''s no setup. Day 12 taught me that overtrading was my biggest leak. I used to take 5-8 trades a day. Now I take 1-2 high-quality ones and my win rate went from 40% to 65%. Anyone else experienced this shift?',
    NOW() - interval '10 days');

  -- P5: Days 1-30 - Day 1
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, day_number, created_at)
  VALUES (p5, seed_uid, cat_days, 'NoviceTrader22',
    'Day 1 reflections - mind blown already',
    'Just finished Day 1 and wow. The way the course breaks down market structure is completely different from what I''ve seen on YouTube. I''ve been trading for a year and didn''t even understand the basics properly. The homework exercise about identifying trends on different timeframes really opened my eyes. Anyone else feel like they had to unlearn a lot?',
    1,
    NOW() - interval '17 days');

  -- P6: Days 1-30 - Day 3
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, day_number, created_at)
  VALUES (p6, seed_uid, cat_days, 'Nicolla Pazzini',
    'Day 3 - Support and Resistance question',
    'I''m working through the support and resistance module and have a question. When you have multiple S/R levels close together, do you treat them as a zone or pick the strongest single level? For example, on AAPL today I can see what looks like resistance at $185.50, $186, and $186.80 — is that one big resistance zone or three separate levels?',
    3,
    NOW() - interval '15 days');

  -- P7: Days 1-30 - Day 7
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, day_number, created_at)
  VALUES (p7, seed_uid, cat_days, 'Lars van den Berg',
    'Day 7 complete - first full week done!',
    'Just wrapped up the first week and I can already feel a difference in how I look at charts. Before this challenge, I was just staring at candlesticks hoping for a pattern. Now I actually have a framework. The risk management section on Day 5 was a game changer. I never properly calculated position sizes before — I was risking way too much per trade. Feeling really good about the next 23 days.',
    7,
    NOW() - interval '12 days');

  -- P8: Days 1-30 - Day 14
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, day_number, created_at)
  VALUES (p8, seed_uid, cat_days, 'Yuki Tanaka',
    'Day 14 - Halfway through! My results so far',
    'Halfway checkpoint! Here are my stats since starting the challenge:
- Total paper trades: 23
- Win rate: 61%
- Average R:R: 1:2.3
- Biggest win: 3.2R on NVDA breakout
- Biggest loss: -1R on TSLA (broke my own rules)

The journaling habit from Day 10 has been huge. Being able to review my trades and see the patterns in my mistakes is invaluable. The entry timing module from this week finally clicked and my entries have been way more precise.',
    14,
    NOW() - interval '7 days');

  -- P9: Days 1-30 - Day 21
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, day_number, created_at)
  VALUES (p9, seed_uid, cat_days, 'PatientTrader',
    'Day 21 - Patience is finally paying off',
    'Three weeks in and the patience lesson is starting to stick. I waited over 4 hours today for my setup and when it came, it was textbook. Hit my 2R target within 30 minutes. Old me would have taken 3 mediocre trades during those 4 hours of waiting and probably ended the day flat or red. This challenge is reprogramming my brain.',
    21,
    NOW() - interval '3 days');

  -- P10: Trading Journal - trade setup
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, created_at)
  VALUES (p10, seed_uid, cat_journal, 'Hans Mueller',
    'NVDA long trade - breakout play that worked',
    'Setup: NVDA daily chart showing a bull flag forming after the earnings gap up. The consolidation was tightening with decreasing volume — classic sign of accumulation.

Entry: $875.50 on the break above the flag with volume confirmation
Stop loss: $862 (below the flag low)
Target 1: $895 (1:1.5 R)
Target 2: $920 (1:3.3 R)

Result: Hit T1 the same day, moved stop to breakeven. T2 hit two days later. Total gain: +$44.50/share.

Key takeaway: Waiting for the volume confirmation on the breakout saved me from two false breakouts earlier in the week.',
    NOW() - interval '11 days');

  -- P11: Trading Journal - loss
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, created_at)
  VALUES (p11, seed_uid, cat_journal, 'Amara Okafor',
    'My worst trade this month - learning from losses',
    'Sharing this because I think we learn more from losses than wins.

TSLA short at $248 — I saw what I thought was a head and shoulders on the 15min chart. Entered the short, set my stop at $253. But here''s what I did wrong:

1. Didn''t check the daily chart — it was in a clear uptrend
2. Ignored that we were approaching earnings (higher volatility)
3. Sized too big because I was "confident"

Got stopped out within an hour. -1R. Could have been worse but the lesson was expensive enough. Rule from now on: ALWAYS check the higher timeframe trend before taking a counter-trend trade.',
    NOW() - interval '8 days');

  -- P12: Trading Journal - weekly recap
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, created_at)
  VALUES (p12, seed_uid, cat_journal, 'SwingKing',
    'Week 2 journal recap - 7 trades, 5 winners',
    'Posting my weekly recap as the course recommends:

Monday: AAPL long +1.5R (gap fill play)
Tuesday: No trades (no setups met my criteria)
Wednesday: MSFT long +2.1R (bounce off 50 EMA)
Wednesday: META short -0.8R (should have waited for confirmation)
Thursday: AMZN long +1.2R (breakout with volume)
Thursday: GOOGL long -1R (stopped out, entered too early)
Friday: SPY puts +1.8R (rejection at resistance)

Net: +4.8R for the week. Happy with the patience on Tuesday — old me would have forced something. The two losses were both timing issues, working on those.',
    NOW() - interval '5 days');

  -- P13: Trading Journal - question
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, created_at)
  VALUES (p13, seed_uid, cat_journal, 'Mei Lin Chen',
    'How do you handle trades that go sideways?',
    'I have a question about trade management that I don''t think the course covered in depth. What do you do when a trade doesn''t hit your stop loss but also doesn''t move toward your target? Like it just chops around for hours near your entry.

Do you:
a) Hold and wait for the original thesis to play out
b) Close at breakeven and move on
c) Tighten the stop

I find myself getting impatient and closing too early, then watching it run to my target without me. But other times I hold and it eventually stops me out. Would love to hear how you all handle this.',
    NOW() - interval '4 days');

  -- P14: Other - resources
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, created_at)
  VALUES (p14, seed_uid, cat_other, 'Stefan Brouwer',
    'Free charting tools that pair well with the course',
    'Wanted to share some free tools that have helped me apply what I''m learning:

1. TradingView (free tier) - Best for drawing S/R levels and trendlines. The replay feature is amazing for practice.
2. Finviz - Great for scanning stocks that match the setups we learn in Week 2
3. Market Chameleon - Free options flow data that helps with the sentiment analysis from Day 18
4. Investopedia simulator - For paper trading if your broker doesn''t offer it

Anyone else have tools they''d recommend?',
    NOW() - interval '9 days');

  -- P15: Other - schedule
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, created_at)
  VALUES (p15, seed_uid, cat_other, 'Fatima Al-Rashid',
    'How do you fit trading around a full-time job?',
    'I work 9-5 and I''m finding it hard to watch charts during market hours. Those of you with day jobs — how are you managing? Do you:

- Set alerts and check during lunch breaks?
- Focus only on swing trades (hold overnight)?
- Trade pre-market or after-hours?

The course material is great but a lot of it assumes you can watch the market in real time. Would love tips from people in similar situations.',
    NOW() - interval '6 days');

  -- P16: General - 30 day review
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, created_at)
  VALUES (p16, seed_uid, cat_general, 'Pieter de Vries',
    'Just finished the 30-day challenge - my honest review',
    'Completed the full 30 days yesterday. Here''s my honest take:

What worked really well:
- The daily structure kept me accountable
- Risk management framework is solid and practical
- The community forum (you guys!) kept me motivated
- The journaling system helped me identify my weaknesses fast

What I found challenging:
- Some days the material was a lot to digest in one sitting
- I wish there were more examples for options trading specifically
- The pace in Week 3 felt faster than Weeks 1-2

Overall results: My paper trading account went from -2% to +8% over the month. More importantly, I have a system now. Before this I was just gambling. Would I recommend it? 100% yes.

Now I''m transitioning to real money with small positions. Onwards!',
    NOW() - interval '1 day');

  -- P17: Days 1-30 - Day 5
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, day_number, created_at)
  VALUES (p17, seed_uid, cat_days, 'Tobias Richter',
    'Day 5 risk management - position sizing calculator',
    'The risk management module today was eye-opening. I built a simple spreadsheet based on the formula from the lesson to auto-calculate my position size. You just plug in your account size, risk percentage, entry price, and stop loss — it tells you exactly how many shares to buy.

Before this I was just buying round lots (100 shares) regardless of the setup. No wonder I was having huge drawdowns. Now I risk a flat 1% per trade and my equity curve is so much smoother. This single lesson might be worth the entire course price for me.',
    5,
    NOW() - interval '13 days');

  -- P18: Days 1-30 - Day 10
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, day_number, created_at)
  VALUES (p18, seed_uid, cat_days, 'Priya Sharma',
    'Day 10 - The journaling habit is already helping',
    'Started the trade journal on Day 10 as instructed and I can already see the value. After just 3 days of journaling I noticed that:

1. I perform best between 10am-11:30am
2. My worst trades are all revenge trades after a loss
3. I have a bias toward long trades even in downtrends

None of this was obvious to me before I started writing it down. The template provided in the lesson makes it really easy to track everything. Who else is keeping up with their journal?',
    10,
    NOW() - interval '9 days');

  -- ============================================================
  -- COMMENTS (35 total with realistic conversations)
  -- ============================================================

  -- Comments on P2 (John's intro)
  INSERT INTO forum_comments (post_id, user_id, author_name, content, created_at)
  VALUES
  (p2, seed_uid, 'Claire Jones', 'Welcome John! The first week is all about building the foundation — don''t rush through it. Take notes on everything and do the homework exercises even if they seem basic. They build on each other. Good luck!', NOW() - interval '18 days' + interval '3 hours'),
  (p2, seed_uid, 'Kwame Asante', 'Best tip I can give: actually do the paper trades. I know it feels like play money isn''t "real" but the habits you build now carry over. I skipped paper trading when I started and regretted it.', NOW() - interval '17 days' + interval '6 hours'),
  (p2, seed_uid, 'John Smith', 'Thanks both! Will definitely take it seriously. Starting the paper trading account today.', NOW() - interval '17 days' + interval '8 hours');

  -- Comments on P3 (broker question)
  INSERT INTO forum_comments (post_id, user_id, author_name, content, created_at)
  VALUES
  (p3, seed_uid, 'Hans Mueller', 'I switched from Robinhood to Webull and the charts are significantly better. The Level 2 data is free too which helps with understanding order flow from the Day 16 lesson.', NOW() - interval '14 days' + interval '2 hours'),
  (p3, seed_uid, 'Lars van den Berg', 'IBKR (Interactive Brokers) if you want the best execution and lowest commissions. The interface is uglier but the fills are way better than Robinhood. I pair it with TradingView for charting.', NOW() - interval '14 days' + interval '5 hours'),
  (p3, seed_uid, 'SwingKing', 'Thinkorswim (TD Ameritrade/Schwab) has the best free charting platform in my opinion. The learning curve is steep but once you set it up it''s incredible. The paper trading mode is perfect for the challenge too.', NOW() - interval '13 days' + interval '1 hour'),
  (p3, seed_uid, 'Claire Jones', 'Thanks everyone! Going to try Thinkorswim since the paper trading feature sounds perfect for what I need right now.', NOW() - interval '13 days' + interval '4 hours');

  -- Comments on P4 (doing nothing)
  INSERT INTO forum_comments (post_id, user_id, author_name, content, created_at)
  VALUES
  (p4, seed_uid, 'Yuki Tanaka', 'This is SO true. I went from averaging 6 trades/day to 1-2 and my P&L improved dramatically. Quality over quantity is the biggest lesson from this challenge.', NOW() - interval '10 days' + interval '4 hours'),
  (p4, seed_uid, 'NoviceTrader22', 'I''m still struggling with this honestly. When I see the market moving I feel like I''m leaving money on the table by not trading. Any tips for dealing with FOMO?', NOW() - interval '10 days' + interval '7 hours'),
  (p4, seed_uid, 'Kwame Asante', 'For FOMO — try keeping a "trades I didn''t take" log. Write down the setup, why you wanted to enter, and what happened. After a week you''ll see that most of those FOMO trades would have lost money. It cured my FOMO fast.', NOW() - interval '9 days' + interval '2 hours');

  -- Comments on P6 (S/R question)
  INSERT INTO forum_comments (post_id, user_id, author_name, content, created_at)
  VALUES
  (p6, seed_uid, 'PatientTrader', 'Great question. I treat close levels as a zone. In your AAPL example, I''d mark $185.50-$186.80 as a resistance zone rather than three separate lines. The course covers this more in the Week 2 material if I remember correctly.', NOW() - interval '15 days' + interval '4 hours'),
  (p6, seed_uid, 'Tobias Richter', 'Agreed on the zone approach. One thing that helped me: zoom out to the daily or weekly chart. The levels that matter most are the ones visible on higher timeframes. The tight cluster you described often acts as one area of supply.', NOW() - interval '14 days' + interval '6 hours');

  -- Comments on P7 (first week done)
  INSERT INTO forum_comments (post_id, user_id, author_name, content, created_at)
  VALUES
  (p7, seed_uid, 'Amara Okafor', 'Congrats on finishing week 1! The risk management section changed everything for me too. Wait until you get to Week 3 — the entry timing stuff builds on what you learned and makes it even more precise.', NOW() - interval '12 days' + interval '3 hours'),
  (p7, seed_uid, 'Lars van den Berg', 'Thanks! Yeah the position sizing formula alone saved me from what would have been a huge loss on TSLA last week. Before the course I would have been in with 500 shares instead of 150.', NOW() - interval '11 days' + interval '5 hours');

  -- Comments on P8 (halfway results)
  INSERT INTO forum_comments (post_id, user_id, author_name, content, created_at)
  VALUES
  (p8, seed_uid, 'Pieter de Vries', 'Really solid stats for halfway through! 61% with 2.3R average is already profitable. The journaling really compounds over time — by Day 30 you''ll have so much data on your tendencies.', NOW() - interval '7 days' + interval '5 hours'),
  (p8, seed_uid, 'Mei Lin Chen', 'Love that you shared the TSLA loss too. What rules did you break? I find that my biggest losses always come from breaking my own plan.', NOW() - interval '6 days' + interval '2 hours'),
  (p8, seed_uid, 'Yuki Tanaka', 'The TSLA loss was a counter-trend trade. The daily was clearly bearish but I saw what I thought was a reversal on the 5min chart. Lesson learned: always respect the higher timeframe trend, which is literally what Day 8 teaches. I just didn''t follow my own rules.', NOW() - interval '6 days' + interval '8 hours');

  -- Comments on P10 (NVDA trade)
  INSERT INTO forum_comments (post_id, user_id, author_name, content, created_at)
  VALUES
  (p10, seed_uid, 'Priya Sharma', 'Clean setup. The volume confirmation part is key — I''ve learned to never trust a breakout without at least 1.5x average volume. How did you determine the flag boundaries?', NOW() - interval '11 days' + interval '6 hours'),
  (p10, seed_uid, 'Hans Mueller', 'I drew the flag using the swing highs/lows of the consolidation period. The upper boundary connected the two lower highs, and the lower boundary connected the higher lows. When price broke above the upper boundary with a volume surge, that was my signal.', NOW() - interval '10 days' + interval '3 hours');

  -- Comments on P11 (worst trade)
  INSERT INTO forum_comments (post_id, user_id, author_name, content, created_at)
  VALUES
  (p11, seed_uid, 'Stefan Brouwer', 'Appreciate you sharing this. Counter-trend trades near earnings are a recipe for disaster — learned this the hard way myself. The position sizing rule is what saved you from a bigger loss.', NOW() - interval '8 days' + interval '4 hours'),
  (p11, seed_uid, 'Nicolla Pazzini', 'I have a rule now: no trades 3 days before earnings unless it''s a long-term swing position. Volatility expansion before earnings is unpredictable. Your experience is a great reminder.', NOW() - interval '7 days' + interval '2 hours');

  -- Comments on P13 (sideways trades)
  INSERT INTO forum_comments (post_id, user_id, author_name, content, created_at)
  VALUES
  (p13, seed_uid, 'SwingKing', 'I use a time stop. If a trade hasn''t moved 50% toward my target within 2-3 candles of my expected timeframe, I close it. A trade going sideways means my thesis is wrong or the timing is off. Either way, my capital can be better used elsewhere.', NOW() - interval '4 days' + interval '3 hours'),
  (p13, seed_uid, 'PatientTrader', 'It depends on the setup for me. If it''s a breakout trade and it''s chopping instead of running, I close. If it''s a mean reversion trade, I give it more time since those tend to be slower. Context matters.', NOW() - interval '4 days' + interval '7 hours'),
  (p13, seed_uid, 'Yuki Tanaka', 'The time stop idea is brilliant. Going to start tracking "time to target" in my journal. That data would help me know when to be patient vs when to cut.', NOW() - interval '3 days' + interval '1 hour');

  -- Comments on P15 (full-time job)
  INSERT INTO forum_comments (post_id, user_id, author_name, content, created_at)
  VALUES
  (p15, seed_uid, 'Tobias Richter', 'I work 8:30-5:30 and I focus entirely on swing trades. I do my analysis after market close, set alerts, and place limit orders before the next open. I check at lunch to manage open positions. Works great.', NOW() - interval '6 days' + interval '4 hours'),
  (p15, seed_uid, 'John Smith', 'Same situation here. What helped me was shifting to daily chart setups instead of intraday. You only need to check once or twice a day. The lessons from Week 3 of the challenge apply really well to swing trading.', NOW() - interval '5 days' + interval '6 hours'),
  (p15, seed_uid, 'Fatima Al-Rashid', 'Thanks for the tips! Swing trading sounds like the way to go. Going to focus on daily charts and set my alerts before work.', NOW() - interval '5 days' + interval '9 hours');

  -- Comments on P16 (30-day review)
  INSERT INTO forum_comments (post_id, user_id, author_name, content, created_at)
  VALUES
  (p16, seed_uid, 'Amara Okafor', 'Congrats on finishing! Your results mirror mine pretty closely. The -2% to +8% journey is real. What''s your plan now — are you starting over from Day 1 or just going live?', NOW() - interval '1 day' + interval '2 hours'),
  (p16, seed_uid, 'Lars van den Berg', 'Great review Pieter. I agree Week 3 was faster paced. Would have liked an extra day on the options material. But overall the challenge was absolutely worth it.', NOW() - interval '1 day' + interval '5 hours'),
  (p16, seed_uid, 'Pieter de Vries', 'Thanks! I''m going live with very small positions (25% of what my normal size would be) for the next month while I build confidence with real money. The plan is to scale up gradually.', NOW() - interval '22 hours');

  -- Comments on P18 (journaling)
  INSERT INTO forum_comments (post_id, user_id, author_name, content, created_at)
  VALUES
  (p18, seed_uid, 'Kwame Asante', 'The revenge trading pattern is super common. Once you see it in your data, you can''t unsee it. I added a rule: after a loss, I have to wait 30 minutes before taking another trade. Eliminated revenge trades almost entirely.', NOW() - interval '8 days' + interval '5 hours'),
  (p18, seed_uid, 'Priya Sharma', 'I noticed the same 10am-11:30am sweet spot! I think that''s when the initial market volatility settles and the real trends emerge. My journal shows the same pattern after 2 weeks of data.', NOW() - interval '8 days' + interval '9 hours');

  -- ============================================================
  -- UPDATE counters
  -- ============================================================
  UPDATE forum_posts SET comments_count = (
    SELECT COUNT(*) FROM forum_comments
    WHERE forum_comments.post_id = forum_posts.id AND forum_comments.status = 'published'
  ) WHERE id IN (p1,p2,p3,p4,p5,p6,p7,p8,p9,p10,p11,p12,p13,p14,p15,p16,p17,p18);

  -- Realistic view counts
  UPDATE forum_posts SET views_count = 47 WHERE id = p1;
  UPDATE forum_posts SET views_count = 23 WHERE id = p2;
  UPDATE forum_posts SET views_count = 31 WHERE id = p3;
  UPDATE forum_posts SET views_count = 38 WHERE id = p4;
  UPDATE forum_posts SET views_count = 19 WHERE id = p5;
  UPDATE forum_posts SET views_count = 15 WHERE id = p6;
  UPDATE forum_posts SET views_count = 26 WHERE id = p7;
  UPDATE forum_posts SET views_count = 34 WHERE id = p8;
  UPDATE forum_posts SET views_count = 12 WHERE id = p9;
  UPDATE forum_posts SET views_count = 28 WHERE id = p10;
  UPDATE forum_posts SET views_count = 22 WHERE id = p11;
  UPDATE forum_posts SET views_count = 18 WHERE id = p12;
  UPDATE forum_posts SET views_count = 21 WHERE id = p13;
  UPDATE forum_posts SET views_count = 25 WHERE id = p14;
  UPDATE forum_posts SET views_count = 29 WHERE id = p15;
  UPDATE forum_posts SET views_count = 41 WHERE id = p16;
  UPDATE forum_posts SET views_count = 16 WHERE id = p17;
  UPDATE forum_posts SET views_count = 20 WHERE id = p18;

  -- Realistic like counts
  UPDATE forum_posts SET likes_count = 12 WHERE id = p1;
  UPDATE forum_posts SET likes_count = 5 WHERE id = p2;
  UPDATE forum_posts SET likes_count = 4 WHERE id = p3;
  UPDATE forum_posts SET likes_count = 15 WHERE id = p4;
  UPDATE forum_posts SET likes_count = 3 WHERE id = p5;
  UPDATE forum_posts SET likes_count = 2 WHERE id = p6;
  UPDATE forum_posts SET likes_count = 8 WHERE id = p7;
  UPDATE forum_posts SET likes_count = 11 WHERE id = p8;
  UPDATE forum_posts SET likes_count = 6 WHERE id = p9;
  UPDATE forum_posts SET likes_count = 9 WHERE id = p10;
  UPDATE forum_posts SET likes_count = 7 WHERE id = p11;
  UPDATE forum_posts SET likes_count = 4 WHERE id = p12;
  UPDATE forum_posts SET likes_count = 5 WHERE id = p13;
  UPDATE forum_posts SET likes_count = 6 WHERE id = p14;
  UPDATE forum_posts SET likes_count = 10 WHERE id = p15;
  UPDATE forum_posts SET likes_count = 14 WHERE id = p16;
  UPDATE forum_posts SET likes_count = 3 WHERE id = p17;
  UPDATE forum_posts SET likes_count = 7 WHERE id = p18;

  RAISE NOTICE 'Forum seed data inserted: 18 posts, 35 comments';
END $$;
