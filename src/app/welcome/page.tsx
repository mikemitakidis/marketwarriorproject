import { requireProfile } from '@/lib/auth/guards';
import WelcomeForm from './welcome-form';
import fs from 'node:fs';
import path from 'node:path';

export default async function WelcomePage() {
  const { profile } = await requireProfile();

  // Long "Challenge Instructions" block (optional)
  // Stored as raw HTML so you can keep the template design 1:1.
  const instructionsPath = path.join(process.cwd(), 'src', 'content', 'welcome-instructions.html');
  const instructionsHtml = fs.existsSync(instructionsPath)
    ? fs.readFileSync(instructionsPath, 'utf8')
    : '';

  if (!profile.has_paid) {
    // Server redirect to /pay via dashboard gate, but welcome can also be direct
  }

  return (
    <main className="container">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Welcome</h1>
        <p style={{ opacity: .9 }}>
          Please complete the required steps below. This is mandatory before dashboard access.
        </p>

        {/* PASTE YOUR TEMPLATE MARKUP HERE (keep 1:1 design) */}

        <WelcomeForm instructionsHtml={instructionsHtml} />
      </div>
    </main>
  );
}
