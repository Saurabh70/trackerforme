"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, ChevronDown, ChevronLeft, Dumbbell, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Unit } from "@/lib/types";

export default function GoalForm({ mode }: { mode: "onboarding" | "settings" }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<GoalTab>("fitness");
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

  if (loading) return <p className="p-8 text-center text-[13px] text-muted">Loading…</p>;

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      {mode === "settings" && (
        <Link href="/" className="mb-3 -ml-1 inline-flex items-center gap-0.5 text-[13px] text-muted hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
      )}
      <h1 className="text-[20px] font-semibold tracking-tight">{mode === "onboarding" ? "Set your goal" : "Goal settings"}</h1>
      <p className="mb-5 text-[13px] text-muted">
        {mode === "onboarding" ? "A few numbers so we can track your progress." : "Update your targets any time."}
      </p>
      {mode === "settings" && (
        <div role="tablist" aria-label="Goal areas" className="mb-3 grid grid-cols-3 gap-1 rounded-lg bg-subtle p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[13px] font-medium transition
                ${tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab !== "fitness" ? (
        <ComingSoon tab={TABS.find((t) => t.key === tab)!} />
      ) : (
        <form onSubmit={save} className="card space-y-4">
          <Field label="Your name (optional)">
            <input className="input" value={form.display_name} onChange={set("display_name")} />
          </Field>
          <Field label="Units">
            <div className="relative">
              <select className="select" value={form.unit} onChange={set("unit")}>
                <option value="kg">Kilograms (kg)</option>
                <option value="lb">Pounds (lb)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted" />
            </div>
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
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <div className="flex gap-2">
            {mode === "settings" && (
              <button type="button" className="btn-secondary flex-1" onClick={() => router.push("/")}>
                Cancel
              </button>
            )}
            <button className="btn flex-1" disabled={busy}>
              {busy ? "Saving…" : mode === "onboarding" ? "Start tracking" : "Save"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}

type GoalTab = "fitness" | "studies" | "reading";

const TABS: { key: GoalTab; label: string; icon: typeof Dumbbell; blurb: string }[] = [
  { key: "fitness", label: "Fitness", icon: Dumbbell, blurb: "" },
  { key: "studies", label: "Studies", icon: GraduationCap, blurb: "Study hours, subjects and exam goals." },
  { key: "reading", label: "Reading", icon: BookOpen, blurb: "Books, pages per day and reading streaks." },
];

function ComingSoon({ tab }: { tab: (typeof TABS)[number] }) {
  return (
    <div className="card flex flex-col items-center py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-subtle text-muted">
        <tab.icon className="h-5 w-5" />
      </span>
      <h2 className="mt-3 text-[15px] font-semibold">{tab.label} goals are coming soon</h2>
      <p className="mt-1 max-w-[16rem] text-[13px] text-muted">{tab.blurb}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[12px] font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
