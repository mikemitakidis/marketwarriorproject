import { requireProfile } from '@/lib/auth/guards';
import PayButton from './pay-button';

export default async function PayPage() {
  const { profile } = await requireProfile();

  if (profile.has_paid) {
    // Already paid -> welcome or dashboard gate will handle.
  }

  return (
    <main className="container">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Payment</h1>
        <p style={{ opacity: .9 }}>
          Payment is required before you can access the challenge.
        </p>

        {/* PASTE YOUR TEMPLATE MARKUP HERE (keep 1:1 design) */}

        <PayButton />
      </div>
    </main>
  );
}
