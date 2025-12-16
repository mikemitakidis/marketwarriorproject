import { useEffect, useState } from 'react';
import { getUserFromJwt, getUserProfile } from '../../lib/auth';
import { getServiceSupabase } from '../../lib/supabase';

/**
 * Admin Forum Moderation Page.
 *
 * This page lists all forum posts with their statuses and allows
 * administrators to moderate them.  Only users with is_admin=true are
 * permitted to access this page.  Non‑admins will see an access
 * denied message.  The UI is intentionally simple and does not yet
 * implement full moderation actions; it is a foundation for future
 * development.
 */
export async function getServerSideProps({ req }) {
  try {
    const user = await getUserFromJwt(req);
    const profile = await getUserProfile(user.id);
    if (!profile || !profile.is_admin) {
      return {
        props: {
          accessDenied: true,
        },
      };
    }
    // Fetch all posts with their statuses for admin overview
    const supabase = getServiceSupabase();
    const { data: posts, error } = await supabase
      .from('forum_posts')
      .select(
        'id, title, author_name, status, is_pinned, is_locked, created_at, forum_categories:category_id(name)'
      )
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return {
      props: {
        posts,
        accessDenied: false,
      },
    };
  } catch (err) {
    console.error(err);
    return {
      props: {
        accessDenied: true,
      },
    };
  }
}

export default function AdminForumPage({ posts, accessDenied }) {
  if (accessDenied) {
    return <div style={{ padding: '20px' }}>Access Denied</div>;
  }
  return (
    <div style={{ padding: '20px', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
      <h1>Forum Moderation</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ background: '#333', color: '#fff' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>Title</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Author</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Category</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
            <th style={{ padding: '10px' }}>Pinned</th>
            <th style={{ padding: '10px' }}>Locked</th>
            <th style={{ padding: '10px' }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {posts && posts.length > 0 ? (
            posts.map((post) => (
              <tr key={post.id} style={{ borderBottom: '1px solid #444' }}>
                <td style={{ padding: '10px' }}>
                  <a href={`/community/post/${post.id}`} style={{ color: '#89c9f9' }}>
                    {post.title}
                  </a>
                </td>
                <td style={{ padding: '10px' }}>{post.author_name}</td>
                <td style={{ padding: '10px' }}>{post.forum_categories?.name}</td>
                <td style={{ padding: '10px' }}>{post.status}</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>{post.is_pinned ? '📌' : ''}</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>{post.is_locked ? '🔒' : ''}</td>
                <td style={{ padding: '10px' }}>{new Date(post.created_at).toLocaleDateString()}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} style={{ padding: '10px' }}>No posts found</td>
            </tr>
          )}
        </tbody>
      </table>
      <p style={{ marginTop: '20px', fontSize: '14px', color: '#999' }}>
        Note: Moderation actions (pin, lock, hide, delete) will be added in a future milestone.
      </p>
    </div>
  );
}