'use client';

import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  return (
    <button
      className="btn"
      onClick={async () => {
        await supabase.auth.signOut();
        router.push('/login');
      }}
    >
      Sign out
    </button>
  );
}
