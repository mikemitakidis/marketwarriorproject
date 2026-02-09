-- Create a database function for atomic post deletion
-- This ensures all related data is deleted in a single transaction
-- preventing orphaned data if any individual delete fails

CREATE OR REPLACE FUNCTION delete_forum_post(p_post_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Verify the post exists and get its owner
  SELECT user_id INTO v_post_user_id
  FROM forum_posts
  WHERE id = p_post_id;

  IF v_post_user_id IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  -- Check if user is admin
  SELECT is_admin INTO v_is_admin
  FROM user_profiles
  WHERE id = p_user_id;

  -- Only allow deletion by post owner or admin
  IF v_post_user_id != p_user_id AND (v_is_admin IS NULL OR v_is_admin = FALSE) THEN
    RAISE EXCEPTION 'Not authorized to delete this post';
  END IF;

  -- Delete all related data in a single transaction
  -- 1. Delete reports on comments of this post
  DELETE FROM forum_reports
  WHERE comment_id IN (SELECT id FROM forum_comments WHERE post_id = p_post_id);

  -- 2. Delete likes on comments of this post
  DELETE FROM forum_comment_likes
  WHERE comment_id IN (SELECT id FROM forum_comments WHERE post_id = p_post_id);

  -- 3. Delete reports on the post itself
  DELETE FROM forum_reports WHERE post_id = p_post_id;

  -- 4. Delete post likes
  DELETE FROM forum_post_likes WHERE post_id = p_post_id;

  -- 5. Delete post views
  DELETE FROM forum_post_views WHERE post_id = p_post_id;

  -- 6. Delete comments
  DELETE FROM forum_comments WHERE post_id = p_post_id;

  -- 7. Delete the post itself
  DELETE FROM forum_posts WHERE id = p_post_id;

  RETURN TRUE;
END;
$$;
