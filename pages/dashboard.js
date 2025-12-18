import fs from 'fs';
import path from 'path';
import { getServiceSupabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { getUserFromRequest } from '../lib/serverAuth';

/**
 * Dashboard page.
 *
 * This page renders the provided dashboard template and overlays
 * dynamic content such as progress, unlocked days, and journal
 * integration.  The page uses `getServerSideProps` to verify the
 * user session and fetch the user's progress on the server before
 * rendering.  Client‑side code can then hydrate additional data.
 */
export async function getServerSideProps({ req }) {
  try {
    // Validate user from cookies/JWT
    const user = await getUserFromRequest(req);
    if (!user) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }

    const supabase = getServiceSupabase();

    // Fetch progress for the user
    const { data: progressRows, error } = await supabase
      .from('challenge_progress')
      .select('day, unlocked, completed, completed_at, quiz_passed')
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to load progress:', error);
    }

    // Determine which days are unlocked and completed
    const rows = progressRows || [];
    const unlockedDays = rows
      .filter((r) => r.unlocked)
      .map((r) => r.day);
    const completedDays = rows
      .filter((r) => r.completed)
      .map((r) => r.day);

    // Load dashboard template
    const filePath = path.join(process.cwd(), 'templates', 'dashboard.html');
    const html = fs.readFileSync(filePath, 'utf8');

    return {
      props: {
        html,
        unlockedDays,
        completedDays,
      },
    };
  } catch (err) {
    console.error('Dashboard error:', err);
    // Redirect unauthenticated users to login
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }
}

export default function DashboardPage({ html, unlockedDays = [], completedDays = [] }) {
  // Wire up action card links after render.
  useEffect(() => {
    // Continue Learning: direct user to the first incomplete day
    if (Array.isArray(unlockedDays) && unlockedDays.length > 0) {
      const sorted = [...unlockedDays].sort((a, b) => a - b);
      // Find first day that is unlocked but not completed
      const firstIncomplete = sorted.find((d) => !completedDays.includes(d));
      const dayToGo = firstIncomplete || sorted[sorted.length - 1];
      const cont = document.getElementById('continueBtn');
      if (cont) cont.setAttribute('href', `/day/${dayToGo}`);
    }
    // Journal link: go to paid journal for authenticated users
    const journalLink = document.querySelector('a.action-card[href="trading-journal.html"]');
    if (journalLink) journalLink.setAttribute('href', '/journal');
    // Community link: enable community route
    const communityLink = document.querySelector('a.action-card:nth-of-type(3)');
    if (communityLink) communityLink.setAttribute('href', '/community');
  }, [unlockedDays, completedDays]);

  return (
    <div>
      {/* Render the static dashboard markup */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}