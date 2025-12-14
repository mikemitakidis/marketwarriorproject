'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('has_paid, agreed_to_terms')
          .eq('user_id', user.id)
          .single();
          
        if (profile?.has_paid && profile?.agreed_to_terms) {
          router.push('/dashboard');
        } else if (profile?.has_paid) {
          router.push('/welcome');
        } else {
          router.push('/checkout');
        }
      } else {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
      <div className="spinner" />
    </div>
  );
}
