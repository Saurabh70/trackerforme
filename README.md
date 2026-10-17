# Tracker For Me 🔥

Daily weight + meal tracker with progress toward a target weight and Duolingo-style streaks.
Next.js 15 (App Router) + Tailwind + Supabase (Postgres, Auth, RLS).

## Features
- **Daily log**: morning weight with the change since your last weigh-in (green = toward goal, red = away).
- **Meals per day**: breakfast / lunch / dinner / snack, with optional kcal, protein and time. Totals are shown against your daily calorie target.
- **Progress**: start → current → target bar, % complete, amount left, 14-day trend and projected goal date.
- **Chart**: daily weight, 7-day moving average, dashed target line.
- **Streaks**: 🔥 logging streak (a day counts when it has a weight **and** at least one meal), ✅ on-track streak (under your calorie target, or weight moved toward the target). Also shows your best streaks, the next milestone, a "streak at risk" banner and confetti.
- **Streak calendar** heatmap: click any day to edit it.

## Setup
1. Create a project at https://supabase.com.
2. In **SQL Editor**, run `supabase/migrations/20261017000000_init.sql`.
3. **Authentication → URL Configuration**: set Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs (add your Vercel URL later too).
4. `cp .env.example .env.local`, then paste the Project URL and anon/publishable key from **Project Settings → API**.
5. `npm install && npm run dev`, then open http://localhost:3000.

> Tip: Supabase's built-in email sender is rate limited. For quick testing, use the **Password** tab, or turn off "Confirm email" under Authentication → Providers → Email.

## Deploy
Push to GitHub → import in Vercel → add the two `NEXT_PUBLIC_SUPABASE_*` env vars → add the Vercel URL to Supabase Redirect URLs.

## Schema
- `profiles`: goals and units (created automatically on signup by a trigger)
- `daily_logs`: one row per user per day (`unique(user_id, log_date)`)
- `meals`: belong to a daily log
- `get_streaks(p_today date)`: gaps-and-islands SQL that returns current/longest logging and on-track streaks

RLS is enabled on every table, so each user can only see their own data.
