-- =============================================================
-- Additional Forum Posts & Comments (Batch 2)
-- Topics: Trading Journal + AI Coach, Day 2 + eToro, Affiliate,
--         Dividends & Copy Trading, + Day-specific posts
-- Uses same seed user_id as batch 1
-- =============================================================

DO $$
DECLARE
  seed_uid uuid := '1f40b7b9-329a-4d89-b8b8-2a09176fa7ea';
  cat_general int;
  cat_days int;
  cat_journal int;
  cat_other int;
  post_journal uuid := gen_random_uuid();
  post_day2 uuid := gen_random_uuid();
  post_affiliate uuid := gen_random_uuid();
  post_dividends uuid := gen_random_uuid();
  post_day11 uuid := gen_random_uuid();
  post_day20 uuid := gen_random_uuid();
  post_day23 uuid := gen_random_uuid();
BEGIN
  SELECT id INTO cat_general FROM forum_categories WHERE slug = 'general';
  SELECT id INTO cat_days FROM forum_categories WHERE slug = 'days-1-30';
  SELECT id INTO cat_journal FROM forum_categories WHERE slug = 'trading-journal';
  SELECT id INTO cat_other FROM forum_categories WHERE slug = 'other';

  -- ============================================================
  -- POST 1: Trading Journal + AI Chat Coach
  -- ============================================================
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, created_at)
  VALUES (post_journal, seed_uid, cat_journal, 'Sofia Martinez',
    'The Trading Journal changed everything for me',
    'I know this sounds dramatic but the Trading Journal feature is genuinely the most useful tool I''ve ever used for my trading. Before this I was tracking everything in a messy Google Sheet with no structure.

What I love about it:
- The dashboard gives me a clear overview of all my trades at a glance
- I can tag trades by strategy and see which setups actually make me money
- The analytics section helped me realize I was overtrading on Mondays

But the thing that REALLY blew my mind is the AI Chat Coach. I asked it to review my last 10 trades and it pointed out that I keep entering too early on breakout plays. It noticed the pattern across multiple trades that I completely missed myself. It''s like having a mentor available 24/7 who actually knows your trading history.

Has anyone else been using the AI Coach?',
    NOW() - interval '2 days');

  INSERT INTO forum_comments (post_id, user_id, author_name, content, created_at)
  VALUES
  (post_journal, seed_uid, 'Daniel Okonkwo', 'The AI Coach is brilliant. I asked it why my win rate drops on Fridays and it showed me I tend to rush trades before the weekend. Never would have caught that on my own.', NOW() - interval '2 days' + interval '3 hours'),
  (post_journal, seed_uid, 'Elena Petrova', 'Wait there''s an AI Coach? Where is it? I''ve been using the journal for logging trades but must have missed this.', NOW() - interval '2 days' + interval '5 hours'),
  (post_journal, seed_uid, 'Sofia Martinez', 'It''s in the left sidebar of the Trading Journal — look for "AI Coach". You can ask it anything about your trades, patterns, strategies. Once you start using it you won''t stop!', NOW() - interval '1 day' + interval '2 hours');

  -- ============================================================
  -- POST 2: Day 2 - Setting up platform, naturally mentions eToro
  -- ============================================================
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, day_number, created_at)
  VALUES (post_day2, seed_uid, cat_days, 'Marco Rossi',
    'Day 2 - Which platform did you set up?',
    'Just finished Day 2 about setting up a virtual/demo account. The lesson got me thinking about which platform to actually use going forward. I want to make sure I pick the right one from the start.

I ended up going with eToro. A friend recommended it and the interface is really beginner-friendly. They have a virtual portfolio so I can practice risk-free, plus the copy trading feature lets you see what top traders are doing which is great for learning.

What is everyone else using?',
    2,
    NOW() - interval '6 days');

  INSERT INTO forum_comments (post_id, user_id, author_name, content, created_at)
  VALUES
  (post_day2, seed_uid, 'Emma Wilson', 'I went with eToro too! The virtual portfolio is perfect for the challenge. Zero commission on stocks is a nice bonus when you eventually go live with small positions.', NOW() - interval '6 days' + interval '4 hours'),
  (post_day2, seed_uid, 'TraderMike', 'Same here. What sold me was the CopyTrader feature — even just studying what the Popular Investors are doing teaches you a lot about portfolio allocation and risk management.', NOW() - interval '5 days' + interval '2 hours'),
  (post_day2, seed_uid, 'Marco Rossi', 'Good to hear others picked eToro too. Just set up the virtual account — took about 10 minutes. On to Day 3!', NOW() - interval '5 days' + interval '6 hours');

  -- ============================================================
  -- POST 3: Affiliate Programme question
  -- ============================================================
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, created_at)
  VALUES (post_affiliate, seed_uid, cat_general, 'Anika Patel',
    'How does the Affiliate Programme work?',
    'I saw there''s an affiliate programme on the site and I''m curious how it works. I''ve already recommended Market Warrior to two friends just because I think the course is great, so figured I might as well ask about it.

How do you sign up? What commission do students get? Would love to know before I send my friends the link.',
    NOW() - interval '3 days');

  INSERT INTO forum_comments (post_id, user_id, author_name, content, created_at)
  VALUES
  (post_affiliate, seed_uid, 'Market Warrior Team', 'Great question Anika! As a verified student you get access to our Student Affiliate Programme with a 30% commission on every referral who signs up through your unique link.

How to get started:
1. Go to your dashboard and look for the "Become an Affiliate" link
2. Sign up through the affiliate portal — takes about 2 minutes
3. You''ll get a unique referral link to share with friends, on social media, wherever you like
4. Commissions are tracked automatically and payouts are processed regularly

Many students earn back the cost of their course just by sharing it with people they know. The best part is you''re recommending something you actually use and believe in!', NOW() - interval '3 days' + interval '1 hour'),
  (post_affiliate, seed_uid, 'Liam O''Brien', 'I signed up last month and already got my first referral. A colleague noticed my trading improving and asked what I was doing — shared my link and that was it. 30% is really generous.', NOW() - interval '3 days' + interval '5 hours'),
  (post_affiliate, seed_uid, 'Anika Patel', 'Thanks for explaining! Just signed up, super easy. Already sent my link to those two friends. 30% is way more than I expected!', NOW() - interval '2 days' + interval '3 hours');

  -- ============================================================
  -- POST 4: Dividends + Copy Trading
  -- ============================================================
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, created_at)
  VALUES (post_dividends, seed_uid, cat_journal, 'Isabella Santos',
    'Dividends + Copy Trading - anyone using both strategies?',
    'I''ve been going through the Trading Journal and noticed the Popular Investors section with the copy trading feature. Some of the top traders have really impressive track records — consistent gains and thousands of copiers.

It got me thinking about combining two approaches:
1. Active trading using what we learn in the challenge
2. A passive portfolio of dividend stocks + copying successful traders from the Popular Investors list

For dividends I''m looking at reliable payers like KO, JNJ, PG, SCHD. And then using copy trading to get exposure to strategies I haven''t mastered yet.

Anyone doing something similar?',
    NOW() - interval '4 days');

  INSERT INTO forum_comments (post_id, user_id, author_name, content, created_at)
  VALUES
  (post_dividends, seed_uid, 'Ravi Kapoor', 'This is exactly what I do. 60% active swing trades, 40% dividend + copy portfolio. The dividend stocks give me peace of mind while the copy traders expose me to different strategies. From the Popular Investors I follow a couple with low risk scores and steady gains — great learning experience.', NOW() - interval '4 days' + interval '4 hours'),
  (post_dividends, seed_uid, 'CandlestickKid', 'Dividends are great for long-term compounding. My dividend portfolio is on autopilot — I add monthly and reinvest everything. Frees me up to focus on active setups from the challenge. The Popular Investors page is underrated, even if you don''t copy anyone just studying their portfolios is educational.', NOW() - interval '3 days' + interval '3 hours'),
  (post_dividends, seed_uid, 'Isabella Santos', 'Great replies, thanks! Going to check the Popular Investors page more carefully and pick 1-2 traders with solid long-term records. Dividends for income, copy trading for diversified growth, plus active trading from the challenge. Feels like a solid plan.', NOW() - interval '3 days' + interval '7 hours');

  -- ============================================================
  -- POST 5: Day 11 - RSI, MACD & Indicators
  -- ============================================================
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, day_number, created_at)
  VALUES (post_day11, seed_uid, cat_days, 'Takeshi Yamamoto',
    'Day 11 - RSI and MACD finally make sense',
    'I''ve seen RSI and MACD mentioned everywhere on YouTube and Twitter but never properly understood how to use them until today. The way Day 11 explains these indicators in context of the economic cycle really clicked for me.

Two things that stood out:
- RSI isn''t just "overbought/oversold" — the divergences are where the real edge is
- MACD histogram showing momentum shifts before the crossover happens

I backtested a simple RSI divergence + MACD confirmation on AAPL over the last 3 months and found 4 solid setups. Starting to see how these indicators complement the chart patterns from Day 10.

Anyone else finding this week''s material connecting the dots?',
    11,
    NOW() - interval '8 days');

  INSERT INTO forum_comments (post_id, user_id, author_name, content, created_at)
  VALUES
  (post_day11, seed_uid, 'ActiveTrader88', 'Day 11 was a turning point for me too. I always used RSI wrong — just buying when it hit 30 and selling at 70. The divergence strategy is so much more reliable. Combined with the moving averages from Day 9, I finally have a proper system.', NOW() - interval '8 days' + interval '5 hours'),
  (post_day11, seed_uid, 'Emma Wilson', 'The economic cycle part was really eye-opening. Understanding WHICH indicators work better in different market phases makes a huge difference. Great that you''re already backtesting — that''s exactly what Day 18 will cover in more depth!', NOW() - interval '7 days' + interval '3 hours');

  -- ============================================================
  -- POST 6: Day 20 - Trading Psychology
  -- ============================================================
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, day_number, created_at)
  VALUES (post_day20, seed_uid, cat_days, 'Elena Petrova',
    'Day 20 - Trading Psychology hit me hard',
    'Not going to lie, Day 20 was an emotional one. The lesson on emotional mastery made me realise that 80% of my losses come from psychological mistakes, not bad analysis.

My biggest takeaways:
- Revenge trading after a loss is my worst habit. The lesson explained the neuroscience behind it and now I understand WHY I do it
- Fear of missing out makes me enter trades too early before confirmation
- I need to treat trading like a business, not entertainment

I''ve printed out the checklist from the lesson and taped it next to my monitor. Going to read it before every trading session. Has anyone else had that moment where you realise your emotions are the real enemy, not the market?',
    20,
    NOW() - interval '5 days');

  INSERT INTO forum_comments (post_id, user_id, author_name, content, created_at)
  VALUES
  (post_day20, seed_uid, 'Liam O''Brien', 'Day 20 was the most important lesson in the entire course for me. I had all the technical knowledge but kept losing money because of emotional decisions. The breathing technique before placing trades sounds silly but it actually works — forces you to slow down.', NOW() - interval '5 days' + interval '4 hours'),
  (post_day20, seed_uid, 'Daniel Okonkwo', 'Same here. The revenge trading section hit home. I lost 3 weeks of gains in one angry afternoon last month. Now I have a rule: after any loss I close the charts for 30 minutes minimum. Simple but effective.', NOW() - interval '4 days' + interval '2 hours');

  -- ============================================================
  -- POST 7: Day 23 - Copy Trading & Hedge Funds
  -- ============================================================
  INSERT INTO forum_posts (id, user_id, category_id, author_name, title, content, day_number, created_at)
  VALUES (post_day23, seed_uid, cat_days, 'ActiveTrader88',
    'Day 23 - Copy Trading is more strategic than I thought',
    'I used to think copy trading was just lazy investing, but Day 23 changed my perspective. The lesson about hedge fund strategies and how copy trading platforms give retail traders access to similar diversification was really interesting.

The key insight for me: you don''t just blindly copy someone. You research their strategy, risk score, drawdown history, and how long they''ve been profitable. Then you allocate a portion of your portfolio — not everything.

Checked the Popular Investors on the Trading Journal and there are traders with 4+ years of consistent performance and 20,000+ copiers. That kind of track record tells you something.

Anyone already using copy trading as part of their strategy?',
    23,
    NOW() - interval '3 days');

  INSERT INTO forum_comments (post_id, user_id, author_name, content, created_at)
  VALUES
  (post_day23, seed_uid, 'Ravi Kapoor', 'I allocate about 20% of my portfolio to copy trading and the rest to my own active trades. It''s a great way to stay diversified while you''re still building your own skills. The Popular Investors with low risk scores (3-4) and steady returns are the ones to focus on.', NOW() - interval '3 days' + interval '3 hours'),
  (post_day23, seed_uid, 'Takeshi Yamamoto', 'Good point about not blindly copying. I spend time studying WHY the top investors make certain trades — it''s like getting a free masterclass in portfolio management. Day 23 really opened my eyes to using it as a learning tool, not just passive income.', NOW() - interval '2 days' + interval '5 hours');

  -- ============================================================
  -- UPDATE counters, views, likes
  -- ============================================================
  UPDATE forum_posts SET comments_count = (
    SELECT COUNT(*) FROM forum_comments
    WHERE forum_comments.post_id = forum_posts.id AND forum_comments.status = 'published'
  ) WHERE id IN (post_journal, post_day2, post_affiliate, post_dividends, post_day11, post_day20, post_day23);

  UPDATE forum_posts SET views_count = 32 WHERE id = post_journal;
  UPDATE forum_posts SET views_count = 19 WHERE id = post_day2;
  UPDATE forum_posts SET views_count = 38 WHERE id = post_affiliate;
  UPDATE forum_posts SET views_count = 25 WHERE id = post_dividends;
  UPDATE forum_posts SET views_count = 21 WHERE id = post_day11;
  UPDATE forum_posts SET views_count = 34 WHERE id = post_day20;
  UPDATE forum_posts SET views_count = 17 WHERE id = post_day23;

  UPDATE forum_posts SET likes_count = 9 WHERE id = post_journal;
  UPDATE forum_posts SET likes_count = 5 WHERE id = post_day2;
  UPDATE forum_posts SET likes_count = 11 WHERE id = post_affiliate;
  UPDATE forum_posts SET likes_count = 7 WHERE id = post_dividends;
  UPDATE forum_posts SET likes_count = 6 WHERE id = post_day11;
  UPDATE forum_posts SET likes_count = 13 WHERE id = post_day20;
  UPDATE forum_posts SET likes_count = 4 WHERE id = post_day23;

  RAISE NOTICE 'Additional forum posts inserted: 7 posts, 18 comments';
END $$;
