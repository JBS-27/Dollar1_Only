-- =============================================================================
-- $1 Only — privacy-first live data
-- Run this in the Supabase SQL editor (or supabase db push).
-- Stores ONLY: country, time, method, receipt hash.
-- No names, emails, IPs, or payment account identifiers in the public table.
-- =============================================================================

create table if not exists public.live_signals (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  created_at timestamptz not null default now(),
  payment_method text not null check (payment_method in ('stripe', 'upi', 'demo')),
  receipt_hash text not null unique
);

create table if not exists public.receipt_index (
  receipt_hash text primary key references public.live_signals (receipt_hash) on delete cascade,
  stripe_session_id text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists live_signals_country_idx on public.live_signals (country_code);
create index if not exists live_signals_created_idx on public.live_signals (created_at desc);

alter table public.live_signals enable row level security;
alter table public.receipt_index enable row level security;

-- Browser may read the public signal (country + hash). Never the Stripe session id.
drop policy if exists "public read signals" on public.live_signals;
create policy "public read signals"
  on public.live_signals
  for select
  to anon, authenticated
  using (true);

-- Inserts are service-role only (webhook / API). No public writes.
drop policy if exists "no public write signals" on public.live_signals;
-- absence of insert/update/delete policies + RLS = blocked for anon

drop policy if exists "no public read receipts" on public.receipt_index;
-- receipt_index has no select policy for anon, so session ids stay private

-- Realtime: every visitor sees a new $1 pin the moment a row lands.
alter publication supabase_realtime add table public.live_signals;

-- Optional preview seed (uncomment to light a few countries before launch)
-- insert into public.live_signals (country_code, payment_method, receipt_hash)
-- values
--   ('IN', 'demo', '$1-SEED0000000000000001'),
--   ('US', 'demo', '$1-SEED0000000000000002'),
--   ('JP', 'demo', '$1-SEED0000000000000003');
