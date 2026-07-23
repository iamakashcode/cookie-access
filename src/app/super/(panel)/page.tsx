"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, EmptyState, MetricCard, PageHero, SectionHeader } from "@/components/ui";
import { SERIES, TrendChart, type DailyPoint } from "@/components/charts";

interface Stats {
  totals: {
    accounts: number;
    sites: number;
    activeSites: number;
    consentRecords: number;
    openRequests: number;
    breaches: number;
    people: number;
    mrr: number;
    paidSites: number;
    sessionsThisMonth: number;
    allowance: number;
  };
  planMix: { tier: string; count: number }[];
  subscriptions: { status: string; count: number }[];
  signups: { date: string; count: number }[];
  consentDaily: DailyPoint[];
  recentAccounts: {
    id: string;
    businessName: string;
    contactEmail: string;
    createdAt: string;
    sites: number;
  }[];
}

const PLAN_COLOR: Record<string, string> = {
  free: "bg-slate-300",
  starter: "bg-brand-500",
  growth: "bg-violet-500",
};

export default function SuperAnalytics() {
  const [d, setD] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Stats>("/api/super/stats")
      .then(setD)
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!d) return <p className="text-sm text-slate-400">Loading…</p>;

  const t = d.totals;
  const signups30 = d.signups.reduce((a, s) => a + s.count, 0);
  const totalPlans = d.planMix.reduce((a, p) => a + p.count, 0) || 1;
  const usagePct = t.allowance ? Math.round((t.sessionsThisMonth / t.allowance) * 100) : 0;

  return (
    <>
      <PageHero
        tone="indigo"
        icon="▚"
        title="Platform analytics"
        subtitle="How the whole platform is performing — accounts, traffic, consent volume and revenue across every customer."
      />

      {/* Money + scale headline */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-violet-700 p-5 text-white shadow-pop">
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
              Monthly recurring revenue
            </div>
            <div className="mt-2 text-3xl font-bold tracking-tight">
              ₹{t.mrr.toLocaleString("en-IN")}
            </div>
            <div className="mt-1 text-xs text-white/70">
              from {t.paidSites} paid domain{t.paidSites === 1 ? "" : "s"}
            </div>
          </div>
        </div>
        <MetricCard label="Accounts" value={t.accounts} icon="◕" tone="violet" hint={`${signups30} new in 30 days`} />
        <MetricCard label="Domains" value={t.sites} icon="▤" tone="emerald" hint={`${t.activeSites} active`} />
        <MetricCard
          label="Visitors this month"
          value={t.sessionsThisMonth.toLocaleString("en-IN")}
          icon="◔"
          tone="orange"
          hint={`${usagePct}% of sold allowance`}
        />
      </div>

      {/* Consent volume across the platform */}
      <Card className="mb-6">
        <SectionHeader
          tone="indigo"
          icon="▚"
          title="Consent activity — all customers"
          right={
            <span className="text-xs font-medium text-slate-400">Last 30 days</span>
          }
        />
        {d.consentDaily.length ? (
          <TrendChart data={d.consentDaily} />
        ) : (
          <EmptyState title="No consent activity yet" />
        )}
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Signups */}
        <Card>
          <SectionHeader
            tone="emerald"
            icon="◕"
            title="New accounts"
            right={
              <span className="text-xs font-medium text-slate-400">
                {signups30} in 30 days
              </span>
            }
          />
          <MiniBars data={d.signups} />
        </Card>

        {/* Plan mix */}
        <Card>
          <SectionHeader tone="violet" icon="◈" title="Plan mix" />
          <div className="space-y-3">
            {d.planMix.map((p) => {
              const pct = Math.round((p.count / totalPlans) * 100);
              return (
                <div key={p.tier}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium capitalize text-slate-700">
                      {p.tier}
                    </span>
                    <span className="text-xs tabular-nums text-slate-500">
                      {p.count} domain{p.count === 1 ? "" : "s"} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${PLAN_COLOR[p.tier] ?? "bg-slate-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
            <Mini label="People" value={t.people} />
            <Mini label="Consents" value={t.consentRecords} />
            <Mini label="Open requests" value={t.openRequests} />
          </div>
        </Card>
      </div>

      {/* Newest accounts */}
      <Card>
        <SectionHeader
          tone="sky"
          icon="◕"
          title="Newest accounts"
          right={
            <Link
              href="/super/accounts"
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              View all →
            </Link>
          }
        />
        {d.recentAccounts.length === 0 ? (
          <EmptyState title="No accounts yet" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {d.recentAccounts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 text-xs font-bold text-white">
                    {a.businessName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800">
                      {a.businessName}
                    </div>
                    <div className="truncate text-xs text-slate-400">
                      {a.contactEmail}
                    </div>
                  </div>
                </div>
                <div className="flex flex-none items-center gap-3 text-xs text-slate-400">
                  <span>{a.sites} domain{a.sites === 1 ? "" : "s"}</span>
                  <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-bold text-slate-900">
        {value.toLocaleString("en-IN")}
      </div>
    </div>
  );
}

/** Single-series daily bars — one hue, so no legend needed (the title names it). */
function MiniBars({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div>
      <div className="flex h-28 items-end gap-[3px]">
        {data.map((d) => (
          <div
            key={d.date}
            className="group relative flex-1"
            style={{ height: "100%" }}
          >
            <div
              className="absolute bottom-0 w-full rounded-t-[3px] transition-all"
              style={{
                height: `${Math.max((d.count / max) * 100, d.count ? 6 : 2)}%`,
                background: d.count ? SERIES.granted : "#e7e9ee",
              }}
            />
            <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-pop group-hover:block">
              {d.count} · {new Date(`${d.date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
        <span>
          {new Date(`${data[0]?.date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}
        </span>
        <span>Today</span>
      </div>
    </div>
  );
}
