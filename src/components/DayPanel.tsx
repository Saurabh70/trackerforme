"use client";

import { useState } from "react";
import { Footprints, Plus, Scale, Trash2, UtensilsCrossed, X } from "lucide-react";
import type { DailyLog, Profile, StepEntry } from "@/lib/types";
import { MEAL_TYPES } from "@/lib/types";
import { localISO, prettyDate } from "@/lib/dates";
import { previousWeight, towardTarget, type WeighIn } from "@/lib/stats";
import AddEntryDialog, { type NewMeal } from "./AddEntryDialog";

export type { NewMeal };

function Row({
  icon,
  tint,
  title,
  value,
  sub,
  children,
}: {
  icon: React.ReactNode;
  tint: string;
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="py-3.5 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tint}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] text-muted">{title}</div>
          <div className="text-[15px] font-semibold tabular-nums">{value}</div>
        </div>
        {sub && <div className="text-right text-[12px] text-muted">{sub}</div>}
      </div>
      {children && <div className="mt-2 pl-12">{children}</div>}
    </div>
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
  stepsFor,
  weightFor,
  onSaved,
}: {
  stepsFor: (date: string) => number;
  weightFor: (date: string) => number | null;
  onSaved: (date: string) => void;
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
  const [adding, setAdding] = useState(false);
  const u = profile.unit;
  const totalSteps = steps.reduce((a, s) => a + s.steps, 0);
  const meals = [...(log?.meals ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const totalCal = meals.reduce((a, m) => a + (m.calories ?? 0), 0);
  const w = log?.weight != null ? Number(log.weight) : null;
  const prev = previousWeight(points, date);
  const delta = w != null && prev ? w - prev.weight : null;
  const good = w != null && prev ? towardTarget(profile, prev.weight, w) >= 0 : true;
  const title = date === localISO() ? "Today" : prettyDate(date);

  return (
    <section className="card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {date === localISO() && <p className="text-[12px] text-muted">{prettyDate(date)}</p>}
        </div>
        <button className="btn h-9 px-3.5" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Add
        </button>
      </div>

      <div className="divide-y divide-border">
        <Row
          icon={<Footprints className="h-[18px] w-[18px] text-steps" />}
          tint="bg-steps/12"
          title="Steps"
          value={totalSteps > 0 ? totalSteps.toLocaleString() : <span className="font-normal text-muted">No steps yet</span>}
          sub={steps.length > 1 ? `${steps.length} entries` : undefined}
        >
          {steps.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {steps.map((s) => (
                <li key={s.id} className="flex items-center gap-1 rounded-md border border-border py-0.5 pr-1 pl-2 text-[12px] tabular-nums">
                  +{s.steps.toLocaleString()}
                  <button onClick={() => onDeleteSteps(s.id)} className="rounded p-0.5 text-muted hover:text-danger" aria-label="Remove steps entry">
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Row>

        <Row
          icon={<UtensilsCrossed className="h-[18px] w-[18px] text-meals" />}
          tint="bg-meals/12"
          title="Meals"
          value={
            meals.length > 0 ? (
              <>
                {meals.length} {meals.length === 1 ? "meal" : "meals"}
              </>
            ) : (
              <span className="font-normal text-muted">No meals yet</span>
            )
          }
          sub={totalCal > 0 ? <span className="text-[13px] font-semibold text-foreground tabular-nums">{totalCal.toLocaleString()} kcal</span> : undefined}
        >
          {meals.length > 0 && (
            <ul className="space-y-1">
              {meals.map((m) => (
                <li key={m.id} className="group flex items-center gap-2 text-[13px]">
                  <span className="w-16 shrink-0 text-[12px] text-muted">{MEAL_TYPES.find((t) => t.value === m.meal_type)?.label}</span>
                  <span className="min-w-0 flex-1 truncate">{m.description}</span>
                  <span className="tabular-nums text-muted">{m.calories != null ? `${m.calories} kcal` : "—"}</span>
                  <button onClick={() => onDeleteMeal(m.id)} className="rounded p-1 text-muted opacity-60 hover:text-danger hover:opacity-100" aria-label={`Delete ${m.description}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Row>

        <Row
          icon={<Scale className="h-[18px] w-[18px] text-weight" />}
          tint="bg-weight/12"
          title="Weight"
          value={w != null ? <>{w.toFixed(1)} <span className="text-[13px] font-normal text-muted">{u}</span></> : <span className="font-normal text-muted">Not logged</span>}
          sub={
            delta != null ? (
              <span className={`text-[13px] font-semibold tabular-nums ${good ? "text-good" : "text-danger"}`}>
                {delta === 0 ? "No change" : `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)} ${u}`}
              </span>
            ) : undefined
          }
        />
      </div>

      <AddEntryDialog
        open={adding}
        onClose={() => setAdding(false)}
        defaultDate={date}
        unit={u}
        stepsFor={stepsFor}
        weightFor={weightFor}
        onAddSteps={onAddSteps}
        onAddMeal={onAddMeal}
        onSaveWeight={onSaveWeight}
        onSaved={onSaved}
      />
    </section>
  );
}
