"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DailyLog, StepEntry } from "@/lib/types";
import { TRACKING_START, localISO } from "@/lib/dates";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Fixed order in every cell: steps, meals, weight.
const KINDS = [
  { key: "steps", label: "Steps", color: "bg-steps" },
  { key: "meals", label: "Meals", color: "bg-meals" },
  { key: "weight", label: "Weight", color: "bg-weight" },
] as const;

export default function MonthCalendar({
  month,
  setMonth,
  selected,
  onSelect,
  logs,
  steps,
}: {
  month: { y: number; m: number }; // m is 0-based
  setMonth: (m: { y: number; m: number }) => void;
  selected: string;
  onSelect: (date: string) => void;
  logs: DailyLog[];
  steps: StepEntry[];
}) {
  const today = localISO();
  const first = new Date(month.y, month.m, 1);
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const lead = first.getDay();
  const byDate = new Map(logs.map((l) => [l.log_date, l]));
  const stepDates = new Set(steps.map((s) => s.log_date));
  const iso = (d: number) => localISO(new Date(month.y, month.m, d));
  const shift = (n: number) => {
    const d = new Date(month.y, month.m + n, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
  };
  const now = new Date();
  const isCurrentMonth = month.y === now.getFullYear() && month.m === now.getMonth();
  const [sy, sm] = TRACKING_START.split("-").map(Number);
  const isStartMonth = month.y < sy || (month.y === sy && month.m <= sm - 1);

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">
          {first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </h2>
        <div className="flex gap-1">
          <button className="btn-icon disabled:opacity-30" onClick={() => shift(-1)} disabled={isStartMonth} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="btn-icon disabled:opacity-30" onClick={() => shift(1)} disabled={isCurrentMonth} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: lead }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
          const date = iso(d);
          const log = byDate.get(date);
          const has = {
            steps: stepDates.has(date),
            meals: !!log && log.meals.length > 0,
            weight: log?.weight != null,
          };
          const future = date > today || date < TRACKING_START;
          const isSel = date === selected;
          const isToday = date === today;
          const logged = KINDS.filter((k) => has[k.key]).map((k) => k.label);
          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              disabled={future}
              aria-pressed={isSel}
              aria-label={`${date}${logged.length ? `: ${logged.join(", ")}` : ""}`}
              className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg transition
                ${isSel ? "bg-subtle ring-1 ring-foreground/80" : "hover:bg-subtle"}
                ${future ? "pointer-events-none opacity-30" : ""}`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[13px] tabular-nums
                  ${isToday ? "bg-primary font-semibold text-primary-fg" : ""}`}
              >
                {d}
              </span>
              <span className="flex gap-[3px]">
                {KINDS.map((k) => (
                  <span key={k.key} className={`h-2 w-2 rounded-full ${has[k.key] ? k.color : "bg-border-strong/70"}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex justify-center gap-4 border-t border-border pt-3 text-[12px] text-muted">
        {KINDS.map((k) => (
          <span key={k.key} className="flex items-center gap-1.5">
            <i className={`h-2 w-2 rounded-full ${k.color}`} /> {k.label}
          </span>
        ))}
      </div>
    </section>
  );
}
