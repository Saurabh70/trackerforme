"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DailyLog, Meal, Profile, StepEntry, Streaks } from "@/lib/types";
import { TRACKING_START, localISO } from "@/lib/dates";
import { progress, weighIns } from "@/lib/stats";
import { Flame, LogOut, Settings } from "lucide-react";
import MonthCalendar from "./MonthCalendar";
import WeightGraph from "./WeightGraph";
import DayPanel, { type NewMeal } from "./DayPanel";

export default function Dashboard({ profile }: { profile: Profile }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [steps, setSteps] = useState<StepEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [date, setDate] = useState(localISO());
  const [month, setMonth] = useState(() => ({ y: new Date().getFullYear(), m: new Date().getMonth() }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Dates depend on the browser's locale/timezone, so render only after mount to avoid hydration mismatches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const refreshStreak = useCallback(async () => {
    const { data } = await supabase.rpc("get_streaks", { p_today: localISO() });
    const s = (Array.isArray(data) ? data[0] : data) as Streaks | undefined;
    setStreak(s?.current_streak ?? 0);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const [logsRes, stepsRes] = await Promise.all([
        supabase.from("daily_logs").select("*, meals(*)").gte("log_date", TRACKING_START).order("log_date", { ascending: true }),
        supabase.from("step_entries").select("*").gte("log_date", TRACKING_START).order("created_at", { ascending: true }),
      ]);
      if (logsRes.error) setError(logsRes.error.message);
      else setLogs((logsRes.data ?? []) as DailyLog[]);
      if (stepsRes.error) setError(stepsRes.error.message);
      else setSteps((stepsRes.data ?? []) as StepEntry[]);
      await refreshStreak();
      setLoading(false);
    })();
  }, [supabase, refreshStreak]);

  const points = useMemo(() => weighIns(logs), [logs]);
  const logFor = (d: string) => logs.find((l) => l.log_date === d);
  const p = progress(profile, points.at(-1)?.weight);
  const u = profile.unit;

  function upsertLocal(row: DailyLog) {
    setLogs((prev) =>
      [...prev.filter((l) => l.log_date !== row.log_date), row].sort((a, b) => a.log_date.localeCompare(b.log_date)),
    );
  }

  async function userId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) router.replace("/login");
    return user?.id ?? null;
  }

  async function ensureLog(d: string, weight?: number): Promise<DailyLog | null> {
    const existing = logFor(d);
    if (existing && !existing.id.startsWith("tmp-") && weight === undefined) return existing;
    const uid = await userId();
    if (!uid) return null;
    const payload: Record<string, unknown> = { user_id: uid, log_date: d };
    if (weight !== undefined) payload.weight = weight;
    const { data, error } = await supabase
      .from("daily_logs")
      .upsert(payload, { onConflict: "user_id,log_date" })
      .select("*, meals(*)")
      .single();
    if (error) {
      setError(error.message);
      return null;
    }
    return data as DailyLog;
  }

  async function saveWeight(d: string, weight: number) {
    setError(null);
    const row = await ensureLog(d, weight);
    if (row) upsertLocal(row);
    await refreshStreak();
  }

  async function addMeal(d: string, meal: NewMeal) {
    setError(null);
    const log = await ensureLog(d);
    if (!log) return;
    const { data, error } = await supabase
      .from("meals")
      .insert({ ...meal, daily_log_id: log.id, user_id: log.user_id })
      .select()
      .single();
    if (error) return setError(error.message);
    upsertLocal({ ...log, meals: [...log.meals, data as Meal] });
    await refreshStreak();
  }

  async function deleteMeal(id: string) {
    setError(null);
    const log = logs.find((l) => l.meals.some((m) => m.id === id));
    if (!log) return;
    upsertLocal({ ...log, meals: log.meals.filter((m) => m.id !== id) });
    const { error } = await supabase.from("meals").delete().eq("id", id);
    if (error) {
      setError(error.message);
      upsertLocal(log);
    }
    await refreshStreak();
  }

  async function addSteps(d: string, n: number) {
    setError(null);
    const uid = await userId();
    if (!uid) return;
    const { data, error } = await supabase
      .from("step_entries")
      .insert({ user_id: uid, log_date: d, steps: n })
      .select()
      .single();
    if (error) return setError(error.message);
    setSteps((prev) => [...prev, data as StepEntry]);
  }

  async function deleteSteps(id: string) {
    setError(null);
    const before = steps;
    setSteps((prev) => prev.filter((s) => s.id !== id));
    const { error } = await supabase.from("step_entries").delete().eq("id", id);
    if (error) {
      setError(error.message);
      setSteps(before);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const ready = mounted && !loading;

  return (
    <main className="mx-auto max-w-xl space-y-3 px-4 pt-6 pb-16">
      <header className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12px] text-muted">Tracker For Me</p>
          <h1 className="truncate text-[20px] font-semibold tracking-tight">
            {profile.display_name ? `Hi, ${profile.display_name}` : "Your progress"}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {ready && streak > 0 && (
            <span
              className="mr-1 inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[12px] font-semibold tabular-nums"
              title={`${streak}-day logging streak`}
            >
              <Flame className="h-3.5 w-3.5 text-meals" /> {streak}
            </span>
          )}
          <Link href="/settings" className="btn-icon" aria-label="Goal settings">
            <Settings className="h-[18px] w-[18px]" />
          </Link>
          <button onClick={signOut} className="btn-icon" aria-label="Sign out" title="Sign out">
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</div>
      )}

      <section className="card">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold">Weight</h2>
          <p className="text-[12px] text-muted tabular-nums">
            {p.pct >= 1 ? "Target reached" : `${p.left.toFixed(1)} ${u} to go · ${Math.round(p.pct * 100)}% there`}
          </p>
        </div>
        {ready ? <WeightGraph profile={profile} points={points} /> : <div className="h-[200px] animate-pulse rounded-lg bg-subtle" />}
      </section>

      {!ready ? (
        <div className="card h-80 animate-pulse bg-subtle" />
      ) : (
        <>
          <MonthCalendar
            month={month}
            setMonth={setMonth}
            selected={date}
            onSelect={setDate}
            logs={logs}
            steps={steps}
          />
          <DayPanel
            date={date}
            log={logFor(date)}
            steps={steps.filter((s) => s.log_date === date)}
            profile={profile}
            points={points}
            onAddSteps={addSteps}
            onDeleteSteps={deleteSteps}
            onAddMeal={addMeal}
            onDeleteMeal={deleteMeal}
            onSaveWeight={saveWeight}
            stepsFor={(d) => steps.filter((s) => s.log_date === d).reduce((a, s) => a + s.steps, 0)}
            weightFor={(d) => {
              const wt = logFor(d)?.weight;
              return wt != null ? Number(wt) : null;
            }}
            onSaved={(d) => {
              setDate(d);
              const [y, m] = d.split("-").map(Number);
              setMonth({ y, m: m - 1 });
            }}
          />
        </>
      )}
    </main>
  );
}
