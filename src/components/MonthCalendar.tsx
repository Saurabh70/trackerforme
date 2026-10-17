"use client";

import type { DailyLog, StepEntry } from "@/lib/types";
import { localISO } from "@/lib/dates";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export const DOT = {
  steps: "bg-sky-500",
  meals: "bg-orange-500",
  weight: "bg-emerald-500",
};

function Dot({ on, color }: { on: boolean; color: string }) {
  return <span className={`h-2.5 w-2.5 rounded-full ${on ? color : "border border-border"}`} />;
}

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
  const isCurrentMonth = month.y === new Date().getFullYear() && month.m === new Date().getMonth();

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <button className="btn-ghost px-2.5" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
        <h2 className="font-semibold">
          {first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </h2>
        <button className="btn-ghost px-2.5" onClick={() => shift(1)} disabled={isCurrentMonth} aria-label="Next month">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted">
        {WEEKDAYS.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: lead }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
          const date = iso(d);
          const log = byDate.get(date);
          const future = date > today;
          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              disabled={future}
              className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl text-sm transition
                ${date === selected ? "bg-accent/15 ring-2 ring-accent" : "hover:bg-border/40"}
                ${future ? "opacity-30" : ""}`}
            >
              <span className={`tabular-nums ${date === today ? "font-bold text-accent" : ""}`}>{d}</span>
              <span className="flex gap-0.5">
                <Dot on={stepDates.has(date)} color={DOT.steps} />
                <Dot on={!!log && log.meals.length > 0} color={DOT.meals} />
                <Dot on={log?.weight != null} color={DOT.weight} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex justify-center gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1"><i className={`h-2 w-2 rounded-full ${DOT.steps}`} /> Steps</span>
        <span className="flex items-center gap-1"><i className={`h-2 w-2 rounded-full ${DOT.meals}`} /> Meals</span>
        <span className="flex items-center gap-1"><i className={`h-2 w-2 rounded-full ${DOT.weight}`} /> Weight</span>
      </div>
    </section>
  );
}
