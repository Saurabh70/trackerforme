"use client";

import { useEffect, useState } from "react";
import type { DailyLog, MealType, Profile, StepEntry } from "@/lib/types";
import { MEAL_TYPES } from "@/lib/types";
import { localISO, prettyDate } from "@/lib/dates";
import { previousWeight, towardTarget, type WeighIn } from "@/lib/stats";
import { DOT } from "./MonthCalendar";

export type NewMeal = { meal_type: MealType; description: string; calories: number | null };

function defaultMealType(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

function Section({
  dot,
  title,
  summary,
  adding,
  onAdd,
  addLabel,
  children,
}: {
  dot: string;
  title: string;
  summary: React.ReactNode;
  adding: boolean;
  onAdd: () => void;
  addLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${dot}`} />
          <h3 className="font-semibold">{title}</h3>
        </div>
        {!adding && (
          <button className="btn px-3 py-1.5 text-xs" onClick={onAdd}>
            {addLabel}
          </button>
        )}
      </div>
      <div className="text-2xl font-bold tabular-nums">{summary}</div>
      {children}
    </section>
  );
}

export default function DayPanel({
  date,
  log,
  steps,
  profile,
  points,
  onAddSteps,
  onDeleteSteps,
  onAddMeal,
  onDeleteMeal,
  onSaveWeight,
}: {
  date: string;
  log: DailyLog | undefined;
  steps: StepEntry[];
  profile: Profile;
  points: WeighIn[];
  onAddSteps: (date: string, steps: number) => Promise<void>;
  onDeleteSteps: (id: string) => Promise<void>;
  onAddMeal: (date: string, meal: NewMeal) => Promise<void>;
  onDeleteMeal: (id: string) => Promise<void>;
  onSaveWeight: (date: string, weight: number) => Promise<void>;
}) {
  const u = profile.unit;
  const [open, setOpen] = useState<"steps" | "meal" | "weight" | null>(null);
  const [busy, setBusy] = useState(false);
  const [stepsIn, setStepsIn] = useState("");
  const [meal, setMeal] = useState({ meal_type: defaultMealType(), description: "", calories: "" });
  const [weightIn, setWeightIn] = useState("");

  useEffect(() => {
    setOpen(null);
    setStepsIn("");
    setWeightIn("");
  }, [date]);

  const totalSteps = steps.reduce((a, s) => a + s.steps, 0);
  const meals = log?.meals ?? [];
  const totalCal = meals.reduce((a, m) => a + (m.calories ?? 0), 0);
  const w = log?.weight != null ? Number(log.weight) : null;
  const prev = previousWeight(points, date);
  const delta = w != null && prev ? w - prev.weight : null;
  const good = w != null && prev ? towardTarget(profile, prev.weight, w) >= 0 : true;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    await fn();
    setBusy(false);
    setOpen(null);
  }

  const title = date === localISO() ? "Today" : prettyDate(date);

  return (
    <div className="space-y-3">
      <h2 className="px-1 text-lg font-bold">{title}</h2>

      {/* Steps */}
      <Section
        dot={DOT.steps}
        title="Steps"
        summary={<>{totalSteps.toLocaleString()} <span className="text-sm font-medium text-muted">steps</span></>}
        adding={open === "steps"}
        onAdd={() => setOpen("steps")}
        addLabel="+ Add steps"
      >
        {steps.length > 1 && (
          <ul className="flex flex-wrap gap-1.5">
            {steps.map((s) => (
              <li key={s.id} className="flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs">
                +{s.steps.toLocaleString()}
                <button onClick={() => onDeleteSteps(s.id)} className="text-muted hover:text-red-500" aria-label="Remove steps entry">✕</button>
              </li>
            ))}
          </ul>
        )}
        {steps.length === 1 && (
          <button onClick={() => onDeleteSteps(steps[0].id)} className="text-xs text-muted hover:text-red-500">Remove</button>
        )}
        {open === "steps" && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Math.round(Number(stepsIn));
              if (n > 0) run(() => onAddSteps(date, n));
            }}
          >
            <input className="input" type="number" min="1" inputMode="numeric" autoFocus placeholder="e.g. 4000"
              value={stepsIn} onChange={(e) => setStepsIn(e.target.value)} />
            <button className="btn" disabled={busy || !stepsIn}>Add</button>
            <button type="button" className="btn-ghost" onClick={() => setOpen(null)}>✕</button>
          </form>
        )}
        {open === "steps" && totalSteps > 0 && <p className="text-xs text-muted">Adds to today&apos;s total.</p>}
      </Section>

      {/* Meals */}
      <Section
        dot={DOT.meals}
        title="Meals"
        summary={
          <>
            {meals.length} <span className="text-sm font-medium text-muted">meal{meals.length === 1 ? "" : "s"}</span>
            <span className="mx-2 text-muted">·</span>
            {totalCal.toLocaleString()} <span className="text-sm font-medium text-muted">kcal</span>
          </>
        }
        adding={open === "meal"}
        onAdd={() => setOpen("meal")}
        addLabel="+ Add meal"
      >
        {meals.length > 0 && (
          <ul className="divide-y divide-border">
            {[...meals]
              .sort((a, b) => a.created_at.localeCompare(b.created_at))
              .map((m) => {
                const t = MEAL_TYPES.find((x) => x.value === m.meal_type)!;
                return (
                  <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
                    <span>{t.emoji}</span>
                    <span className="min-w-0 flex-1 truncate">{m.description}</span>
                    <span className="tabular-nums text-muted">{m.calories != null ? `${m.calories} kcal` : "—"}</span>
                    <button onClick={() => onDeleteMeal(m.id)} disabled={m.id.startsWith("tmp-")}
                      className="text-muted hover:text-red-500" aria-label="Delete meal">✕</button>
                  </li>
                );
              })}
          </ul>
        )}
        {open === "meal" && (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!meal.description.trim()) return;
              run(async () => {
                await onAddMeal(date, {
                  meal_type: meal.meal_type,
                  description: meal.description.trim(),
                  calories: meal.calories ? Number(meal.calories) : null,
                });
                setMeal({ meal_type: defaultMealType(), description: "", calories: "" });
              });
            }}
          >
            <div className="grid grid-cols-4 gap-1">
              {MEAL_TYPES.map((t) => (
                <button type="button" key={t.value}
                  onClick={() => setMeal((m) => ({ ...m, meal_type: t.value }))}
                  className={`rounded-lg py-1.5 text-xs font-medium ${meal.meal_type === t.value ? "bg-accent text-white" : "bg-background"}`}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="input flex-1" autoFocus required placeholder="What did you eat?"
                value={meal.description} onChange={(e) => setMeal((m) => ({ ...m, description: e.target.value }))} />
              <input className="input w-24" type="number" min="0" inputMode="numeric" placeholder="kcal"
                value={meal.calories} onChange={(e) => setMeal((m) => ({ ...m, calories: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={() => setOpen(null)}>Cancel</button>
              <button className="btn flex-1" disabled={busy}>Add meal</button>
            </div>
          </form>
        )}
      </Section>

      {/* Weight */}
      <Section
        dot={DOT.weight}
        title="Weight"
        summary={
          w != null ? (
            <span className="flex items-baseline gap-2">
              {w.toFixed(1)} <span className="text-sm font-medium text-muted">{u}</span>
              {delta != null && (
                <span className={`text-sm font-semibold ${good ? "text-emerald-500" : "text-red-500"}`}>
                  {delta === 0 ? "no change" : `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)}`}
                </span>
              )}
            </span>
          ) : (
            <span className="text-base font-medium text-muted">Not logged</span>
          )
        }
        adding={open === "weight"}
        onAdd={() => {
          setWeightIn(w != null ? String(w) : "");
          setOpen("weight");
        }}
        addLabel={w != null ? "Edit weight" : "+ Add weight"}
      >
        {open === "weight" && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(weightIn);
              if (n > 0) run(() => onSaveWeight(date, n));
            }}
          >
            <input className="input" type="number" step="0.1" min="1" inputMode="decimal" autoFocus
              placeholder={prev ? prev.weight.toFixed(1) : u} value={weightIn} onChange={(e) => setWeightIn(e.target.value)} />
            <button className="btn" disabled={busy || !weightIn}>Save</button>
            <button type="button" className="btn-ghost" onClick={() => setOpen(null)}>✕</button>
          </form>
        )}
      </Section>
    </div>
  );
}
