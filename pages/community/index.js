import fs from 'fs';
import path from 'path';
import { useEffect } from 'react';
import { getServiceSupabase } from '../../lib/supabase';

/**
 * Community forum landing page.
 *
 * For this milestone we render the provided forum preview template and
 * hydrate it with a basic list of published posts from the database.  The
 * template is loaded from the `community_forum_preview.html` file included
 * in the handoff ZIP.  Posts are fetched server‑side using the service
 * role so that row level security policies are honoured.  This page is
 * intentionally minimal – it lists posts but does not yet support
 * creating posts, commenting, liking or admin moderation.  Those
 * features will be implemented in a future milestone.
 */
export async function getServerSideProps({ req, query }) {
  // Fetch published posts from the database.  We join categories so
  // that the category slug/name can be displayed.  Only posts with
  // status = 'published' are returned to end users.
  const supabase = getServiceSupabase();
  const { data: posts, error } = await supabase
    .from('forum_posts')
    .select(
      'id, title, author_name, created_at, likes_count, comments_count, views_count, day_number, is_pinned, forum_categories:category_id (slug, name)'
    )
    .eq('status', 'published')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch forum posts', error);
  }
  // Load the forum preview template HTML.  This file contains the full
  // markup and styling for the community forum as provided by the
  // customer.  See `/community_forum_preview/community_forum_preview.html`.
  const filePath = path.join(process.cwd(), 'community_forum_preview', 'community_forum_preview.html');
  let templateHtml = '';
  try {
    templateHtml = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    console.error('Failed to load community forum template', e);
  }
  return {
    props: {
      templateHtml,
      posts: posts || [],
    },
  };
}

export default function CommunityPage({ templateHtml, posts }) {
  useEffect(() => {
    // No client‑side hydration needed at this time.  Future enhancements
    // will add interactive behaviours.
  }, []);
  return (
    <div>
      {/* Render the static forum template for look and feel */}
      <div dangerouslySetInnerHTML={{ __html: templateHtml }} />
      {/* Render a basic list of posts below the preview.  In the future
          this list can be injected into the template itself. */}
      <div style={{ padding: '20px' }}>
        <h2 style={{ color: '#fff', marginBottom: '10px' }}>Recent Posts</h2>
        {posts && posts.length > 0 ? (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {posts.map((post) => {
              const category = post.forum_categories || {};
              const dayTag =
                category.slug === 'days-1-30' && post.day_number
                  ? ` • Day ${post.day_number}`
                  : '';
              return (
                <li key={post.id} style={{ marginBottom: '12px' }}>
                  <a href={`/community/post/${post.id}`} style={{ color: '#9cf', textDecoration: 'none' }}>
                    {post.title}
                  </a>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>
                    {post.author_name} · {category.name}
                    {dayTag}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p style={{ color: '#ccc' }}>No posts yet. Be the first to post!</p>
        )}
      </div>
    </div>
  );
}