import { requireAdmin, requireProfile } from '@/lib/auth/guards';
import AdminClient from './ui';

export default async function AdminPage() {
  await requireAdmin();
  const { profile } = await requireProfile();

  return (
    <main className="container">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Admin</h1>
        <p style={{ opacity: .9 }}>
          Signed in as: {profile.full_name ?? 'Admin'}.
        </p>

        {/* PASTE YOUR TEMPLATE MARKUP HERE (keep 1:1 design) */}

        <AdminClient />
      </div>
    </main>
  );
}
