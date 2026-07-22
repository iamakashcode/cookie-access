"use client";

import { useMemo, useRef, useState } from "react";

/**
 * Chart primitives for the dashboard.
 *
 * Palette: categorical slots 1 & 2 of the validated default theme
 * (blue #2a78d6 / orange #eb6834) — this pair passes the lightness band, chroma
 * floor, CVD separation, normal-vision floor and 3:1 contrast on a white
 * surface. Text never wears a series colour; identity comes from the mark
 * beside it plus an always-present legend.
 */
export const SERIES = {
  granted: "#2a78d6",
  withdrawn: "#eb6834",
} as const;

// Recessive chrome, one step off the white card surface.
const GRID = "#e7e9ee";
const AXIS = "#cbd5e1";
const MUTED = "#94a3b8";
const INK = "#0f172a";
const SURFACE = "#ffffff";

function niceMax(v: number): number {
  if (v <= 4) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) {
    const step = m * pow;
    if (step >= v) return step;
  }
  return 10 * pow;
}

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n);
}

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export interface DailyPoint {
  date: string;
  granted: number;
  withdrawn: number;
}

/** Tiny trend line for a metric card — same 2px line + 10% wash as the big chart. */
export function Sparkline({
  values,
  color,
}: {
  values: number[];
  color: string;
}) {
  const w = 100;
  const h = 26;
  if (values.length < 2) return <div style={{ height: h }} />;
  const max = Math.max(1, ...values);
  const pt = (v: number, i: number): [number, number] => [
    (i / (values.length - 1)) * w,
    h - 2 - (v / max) * (h - 6),
  ];
  const pts = values.map(pt);
  const line = pts
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full"
      style={{ height: h }}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={color} fillOpacity={0.12} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Consent activity over time — two series, so: legend always present, 2px
 * lines, 10% area wash, crosshair that snaps to the nearest day, and one
 * tooltip listing both series at that X.
 */
export function TrendChart({ data }: { data: DailyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const W = 760;
  const H = 240;
  const padL = 38;
  const padR = 16;
  const padT = 14;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const max = useMemo(
    () => niceMax(Math.max(1, ...data.flatMap((d) => [d.granted, d.withdrawn]))),
    [data],
  );

  const n = data.length;
  const x = (i: number) => padL + (n <= 1 ? plotW / 2 : (i * plotW) / (n - 1));
  const y = (v: number) => padT + plotH - (v / max) * plotH;

  const linePath = (key: "granted" | "withdrawn") =>
    data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d[key])}`).join(" ");
  const areaPath = (key: "granted" | "withdrawn") =>
    `${linePath(key)} L${x(n - 1)},${padT + plotH} L${x(0)},${padT + plotH} Z`;

  const ticks = [0, max / 2, max];
  // Label roughly every 7th day, always ending on the last day — and drop any
  // regular tick that would sit on top of that final label.
  const xTickIdx = useMemo(() => {
    const every = data.map((_, i) => i).filter((i) => i % 7 === 0);
    return [...every.filter((i) => n - 1 - i >= 5), n - 1];
  }, [data, n]);

  const total = data.reduce(
    (a, d) => ({ granted: a.granted + d.granted, withdrawn: a.withdrawn + d.withdrawn }),
    { granted: 0, withdrawn: 0 },
  );

  // End labels only when the two lines are far enough apart to stay attached to
  // their own line; otherwise the legend + tooltip carry it.
  const last = data[n - 1];
  const endGap = last ? Math.abs(y(last.granted) - y(last.withdrawn)) : 0;
  const showEndLabels = endGap >= 16;

  function onMove(e: React.PointerEvent) {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const frac = (e.clientX - r.left) / r.width;
    const px = frac * W;
    const i = Math.round(((px - padL) / plotW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  const hp = hover != null ? data[hover] : null;

  return (
    <div>
      {/* Legend — always present for two series */}
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <LegendKey color={SERIES.granted} label="Consent given" value={total.granted} />
        <LegendKey color={SERIES.withdrawn} label="Withdrawn" value={total.withdrawn} />
        <button
          onClick={() => setShowTable((s) => !s)}
          className="ml-auto rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
        >
          {showTable ? "View chart" : "View as table"}
        </button>
      </div>

      {showTable ? (
        <div className="max-h-[240px] overflow-y-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">Day</th>
                <th className="px-3 py-2 text-right font-medium">Given</th>
                <th className="px-3 py-2 text-right font-medium">Withdrawn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((d) => (
                <tr key={d.date}>
                  <td className="px-3 py-1.5 text-slate-600">{shortDate(d.date)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">
                    {d.granted}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">
                    {d.withdrawn}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          ref={wrapRef}
          className="relative"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
            {/* Gridlines — hairline, solid, recessive */}
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 ? AXIS : GRID}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={padL - 8}
                  y={y(t) + 3.5}
                  textAnchor="end"
                  fontSize={10}
                  fill={MUTED}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {fmt(t)}
                </text>
              </g>
            ))}

            {/* X axis labels */}
            {xTickIdx.map((i) => (
              <text
                key={i}
                x={x(i)}
                y={H - 8}
                textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                fontSize={10}
                fill={MUTED}
              >
                {shortDate(data[i].date)}
              </text>
            ))}

            {/* Area washes (~10%) then 2px lines */}
            <path d={areaPath("granted")} fill={SERIES.granted} fillOpacity={0.1} />
            <path d={areaPath("withdrawn")} fill={SERIES.withdrawn} fillOpacity={0.1} />
            <path
              d={linePath("granted")}
              fill="none"
              stroke={SERIES.granted}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={linePath("withdrawn")}
              fill="none"
              stroke={SERIES.withdrawn}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* Crosshair snapped to the nearest day */}
            {hover != null && (
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={padT}
                y2={padT + plotH}
                stroke={AXIS}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* End dots (r=4) with a 2px surface ring */}
            {last &&
              (["granted", "withdrawn"] as const).map((k) => (
                <circle
                  key={k}
                  cx={x(n - 1)}
                  cy={y(last[k])}
                  r={4}
                  fill={SERIES[k]}
                  stroke={SURFACE}
                  strokeWidth={2}
                />
              ))}

            {/* Hovered points */}
            {hp &&
              hover != null &&
              (["granted", "withdrawn"] as const).map((k) => (
                <circle
                  key={k}
                  cx={x(hover)}
                  cy={y(hp[k])}
                  r={4}
                  fill={SERIES[k]}
                  stroke={SURFACE}
                  strokeWidth={2}
                />
              ))}

            {/* Selective direct labels: endpoint only, and only when they don't collide */}
            {showEndLabels &&
              last &&
              (["granted", "withdrawn"] as const).map((k) => (
                <text
                  key={k}
                  x={x(n - 1) - 8}
                  y={y(last[k]) - 8}
                  textAnchor="end"
                  fontSize={11}
                  fontWeight={600}
                  fill={INK}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {last[k]}
                </text>
              ))}
          </svg>

          {/* One tooltip, every series — values lead, labels follow */}
          {hp && hover != null && (
            <div
              className="pointer-events-none absolute top-2 z-10 min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-pop"
              style={{
                left: `${(x(hover) / W) * 100}%`,
                transform:
                  hover > n * 0.66
                    ? "translateX(calc(-100% - 10px))"
                    : "translateX(10px)",
              }}
            >
              <div className="mb-1.5 text-[11px] font-medium text-slate-400">
                {shortDate(hp.date)}
              </div>
              <TooltipRow color={SERIES.granted} label="Given" value={hp.granted} />
              <TooltipRow
                color={SERIES.withdrawn}
                label="Withdrawn"
                value={hp.withdrawn}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LegendKey({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value?: number;
}) {
  return (
    <span className="flex items-center gap-2">
      {/* line key mirrors the mark (a line) */}
      <span
        aria-hidden
        className="inline-block h-[3px] w-4 rounded-full"
        style={{ background: color }}
      />
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {value != null && (
        <span className="text-xs tabular-nums text-slate-400">
          {value.toLocaleString("en-IN")}
        </span>
      )}
    </span>
  );
}

function TooltipRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span
        aria-hidden
        className="inline-block h-[3px] w-3 flex-none rounded-full"
        style={{ background: color }}
      />
      {/* value leads, label follows */}
      <span className="text-sm font-semibold tabular-nums text-slate-900">
        {value}
      </span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

export interface PurposeRow {
  purpose: string;
  granted: number;
  withdrawn: number;
}

/**
 * Consent by purpose — part-to-whole per purpose, horizontal because the
 * category names are long. Bars are ≤24px, square at the baseline with a 4px
 * rounded data-end, and a 2px surface gap separates the two segments.
 */
export function PurposeBars({ rows }: { rows: PurposeRow[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.granted + r.withdrawn));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <LegendKey color={SERIES.granted} label="Given" />
        <LegendKey color={SERIES.withdrawn} label="Withdrawn" />
      </div>

      {rows.map((r) => {
        const total = r.granted + r.withdrawn;
        const pctOfMax = (total / max) * 100;
        const gPct = total ? (r.granted / total) * 100 : 0;
        const isHover = hover === r.purpose; // hovered mark lifts
        return (
          <div
            key={r.purpose}
            className="relative"
            onPointerEnter={() => setHover(r.purpose)}
            onPointerLeave={() => setHover(null)}
            tabIndex={0}
            onFocus={() => setHover(r.purpose)}
            onBlur={() => setHover(null)}
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium text-slate-700">
                {r.purpose}
              </span>
              {/* Direct labels — both values are readable without hovering, so
                  nothing is gated behind the tooltip. */}
              <span className="flex-none text-xs tabular-nums text-slate-500">
                <span className="font-semibold text-slate-700">
                  {r.granted.toLocaleString("en-IN")}
                </span>{" "}
                given ·{" "}
                <span className="font-semibold text-slate-700">
                  {r.withdrawn.toLocaleString("en-IN")}
                </span>{" "}
                withdrawn
              </span>
            </div>

            <div className="h-[18px] w-full">
              <div
                className="flex h-full transition-all"
                style={{ width: `${Math.max(pctOfMax, 2)}%`, opacity: isHover ? 1 : 0.92 }}
              >
                {r.granted > 0 && (
                  <div
                    className="h-full"
                    style={{
                      width: `${gPct}%`,
                      background: SERIES.granted,
                      // square at the baseline, 4px rounded data-end if it's the last segment
                      borderRadius: r.withdrawn > 0 ? "0" : "0 4px 4px 0",
                      marginRight: r.withdrawn > 0 ? 2 : 0, // 2px surface gap
                    }}
                  />
                )}
                {r.withdrawn > 0 && (
                  <div
                    className="h-full flex-1"
                    style={{
                      background: SERIES.withdrawn,
                      borderRadius: "0 4px 4px 0",
                    }}
                  />
                )}
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}
