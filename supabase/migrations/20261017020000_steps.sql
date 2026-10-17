-- Step entries: several per day allowed; the app shows the day's total (sum).
create table if not exists public.step_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date date not null,
  steps int not null check (steps > 0 and steps <= 200000),
  created_at timestamptz not null default now()
);

create index if not exists step_entries_user_date_idx on public.step_entries (user_id, log_date);

alter table public.step_entries enable row level security;

create policy "own steps all" on public.step_entries for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

notify pgrst, 'reload schema';
