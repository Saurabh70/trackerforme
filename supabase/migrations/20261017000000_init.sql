-- Tracker For Me: weight + meals + streaks

-- ---------- tables ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  start_weight numeric(6,2),
  target_weight numeric(6,2),
  height_cm numeric(5,1),
  unit text not null default 'kg' check (unit in ('kg', 'lb')),
  daily_calorie_target int check (daily_calorie_target > 0),
  target_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date date not null,
  weight numeric(6,2) check (weight > 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  daily_log_id uuid not null references public.daily_logs (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  description text not null,
  calories int check (calories >= 0),
  protein_g numeric(6,1) check (protein_g >= 0),
  eaten_at time,
  created_at timestamptz not null default now()
);

create index if not exists daily_logs_user_date_idx on public.daily_logs (user_id, log_date desc);
create index if not exists meals_log_idx on public.meals (daily_log_id);

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.daily_logs enable row level security;
alter table public.meals enable row level security;

create policy "own profile select" on public.profiles for select using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert with check (id = auth.uid());
create policy "own profile update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "own logs all" on public.daily_logs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own meals all" on public.meals for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.daily_logs l where l.id = daily_log_id and l.user_id = auth.uid())
  );

-- ---------- profile on signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- streaks ----------
-- A day is "logged" when it has a weight AND at least one meal.
-- A day is "on track" when it is logged and either: calories <= daily target (if a target
-- is set and calories were entered), otherwise weight moved toward (or held at) the target.
-- Current streaks stay alive until the end of today (counted up to yesterday if today is empty).
create or replace function public.get_streaks(p_today date)
returns table (current_streak int, longest_streak int, on_track_streak int, longest_on_track int)
language sql
stable
security invoker
set search_path = public
as $$
  with p as (
    select * from profiles where id = auth.uid()
  ),
  d as (
    select
      l.log_date,
      l.weight,
      lag(l.weight) over (order by l.log_date) as prev_weight,
      coalesce((select sum(m.calories) from meals m where m.daily_log_id = l.id), 0) as cals,
      exists (select 1 from meals m where m.daily_log_id = l.id) as has_meal
    from daily_logs l
    where l.user_id = auth.uid() and l.log_date <= p_today
  ),
  f as (
    select
      d.log_date,
      (d.weight is not null and d.has_meal) as logged,
      (d.weight is not null and d.has_meal and (
        case
          when p.daily_calorie_target is not null and d.cals > 0 then d.cals <= p.daily_calorie_target
          when d.prev_weight is null or p.target_weight is null then true
          else abs(d.weight - p.target_weight) <= abs(d.prev_weight - p.target_weight)
        end
      )) as on_track
    from d cross join p
  ),
  lg as (
    select count(*)::int as n, max(log_date) as last_day
    from (select log_date, log_date - (row_number() over (order by log_date))::int as grp from f where logged) s
    group by grp
  ),
  tg as (
    select count(*)::int as n, max(log_date) as last_day
    from (select log_date, log_date - (row_number() over (order by log_date))::int as grp from f where on_track) s
    group by grp
  )
  select
    coalesce((select n from lg where last_day >= p_today - 1 order by last_day desc limit 1), 0),
    coalesce((select max(n) from lg), 0),
    coalesce((select n from tg where last_day >= p_today - 1 order by last_day desc limit 1), 0),
    coalesce((select max(n) from tg), 0);
$$;

grant execute on function public.get_streaks(date) to authenticated;

-- refresh the API schema cache so the new tables show up immediately
notify pgrst, 'reload schema';
