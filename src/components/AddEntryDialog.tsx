"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import type { MealType } from "@/lib/types";
import { MEAL_TYPES } from "@/lib/types";
import { TRACKING_START, localISO, prettyDate } from "@/lib/dates";

export type EntryKind = "steps" | "meal" | "weight";
export type NewMeal = { meal_type: MealType; description: string; calories: number | null };

function defaultMealType(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[12px] font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="block text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

export default function AddEntryDialog({
  open,
  onClose,
  defaultDate,
  unit,
  stepsFor,
  weightFor,
  onAddSteps,
  onAddMeal,
  onSaveWeight,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  unit: string;
  stepsFor: (date: string) => number;
  weightFor: (date: string) => number | null;
  onAddSteps: (date: string, steps: number) => Promise<void>;
  onAddMeal: (date: string, meal: NewMeal) => Promise<void>;
  onSaveWeight: (date: string, weight: number) => Promise<void>;
  onSaved?: (date: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<EntryKind>("steps");
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState("");
  const [mealType, setMealType] = useState<MealType>(defaultMealType());
  const [desc, setDesc] = useState("");
  const [cal, setCal] = useState("");
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(defaultDate);
  const today = localISO();
  const stepsOnDate = stepsFor(date);
  const weightOnDate = weightFor(date);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setSteps("");
      setDesc("");
      setCal("");
      setMealType(defaultMealType());
      setDate(defaultDate);
      const w = weightFor(defaultDate);
      setWeight(w != null ? String(w) : "");
      d.showModal();
    } else if (!open && d.open) {
      d.close();
    }
    // weightFor changes identity every render; only react to open/date changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultDate]);

  function changeDate(next: string) {
    if (!next || next > today || next < TRACKING_START) return;
    setDate(next);
    const w = weightFor(next);
    setWeight(w != null ? String(w) : "");
  }

  const valid =
    (kind === "steps" && Number(steps) > 0) ||
    (kind === "meal" && desc.trim().length > 0) ||
    (kind === "weight" && Number(weight) > 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    if (kind === "steps") await onAddSteps(date, Math.round(Number(steps)));
    if (kind === "meal") await onAddMeal(date, { meal_type: mealType, description: desc.trim(), calories: cal ? Number(cal) : null });
    if (kind === "weight") await onSaveWeight(date, Number(weight));
    setBusy(false);
    onSaved?.(date);
    onClose();
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 mt-auto w-full max-w-none rounded-t-2xl border border-border bg-card p-0 text-foreground shadow-2xl sm:m-auto sm:max-w-md sm:rounded-2xl"
    >
      <form onSubmit={submit} className="space-y-5 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[15px] font-semibold">Add entry</h2>
            <p className="text-[12px] text-muted">{date === today ? `Today, ${prettyDate(date)}` : prettyDate(date)}</p>
          </div>
          <button type="button" className="btn-icon -mt-1 -mr-2" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={kind} onChange={(v) => setKind(v as EntryKind)}>
              <option value="steps">Steps</option>
              <option value="meal">Meal</option>
              <option value="weight">Weight</option>
            </Select>
          </Field>
          <Field label="Date">
            <input className="input" type="date" min={TRACKING_START} max={today} required value={date}
              onChange={(e) => changeDate(e.target.value)} />
          </Field>
        </div>

        {kind === "steps" && (
          <Field label="Steps" hint={stepsOnDate > 0 ? `Adds to this day's total of ${stepsOnDate.toLocaleString()}.` : undefined}>
            <input className="input" type="number" min="1" inputMode="numeric" placeholder="e.g. 4,000" autoFocus
              value={steps} onChange={(e) => setSteps(e.target.value)} />
          </Field>
        )}

        {kind === "meal" && (
          <>
            <Field label="Meal">
              <Select value={mealType} onChange={(v) => setMealType(v as MealType)}>
                {MEAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="What did you eat?">
              <input className="input" placeholder="e.g. Poha with peanuts" autoFocus
                value={desc} onChange={(e) => setDesc(e.target.value)} />
            </Field>
            <Field label="Calories" hint="Optional">
              <div className="relative">
                <input className="input pr-12" type="number" min="0" inputMode="numeric" placeholder="0"
                  value={cal} onChange={(e) => setCal(e.target.value)} />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-muted">kcal</span>
              </div>
            </Field>
          </>
        )}

        {kind === "weight" && (
          <Field label="Weight" hint={weightOnDate != null ? `Replaces this day's weight (${weightOnDate.toFixed(1)} ${unit}).` : undefined}>
            <div className="relative">
              <input className="input pr-10" type="number" step="0.1" min="1" inputMode="decimal" placeholder="0.0" autoFocus
                value={weight} onChange={(e) => setWeight(e.target.value)} />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-muted">{unit}</span>
            </div>
          </Field>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn flex-1" disabled={busy || !valid}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </dialog>
  );
}
