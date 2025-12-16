import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { getServiceSupabase } from '../../../lib/supabase';

/**
 * Single post view.
 *
 * Displays full post content and comments.  This implementation is
 * intentionally simple and does not yet support creating comments or
 * liking posts/comments.  Future milestones will add those features.
 */
export async function getServerSideProps({ params }) {
  const supabase = getServiceSupabase();
  const { id } = params;
  // Fetch post with its category
  const { data: post, error } = await supabase
    .from('forum_posts')
    .select(
      'id, title, content, author_name, created_at, likes_count, comments_count, views_count, day_number, is_pinned, forum_categories:category_id (slug, name)'
    )
    .eq('id', id)
    .single();
  if (error || !post) {
    return {
      notFound: true,
    };
  }
  // Fetch comments for the post (published only)
  const { data: comments } = await supabase
    .from('forum_comments')
    .select('id, author_name, content, likes_count, created_at')
    .eq('post_id', id)
    .eq('status', 'published')
    .order('created_at', { ascending: true });
  return {
    props: {
      post,
      comments: comments || [],
    },
  };
}

export default function PostPage({ post, comments }) {
  const dayTag =
    post.forum_categories?.slug === 'days-1-30' && post.day_number
      ? `Day ${post.day_number}`
      : null;
  return (
    <div style={{ padding: '20px', color: '#e0e0e0', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
      <h1 style={{ marginBottom: '10px' }}>{post.title}</h1>
      <p style={{ fontSize: '14px', color: '#aaa' }}>
        {post.author_name} · {post.forum_categories?.name} {dayTag ? `• ${dayTag}` : ''} ·{' '}
        {new Date(post.created_at).toLocaleDateString()}
      </p>
      <div
        style={{ marginTop: '20px', lineHeight: 1.6 }}
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
      <div style={{ marginTop: '30px' }}>
        <h3>Comments</h3>
        {comments.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {comments.map((c) => (
              <li key={c.id} style={{ marginBottom: '15px' }}>
                <div style={{ fontWeight: '600' }}>{c.author_name}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>{new Date(c.created_at).toLocaleString()}</div>
                <p style={{ marginTop: '4px' }}>{c.content}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No comments yet.</p>
        )}
      </div>
    </div>
  );
}