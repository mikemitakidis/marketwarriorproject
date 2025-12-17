import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type UserProfile = {
  user_id: string;
  full_name: string | null;
  full_name_locked?: boolean;
  role: 'user' | 'admin';
  has_paid: boolean;
  paid_at: string | null;
  welcome_completed: boolean;
  welcome_completed_at: string | null;
  terms_accepted_at: string | null;
  referred_by_code: string | null;
};

export async function requireUser() {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) redirect('/login');

  // Email confirmation gate
  // Supabase returns `email_confirmed_at` for email users.
  const emailConfirmedAt = (user as any).email_confirmed_at ?? (user as any).confirmed_at ?? null;
  if (!emailConfirmedAt) redirect('/check-email');

  return { supabase, user };
}

export async function requireProfile() {
  const { supabase, user } = await requireUser();

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !profile) {
    // If trigger failed for any reason, force logout-friendly redirect.
    redirect('/login?e=profile_missing');
  }

  return { supabase, user, profile: profile as UserProfile };
}

export async function gateDashboard() {
  const { profile } = await requireProfile();

  if (!profile.has_paid) redirect('/pay');
  if (!profile.welcome_completed) redirect('/welcome');
}

export async function requireAdmin() {
  const { profile } = await requireProfile();
  if (profile.role !== 'admin') redirect('/dashboard');
}
