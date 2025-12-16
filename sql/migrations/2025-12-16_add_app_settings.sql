-- Migration: add app_settings table for Stripe price ID and other settings

-- Create the app_settings table if it does not already exist.  This
-- table stores key/value pairs for global configuration.  It is
-- safe to run this migration repeatedly because the `create table`
-- statement uses `if not exists` and the upsert will not
-- duplicate rows.
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Ensure RLS is enabled and only the service role can read/write
alter table public.app_settings enable row level security;
create policy if not exists "Service role accesses app settings" on public.app_settings
  for all using ( auth.role() = 'service_role' );

-- Insert a default stripe_price_id if one does not exist.  Replace
-- 'price_default' with your actual price ID or run a separate
-- upsert via API/Admin panel to set the correct value.
insert into public.app_settings(key, value)
  values ('stripe_price_id', coalesce(current_setting('app.stripe_price_id', true), 'price_default'))
  on conflict (key) do nothing;