-- =============================================================
-- Add missing database indexes for performance
-- Safe to run multiple times (IF NOT EXISTS)
-- =============================================================

-- user_profiles: stripe_customer_id is queried in getGateStatus() fallback
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id
  ON user_profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- forum_posts: user_id is used for filtering by author, admin lookups
CREATE INDEX IF NOT EXISTS idx_forum_posts_user_id
  ON forum_posts (user_id);

-- forum_comments: user_id is used for "my comments" lookups
CREATE INDEX IF NOT EXISTS idx_forum_comments_user_id
  ON forum_comments (user_id);
