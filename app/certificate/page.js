'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function CertificatePage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single();
      if (!profile?.course_completed) { router.push('/dashboard'); return; }
      
      setProfile(profile);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea, #764ba2)', padding: '40px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '60px', maxWidth: '800px', width: '100%', textAlign: 'center', boxShadow: '0 30px 80px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎓</div>
        <h1 style={{ fontSize: '2.5em', color: '#1e293b', marginBottom: '10px' }}>Certificate of Completion</h1>
        <p style={{ color: '#64748b', marginBottom: '30px' }}>This certifies that</p>
        <h2 style={{ fontSize: '2.5em', color: '#667eea', marginBottom: '20px' }}>{profile?.full_name}</h2>
        <p style={{ color: '#64748b', marginBottom: '30px' }}>has successfully completed the</p>
        <h3 style={{ fontSize: '1.5em', color: '#1e293b', marginBottom: '30px' }}>Market Warrior 30-Day Trading Challenge</h3>
        <p style={{ color: '#64748b' }}>Completed on: {new Date(profile?.course_completed_at).toLocaleDateString()}</p>
      </div>
    </div>
  );
}
