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
3. **Authentication → Providers → Email**: turn off "Confirm email". Turn off "Allow new users to sign up" once your accounts exist.
4. `cp .env.example .env.local`, then paste the Project URL and anon/publishable key from **Project Settings → API**.
5. `npm install && npm run dev`, then open http://localhost:3000.

> Login is name + password; each name maps to `<name>@trackerforme.app` behind the scenes. The login page is sign-in only.

## Deploy (GitHub Pages)
The app is a static export (`output: "export"`), so it runs on GitHub Pages. Pushing to `main` runs `.github/workflows/deploy.yml`.
Set two repository **variables** (Settings → Secrets and variables → Actions → Variables): `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
The anon key is public by design; Row Level Security keeps each user's data private.

## Schema
- `profiles`: goals and units (created automatically on signup by a trigger)
- `daily_logs`: one row per user per day (`unique(user_id, log_date)`)
- `meals`: belong to a daily log
- `get_streaks(p_today date)`: gaps-and-islands SQL that returns current/longest logging and on-track streaks

RLS is enabled on every table, so each user can only see their own data.
