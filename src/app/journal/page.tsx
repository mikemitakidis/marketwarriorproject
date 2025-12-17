import { gateDashboard, requireProfile } from '@/lib/auth/guards';
import fs from 'fs';
import path from 'path';

export default async function JournalPage() {
  await gateDashboard();
  await requireProfile();

  const filePath = path.join(process.cwd(), 'src', 'content', 'trading_journal.html');
  const html = fs.readFileSync(filePath, 'utf8');

  return (
    <main style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <iframe title="Trading Journal" srcDoc={html} style={{ width: '100%', height: '100%', border: 0 }} />
    </main>
  );
}
