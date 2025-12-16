import fs from 'fs';
import path from 'path';
import { getServiceSupabase } from '../lib/supabase';
import { supabaseClient } from '../lib/supabase';
import { getUserFromJwt, getUserProfile } from '../lib/auth';
import { useEffect, useState } from 'react';

/**
 * Dashboard page.
 *
 * This page renders the provided dashboard template and overlays
 * dynamic content such as progress, unlocked days, and journal
 * integration.  The page uses `getServerSideProps` to verify the
 * Supabase JWT and fetch the user’s progress on the server before
 * rendering.  Client‑side code can then hydrate additional data.
 */
export async function getServerSideProps({ req }) {
  try {
    // Validate JWT and get user id
    const user = await getUserFromJwt(req);
    const supabase = getServiceSupabase();
    // Fetch progress for the user
    const { data: progressRows, error } = await supabase
      .from('challenge_progress')
      .select('day, available_at, completed_at, quiz_passed')
      .eq('user_id', user.id);
    if (error) throw new Error('Failed to load progress');
    // Determine which days are unlocked
    const nowIso = new Date().toISOString();
    const unlockedDays = progressRows
      .filter((r) => r.available_at && r.available_at <= nowIso)
      .map((r) => r.day);
    const completedDays = progressRows
      .filter((r) => r.completed_at)
      .map((r) => r.day);
    const nextUnlockTime = (() => {
      const futureRows = progressRows.filter((r) => r.available_at && r.available_at > nowIso);
      if (futureRows.length === 0) return null;
      futureRows.sort((a, b) => (a.available_at > b.available_at ? 1 : -1));
      return futureRows[0].available_at;
    })();
    // Load dashboard template
    const filePath = path.join(process.cwd(), 'templates', 'dashboard.html');
    const html = fs.readFileSync(filePath, 'utf8');
    return {
      props: {
        html,
        unlockedDays,
        completedDays,
        nextUnlockTime,
      },
    };
  } catch (err) {
    console.error(err);
    // Redirect unauthenticated users to login
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }
}

export default function DashboardPage({ html, unlockedDays, completedDays, nextUnlockTime }) {
  // Additional client‑side state could be managed here (e.g. journal entries)
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
      {/* Example: display progress at the bottom */}
      <div style={{ padding: '20px', background: '#f9fafb' }}>
        <h2>Your Progress</h2>
        <p>Completed days: {completedDays.join(', ') || 'None'}</p>
        <p>Unlocked days: {unlockedDays.join(', ')}</p>
        {nextUnlockTime && <p>Next unlock at: {nextUnlockTime}</p>}
      </div>
    </div>
  );
}