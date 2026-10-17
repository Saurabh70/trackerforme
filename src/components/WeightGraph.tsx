"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Profile } from "@/lib/types";
import { parseISO } from "@/lib/dates";
import type { WeighIn } from "@/lib/stats";

const H = 200;
const PAD = { top: 16, right: 76, bottom: 24, left: 32 };

const fmtDate = (s: string, long = false) =>
  parseISO(s).toLocaleDateString(undefined, long ? { weekday: "short", month: "short", day: "numeric" } : { month: "short", day: "numeric" });

/** Spread gutter labels so none sit closer than `gap` px, keeping their order. */
function spread<T extends { y: number }>(items: T[], gap: number, min: number, max: number): T[] {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].y - sorted[i - 1].y < gap) sorted[i].y = sorted[i - 1].y + gap;
  }
  const overflow = sorted.at(-1)!.y - max;
  if (overflow > 0) sorted.forEach((s) => (s.y -= overflow));
  for (let i = sorted.length - 2; i >= 0; i--) {
    if (sorted[i + 1].y - sorted[i].y < gap) sorted[i].y = sorted[i + 1].y - gap;
  }
  if (sorted[0].y < min) {
    const d = min - sorted[0].y;
    sorted.forEach((s) => (s.y += d));
  }
  return sorted;
}

export default function WeightGraph({ profile, points }: { profile: Profile; points: WeighIn[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const [hover, setHover] = useState<number | null>(null);
  const u = profile.unit;
  const start = Number(profile.start_weight);
  const target = Number(profile.target_weight);
  const current = points.at(-1)?.weight ?? start;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const g = useMemo(() => {
    const vals = [start, target, ...points.map((p) => p.weight)];
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = Math.max(0.5, (hi - lo) * 0.12);
    const y0 = lo - pad;
    const y1 = hi + pad;
    const iw = w - PAD.left - PAD.right;
    const ih = H - PAD.top - PAD.bottom;
    const y = (v: number) => PAD.top + ((y1 - v) / (y1 - y0)) * ih;

    const t = points.map((p) => parseISO(p.date).getTime());
    const t0 = t[0];
    const t1 = t.at(-1);
    const x = (i: number) =>
      points.length <= 1 || t1 === t0 ? PAD.left + iw / 2 : PAD.left + ((t[i] - t0) / (t1! - t0)) * iw;

    // ~4 "nice" gridlines
    const step = [0.5, 1, 2, 5, 10, 20, 50].find((s) => (y1 - y0) / s <= 4) ?? 100;
    const ticks: number[] = [];
    for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) ticks.push(Math.round(v * 10) / 10);

    const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.weight).toFixed(1)}`).join("");

    const labels = spread(
      [
        { key: "now", text: "Now", value: current, y: y(current) },
        { key: "start", text: "Start", value: start, y: y(start) },
        { key: "target", text: "Target", value: target, y: y(target) },
      ],
      26,
      PAD.top + 4,
      H - PAD.bottom - 4,
    );

    return { x, y, ticks, line, labels, iw };
  }, [points, start, target, current, w]);

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!points.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(g.x(i) - px) < Math.abs(g.x(best) - px)) best = i;
    }
    setHover(best);
  }

  const hp = hover != null ? points[hover] : null;
  const lastI = points.length - 1;

  return (
    <div ref={wrap} className="relative">
      <svg
        width={w}
        height={H}
        viewBox={`0 0 ${w} ${H}`}
        className="block touch-none select-none"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Weight chart. Current ${current.toFixed(1)} ${u}, start ${start.toFixed(1)} ${u}, target ${target.toFixed(1)} ${u}.`}
      >
        {/* gridlines + y labels */}
        {g.ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={PAD.left + g.iw} y1={g.y(v)} y2={g.y(v)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.left - 8} y={g.y(v)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)" className="tabular-nums">
              {Number.isInteger(v) ? v : v.toFixed(1)}
            </text>
          </g>
        ))}

        {/* start + target reference lines */}
        {[
          { v: start, key: "start" },
          { v: target, key: "target" },
        ].map((r) => (
          <line key={r.key} x1={PAD.left} x2={PAD.left + g.iw} y1={g.y(r.v)} y2={g.y(r.v)}
            stroke={r.key === "target" ? "var(--foreground)" : "var(--muted)"} strokeOpacity={r.key === "target" ? 0.55 : 0.6}
            strokeWidth={1} strokeDasharray="4 4" />
        ))}

        {/* series */}
        {points.length > 1 && (
          <path d={g.line} fill="none" stroke="var(--weight)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* hover crosshair */}
        {hp && (
          <g>
            <line x1={g.x(hover!)} x2={g.x(hover!)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--muted)" strokeOpacity={0.5} strokeWidth={1} />
            <circle cx={g.x(hover!)} cy={g.y(hp.weight)} r={5} fill="var(--weight)" stroke="var(--card)" strokeWidth={2} />
          </g>
        )}

        {/* current marker */}
        {points.length > 0 && (
          <circle cx={g.x(lastI)} cy={g.y(points[lastI].weight)} r={5} fill="var(--weight)" stroke="var(--card)" strokeWidth={2} />
        )}

        {/* x labels */}
        {points.length > 0 && (
          <>
            <text x={g.x(0)} y={H - 6} fontSize={11} fill="var(--muted)" textAnchor={points.length > 1 ? "start" : "middle"}>
              {fmtDate(points[0].date)}
            </text>
            {points.length > 1 && (
              <text x={g.x(lastI)} y={H - 6} fontSize={11} fill="var(--muted)" textAnchor="end">
                {fmtDate(points[lastI].date)}
              </text>
            )}
          </>
        )}

        {/* right-gutter direct labels */}
        {g.labels.map((l) => (
          <g key={l.key} transform={`translate(${PAD.left + g.iw + 10},${l.y})`}>
            {l.key === "now" && <circle cx={3} cy={-5} r={3} fill="var(--weight)" />}
            <text x={l.key === "now" ? 10 : 0} y={-1} fontSize={11} fill="var(--muted)">{l.text}</text>
            <text x={0} y={12} fontSize={13} fontWeight={l.key === "now" ? 700 : 600} fill="var(--foreground)" className="tabular-nums">
              {l.value.toFixed(1)}
            </text>
          </g>
        ))}
      </svg>

      {points.length === 0 && (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 pr-[76px] text-center text-[13px] text-muted">
          Add your weight to start the trend line
        </p>
      )}

      {hp && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12px] shadow-md"
          style={{ left: Math.min(Math.max(g.x(hover!), 70), w - 70), top: Math.max(0, g.y(hp.weight) - 52) }}
        >
          <div className="text-muted">{fmtDate(hp.date, true)}</div>
          <div className="font-semibold tabular-nums">{hp.weight.toFixed(1)} {u}</div>
        </div>
      )}

      <table className="sr-only">
        <caption>Weight log</caption>
        <thead><tr><th>Date</th><th>Weight ({u})</th></tr></thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}><td>{p.date}</td><td>{p.weight}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
