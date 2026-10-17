import type { DailyLog, Profile } from "./types";


export type WeighIn = { date: string; weight: number };

export function weighIns(logs: DailyLog[]): WeighIn[] {
  return logs
    .filter((l) => l.weight != null)
    .map((l) => ({ date: l.log_date, weight: Number(l.weight) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Closest earlier weigh-in before `date`. */
export function previousWeight(points: WeighIn[], date: string): WeighIn | undefined {
  for (let i = points.length - 1; i >= 0; i--) if (points[i].date < date) return points[i];
  return undefined;
}

/** Signed change that counts as "good" (positive = moved toward target). */
export function towardTarget(profile: Profile, from: number, to: number): number {
  const target = Number(profile.target_weight);
  return Math.abs(from - target) - Math.abs(to - target);
}

export function progress(profile: Profile, current: number | undefined) {
  const start = Number(profile.start_weight);
  const target = Number(profile.target_weight);
  const now = current ?? start;
  const total = Math.abs(start - target);
  const done = total === 0 ? 1 : (Math.abs(start - target) - Math.abs(now - target)) / total;
  const pct = Math.max(0, Math.min(1, done));
  return { start, target, now, pct, left: Math.abs(now - target), reached: total === 0 || Math.sign(start - target) !== Math.sign(now - target) || now === target };
}

export function dayTotals(log: DailyLog | undefined) {
  const meals = log?.meals ?? [];
  return {
    calories: meals.reduce((a, m) => a + (m.calories ?? 0), 0),
    protein: meals.reduce((a, m) => a + Number(m.protein_g ?? 0), 0),
    count: meals.length,
  };
}
