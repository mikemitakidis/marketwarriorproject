import { requireProfile } from '@/lib/auth/guards';
import AffiliateClient from './ui';

export default async function AffiliatePage() {
  const { profile } = await requireProfile();

  return (
    <main className="container">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Affiliate</h1>
        <p style={{ opacity: .9 }}>
          Paid members earn 30% commission by default. Affiliate-only users earn 25% by default (admin adjustable).
        </p>

        {/* PASTE YOUR TEMPLATE MARKUP HERE (keep 1:1 design) */}

        <AffiliateClient profile={profile} />
      </div>
    </main>
  );
}
