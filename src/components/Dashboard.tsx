"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DailyLog, Meal, Profile, StepEntry, Streaks } from "@/lib/types";
import { localISO } from "@/lib/dates";
import { progress, weighIns } from "@/lib/stats";
import MonthCalendar from "./MonthCalendar";
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
        supabase.from("daily_logs").select("*, meals(*)").order("log_date", { ascending: true }),
        supabase.from("step_entries").select("*").order("created_at", { ascending: true }),
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
    <main className="mx-auto max-w-xl space-y-4 px-4 pb-16 pt-6">
      <header className="flex items-center justify-between gap-2">
        <h1 className="min-w-0 truncate text-lg font-bold sm:text-xl">
          {profile.display_name ? `Hey ${profile.display_name} 👋` : "Tracker For Me"}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          {ready && streak > 0 && (
            <span className="whitespace-nowrap rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
              🔥 {streak}
            </span>
          )}
          <Link href="/settings" className="btn-ghost px-2.5" aria-label="Settings">⚙️</Link>
          <button onClick={signOut} className="btn-ghost whitespace-nowrap text-xs">Sign out</button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* Current / Start / Target */}
      <section className="card">
        <div className="grid grid-cols-3 divide-x divide-border text-center">
          {[
            { label: "Current", value: p.now, strong: true },
            { label: "Start", value: p.start },
            { label: "Target", value: p.target },
          ].map((s) => (
            <div key={s.label} className="px-2">
              <div className="text-xs text-muted">{s.label}</div>
              <div className={`tabular-nums ${s.strong ? "text-2xl font-extrabold text-accent" : "text-xl font-bold"}`}>
                {s.value.toFixed(1)}
              </div>
              <div className="text-[11px] text-muted">{u}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${p.pct * 100}%` }} />
        </div>
        <p className="mt-1 text-center text-xs text-muted">
          {p.pct >= 1 ? "🎉 Target reached!" : `${p.left.toFixed(1)} ${u} to go`}
        </p>
      </section>

      {!ready ? (
        <div className="card h-80 animate-pulse" />
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
          />
        </>
      )}
    </main>
  );
}
