import Head from 'next/head';
import { getUserFromRequest, getServiceSupabase } from '../../lib/serverAuth';
import logger from '../../lib/logger';

/**
 * Admin Forum Moderation Page.
 *
 * Lists all forum threads for admin moderation.
 * Only users with is_admin=true can access this page.
 */
export async function getServerSideProps({ req }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return { redirect: { destination: '/login', permanent: false } };
    }

    const supabase = getServiceSupabase();

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return {
        props: { accessDenied: true, threads: [] },
      };
    }

    // Fetch all threads with author info
    const { data: threads, error } = await supabase
      .from('forum_threads')
      .select(`
        id,
        title,
        body,
        is_pinned,
        is_locked,
        created_at,
        author:author_id (full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching threads:', error);
      throw new Error(error.message);
    }

    return {
      props: {
        accessDenied: false,
        threads: (threads || []).map(t => ({
          ...t,
          authorName: t.author?.full_name || 'Anonymous',
        })),
      },
    };
  } catch (err) {
    logger.error('Admin forum error:', err);
    return {
      props: { accessDenied: true, threads: [] },
    };
  }
}

export default function AdminForumPage({ threads, accessDenied }) {
  if (accessDenied) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
        background: '#0f172a',
        color: 'white',
        minHeight: '100vh'
      }}>
        <h1>Access Denied</h1>
        <p style={{ color: '#94a3b8' }}>You do not have permission to access this page.</p>
        <a href="/dashboard" style={{ color: '#667eea' }}>Return to Dashboard</a>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Forum Moderation - Admin - Market Warrior</title>
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0f172a;
          color: white;
          min-height: 100vh;
        }
      `}</style>

      <style jsx>{`
        .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
        .header { margin-bottom: 24px; }
        .back-link { color: #667eea; text-decoration: none; }
        h1 { margin-top: 16px; font-size: 2rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #334155; }
        th { background: #1e293b; color: #94a3b8; font-weight: 600; }
        tr:hover { background: #1e293b; }
        .link { color: #667eea; text-decoration: none; }
        .link:hover { text-decoration: underline; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; }
        .badge-pinned { background: #fbbf24; color: #78350f; }
        .badge-locked { background: #64748b; color: white; }
        .note { margin-top: 24px; color: #64748b; font-size: 0.875rem; }
      `}</style>

      <div className="container">
        <div className="header">
          <a href="/admin" className="back-link">← Admin Dashboard</a>
          <h1>Forum Moderation</h1>
        </div>

        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {threads && threads.length > 0 ? (
              threads.map((thread) => (
                <tr key={thread.id}>
                  <td>
                    <a href={`/community/post/${thread.id}`} className="link">
                      {thread.title}
                    </a>
                  </td>
                  <td>{thread.authorName}</td>
                  <td>
                    {thread.is_pinned && <span className="badge badge-pinned">📌 Pinned</span>}
                    {' '}
                    {thread.is_locked && <span className="badge badge-locked">🔒 Locked</span>}
                    {!thread.is_pinned && !thread.is_locked && <span style={{ color: '#64748b' }}>Normal</span>}
                  </td>
                  <td>{new Date(thread.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>
                  No threads found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <p className="note">
          Note: Moderation actions (pin, lock, delete) will be added in a future update.
        </p>
      </div>
    </>
  );
}
