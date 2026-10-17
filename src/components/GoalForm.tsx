"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Unit } from "@/lib/types";

export default function GoalForm({ mode }: { mode: "onboarding" | "settings" }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    display_name: "",
    start_weight: "",
    target_weight: "",
    height_cm: "",
    unit: "kg" as Unit,
    daily_calorie_target: "",
    target_date: "",
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/login");
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
      if (data) {
        setForm({
          display_name: data.display_name ?? "",
          start_weight: data.start_weight?.toString() ?? "",
          target_weight: data.target_weight?.toString() ?? "",
          height_cm: data.height_cm?.toString() ?? "",
          unit: data.unit,
          daily_calorie_target: data.daily_calorie_target?.toString() ?? "",
          target_date: data.target_date ?? "",
        });
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const num = (s: string) => (s.trim() === "" ? null : Number(s));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.replace("/login");
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: form.display_name.trim() || null,
      start_weight: num(form.start_weight),
      target_weight: num(form.target_weight),
      height_cm: num(form.height_cm),
      unit: form.unit,
      daily_calorie_target: num(form.daily_calorie_target),
      target_date: form.target_date || null,
    });
    setBusy(false);
    if (error) return setError(error.message);
    router.replace("/");
    router.refresh();
  }

  if (loading) return <p className="p-8 text-center text-muted">Loading…</p>;

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold">{mode === "onboarding" ? "Set your goal 🎯" : "Goal settings"}</h1>
      <p className="mb-6 text-sm text-muted">
        {mode === "onboarding" ? "A few numbers so we can track your progress." : "Update your targets any time."}
      </p>
      <form onSubmit={save} className="card space-y-4">
        <Field label="Your name (optional)">
          <input className="input" value={form.display_name} onChange={set("display_name")} />
        </Field>
        <Field label="Units">
          <select className="input" value={form.unit} onChange={set("unit")}>
            <option value="kg">Kilograms (kg)</option>
            <option value="lb">Pounds (lb)</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Starting weight (${form.unit})`}>
            <input className="input" type="number" step="0.1" min="1" required value={form.start_weight} onChange={set("start_weight")} />
          </Field>
          <Field label={`Target weight (${form.unit})`}>
            <input className="input" type="number" step="0.1" min="1" required value={form.target_weight} onChange={set("target_weight")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Daily calories (optional)">
            <input className="input" type="number" min="1" placeholder="e.g. 1800" value={form.daily_calorie_target} onChange={set("daily_calorie_target")} />
          </Field>
          <Field label="Height cm (optional)">
            <input className="input" type="number" step="0.1" min="50" value={form.height_cm} onChange={set("height_cm")} />
          </Field>
        </div>
        <Field label="Target date (optional)">
          <input className="input" type="date" value={form.target_date} onChange={set("target_date")} />
        </Field>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          {mode === "settings" && (
            <button type="button" className="btn-ghost flex-1" onClick={() => router.push("/")}>
              Cancel
            </button>
          )}
          <button className="btn flex-1" disabled={busy}>
            {busy ? "Saving…" : mode === "onboarding" ? "Start tracking" : "Save"}
          </button>
        </div>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
