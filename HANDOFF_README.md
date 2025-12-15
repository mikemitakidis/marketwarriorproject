# Market Warrior – Developer Handoff (How to find everything)

## Quick start (easiest for you)
1) Upload **this single file** to GitHub (repo root):
- `Market_Warrior_Master_Handoff_Bundle_v3.zip`

2) Also upload (optional but helpful):
- `Market_Warrior_Master_Handoff_Pack_v3.pdf`
- `Market_Warrior_Master_Handoff_Pack_v3.docx`

3) Create a file in GitHub repo root called:
- `HANDOFF_README.md`

Paste the instructions below (the same as this file), so the developer can immediately see what to do.

> Important: **Do NOT upload any secrets** (Supabase service key, Stripe keys, Resend keys, DB password). Keep secrets only in Vercel / Supabase.

---

## Where everything is inside the ZIP (developer map)

After downloading and unzipping `Market_Warrior_Master_Handoff_Bundle_v3.zip`, the developer will find:

### 1) Specs (business + technical)
- `docs/specs/Proposal - Market Warrior.docx`
- `docs/specs/Market_Warrior_Technical_Specification_.docx`
- `docs/specs/Admin panel specs.docx`

### 2) Master handoff document (task list + priorities)
- `docs/handoff/Market_Warrior_Master_Handoff_Pack_v3.pdf`
- `docs/handoff/Market_Warrior_Master_Handoff_Pack_v3.docx`

### 3) UI templates that must be matched (pixel/structure)
- `templates/html/dashboard.html`
- `templates/html/admin-panel-enhanced.html`

> Requirement: these templates must be kept visually consistent, but wired to the new secure APIs and database.

### 4) Day 1–30 course content (HTML)
- `content/days-zips/market_warrior_days_content.zip`

> These are the raw lesson/task HTML. Quizzes must be stored server-side (do not ship correct answers to client).

### 5) Supabase exports (current schema/policies snapshot)
- `supabase/exports/` contains:
  - Table/column inventory CSVs
  - RLS policy CSVs
  - Additional query exports

### 6) Supabase migrations (starting point)
- `supabase/migrations/001_init.sql`

### 7) Current + historical code snapshots
- `archive/zips/market-warrior-14.12.2025 05.19.zip` (latest developer build provided)
- `archive/zips/market-warrior-nextjs-13.12.2025 23.10.zip` (previous build)
- `archive/zips/market-warrior-step1-fixed.zip` (security-focused reference build)

### 8) Developer notes / env template
- `developer-notes/.env.example`
- `developer-notes/DEVELOPER_TASKLIST.md`

---

## Vercel environment variables (do not store in GitHub)
Vercel currently uses:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`

> If a **new Supabase project** is created, you will need **new values** for:
> `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`.

---

## Notes about moving to a NEW Supabase project
- Yes, new Supabase project = **new API keys** and a new URL.
- Supabase Auth SMTP settings are **per project**. If you used Google Workspace or Resend SMTP, configure SMTP again in the new project.
- Recommended: create a clean schema + RLS from migrations (avoid “patching” messy RLS).
- 
---

## Trade Journal code
- Download: `trade_journal_code.zip` (repo root)
- Purpose: Trading Journal module (user can log trades; stored in Supabase `trading_journal` table)
- DB table already exists: `public.trading_journal`


---

## Contact / reference links (owner provided separately)
- Supabase project (current): gvpaemdpmwyncdztlczy
- GitHub repo: mikemitakidis/marketwarriorproject
- Vercel project: marketwarriorproject
- Stripe product: prod_TWtuQ72mY4csdx
- Domain: marketwarrior.club
- Support email: support@marketwarrior.club
