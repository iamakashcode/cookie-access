"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { DashboardSummary, UsageInfo } from "@/lib/types";
import { useDomains } from "@/components/DomainContext";
import { Card, CardTitle, MetricCard } from "@/components/ui";
import { UsageBar } from "@/components/UsageBar";
import { PurposeBars, SERIES, Sparkline, TrendChart } from "@/components/charts";

export default function DashboardPage() {
  const { current } = useDomains();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardSummary>("/api/admin/dashboard/summary")
      .then(setData)
      .catch((e) => setError(e.message));
    api
      .get<UsageInfo>("/api/admin/usage")
      .then(setUsage)
      .catch(() => {});
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data)
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-3xl bg-slate-200/70" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      </div>
    );

  const { totals, byPurpose, recentActivity, daily } = data;
  const series = daily ?? [];
  const last7 = series.slice(-7);
  const prev7 = series.slice(-14, -7);
  const given7 = last7.reduce((a, d) => a + d.granted, 0);
  const givenPrev7 = prev7.reduce((a, d) => a + d.granted, 0);
  const withdrawn7 = last7.reduce((a, d) => a + d.withdrawn, 0);
  const decided = totals.grants + totals.withdrawals;
  const acceptRate = decided ? Math.round((totals.grants / decided) * 100) : 0;

  const trend =
    givenPrev7 === 0
      ? given7 > 0
        ? "New"
        : "—"
      : `${given7 >= givenPrev7 ? "+" : ""}${Math.round(((given7 - givenPrev7) / givenPrev7) * 100)}%`;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-7 shadow-pop">
        <div className="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/4 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative flex flex-wrap items-center justify-between gap-8">
          <div className="min-w-[16rem] flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-200/70">
              Overview · {current.name}
            </p>
            <div className="mt-3 flex items-baseline gap-3">
              {/* hero figure — the one number this view leads with */}
              <span className="text-5xl font-bold leading-none tracking-tight text-white">
                {totals.grants.toLocaleString("en-IN")}
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-white/15">
                {trend} vs last week
              </span>
            </div>
            <p className="mt-2 text-sm text-indigo-100/70">
              consents collected · {given7.toLocaleString("en-IN")} in the last 7
              days
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <HeroLink href="/consent-log">View records</HeroLink>
              <HeroLink href="/appearance">Design banner</HeroLink>
              <HeroLink href="/install">Install</HeroLink>
            </div>
          </div>

          {/* Two supporting meters in a glass panel */}
          <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:w-auto sm:min-w-[21rem] sm:flex-1">
            <HeroMeter
              label="Acceptance rate"
              value={`${acceptRate}%`}
              pct={acceptRate}
              barClass="bg-gradient-to-r from-sky-400 to-indigo-400"
              note={`${totals.grants.toLocaleString("en-IN")} of ${decided.toLocaleString("en-IN")} decisions`}
            />
            {usage && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <HeroMeter
                  label="Visitors this month"
                  value={`${usage.sessions.toLocaleString("en-IN")}`}
                  pct={Math.min(100, usage.percent)}
                  barClass={
                    usage.over
                      ? "bg-gradient-to-r from-rose-400 to-red-500"
                      : usage.warn
                        ? "bg-gradient-to-r from-amber-300 to-orange-400"
                        : "bg-gradient-to-r from-emerald-400 to-teal-400"
                  }
                  note={`of ${usage.limit.toLocaleString("en-IN")} on the ${usage.planTier} plan`}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Only surface the usage card when it actually needs attention */}
      {usage && (usage.warn || usage.over) && <UsageBar usage={usage} />}

      {/* ── Metrics ──────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Consents given"
          value={totals.grants.toLocaleString("en-IN")}
          tone="sky"
          icon="✓"
          delta={{ value: trend }}
          footer={
            <Sparkline
              values={series.map((d) => d.granted)}
              color={SERIES.granted}
            />
          }
        />
        <MetricCard
          label="Withdrawn"
          value={totals.withdrawals.toLocaleString("en-IN")}
          tone="orange"
          icon="↺"
          hint={`${withdrawn7} in the last 7 days`}
          footer={
            <Sparkline
              values={series.map((d) => d.withdrawn)}
              color={SERIES.withdrawn}
            />
          }
        />
        <MetricCard
          label="People tracked"
          value={totals.trackedPeople.toLocaleString("en-IN")}
          tone="violet"
          icon="◕"
          hint={`${totals.activePurposes} active purposes`}
          footer={
            <Link
              href="/consent-log"
              className="text-xs font-semibold text-slate-600 hover:underline"
            >
              View records →
            </Link>
          }
        />
        <MetricCard
          label="Open requests"
          value={totals.openDprRequests.toLocaleString("en-IN")}
          tone={totals.openDprRequests > 0 ? "rose" : "emerald"}
          icon="✎"
          hint="Access / correction / erasure"
          footer={
            <Link
              href="/requests"
              className="text-xs font-semibold text-slate-600 hover:underline"
            >
              Open queue →
            </Link>
          }
        />
      </div>

      {/* ── Trend ────────────────────────────────────────────────────── */}
      <Card className="mb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs text-white shadow-sm">
              ◔
            </span>
            <CardTitle>Consent activity</CardTitle>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
            Last 30 days
          </span>
        </div>
        {series.length > 0 ? (
          <TrendChart data={series} />
        ) : (
          <EmptyHint>
            No activity yet. Install the widget to start collecting consent.
          </EmptyHint>
        )}
      </Card>

      {/* ── Split ────────────────────────────────────────────────────── */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 text-xs text-white shadow-sm">
              ☑
            </span>
            <CardTitle>Consent by purpose</CardTitle>
          </div>
          {byPurpose.length === 0 ? (
            <EmptyHint>Nothing recorded yet.</EmptyHint>
          ) : (
            <PurposeBars rows={byPurpose} />
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-xs text-white shadow-sm">
              ≣
            </span>
            <CardTitle>Recent activity</CardTitle>
          </div>
          {recentActivity.length === 0 ? (
            <EmptyHint>Nothing yet.</EmptyHint>
          ) : (
            <ol className="relative space-y-3.5 before:absolute before:bottom-3 before:left-[13px] before:top-3 before:w-px before:bg-slate-200">
              {recentActivity.slice(0, 6).map((r) => {
                const given = r.action === "granted";
                return (
                  <li key={r.id} className="relative flex items-start gap-3 pl-9">
                    <span
                      className={`absolute left-0 top-0 flex h-[27px] w-[27px] items-center justify-center rounded-full text-[11px] font-bold text-white ring-4 ring-white ${
                        given
                          ? "bg-gradient-to-br from-sky-400 to-blue-600"
                          : "bg-gradient-to-br from-orange-400 to-orange-600"
                      }`}
                    >
                      {given ? "✓" : "↺"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {given ? "Consent given" : "Consent withdrawn"}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {r.purpose} · via {r.method}
                      </p>
                    </div>
                    <span className="flex-none whitespace-nowrap text-[11px] text-slate-400">
                      {new Date(r.timestamp).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          {recentActivity.length > 6 && (
            <Link
              href="/consent-log"
              className="mt-4 block rounded-lg border border-slate-200 py-2 text-center text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              View all records →
            </Link>
          )}
        </Card>
      </div>
    </>
  );
}

function HeroLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-indigo-100 transition hover:bg-white/15 hover:text-white"
    >
      {children}
    </Link>
  );
}

function HeroMeter({
  label,
  value,
  pct,
  barClass,
  note,
}: {
  label: string;
  value: string;
  pct: number;
  barClass: string;
  note: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-200/70">
          {label}
        </span>
        <span className="text-lg font-bold leading-none text-white">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${barClass}`}
          style={{ width: `${Math.max(pct, 1.5)}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-indigo-100/60">{note}</p>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
      {children}
    </div>
  );
}
