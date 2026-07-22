"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DashboardSummary, UsageInfo } from "@/lib/types";
import { Card, CardTitle, PageHeader, StatTile } from "@/components/ui";
import { UsageBar } from "@/components/UsageBar";
import { PurposeBars, TrendChart } from "@/components/charts";

export default function DashboardPage() {
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
  if (!data) return <p className="text-sm text-slate-400">Loading…</p>;

  const { totals, byPurpose, recentActivity, daily } = data;
  const last7 = (daily ?? []).slice(-7).reduce((a, d) => a + d.granted, 0);

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="A snapshot of the consent you've collected and any open requests."
      />

      {usage && <UsageBar usage={usage} />}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Consents given"
          value={totals.grants}
          icon="✓"
          accent="emerald"
        />
        <StatTile
          label="Consents withdrawn"
          value={totals.withdrawals}
          icon="↺"
          accent="amber"
        />
        <StatTile
          label="People tracked"
          value={totals.trackedPeople}
          icon="◕"
          accent="brand"
        />
        <StatTile
          label="Open requests"
          value={totals.openDprRequests}
          hint="Access / correction / erasure"
          icon="✎"
          accent="slate"
        />
      </div>

      {/* Trend — the dashboard's centrepiece */}
      <Card className="mb-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <CardTitle>Consent activity</CardTitle>
          <span className="text-xs font-medium text-slate-400">
            Last 30 days · {last7.toLocaleString("en-IN")} given in the last 7
          </span>
        </div>
        {daily && daily.length > 0 ? (
          <TrendChart data={daily} />
        ) : (
          <p className="py-10 text-center text-sm text-slate-400">
            No activity yet. Install the widget to start collecting consent.
          </p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4">
            <CardTitle>Consent by purpose</CardTitle>
          </div>
          {byPurpose.length === 0 ? (
            <p className="text-sm text-slate-400">
              No consent recorded yet. Install the widget to start collecting.
            </p>
          ) : (
            <PurposeBars rows={byPurpose} />
          )}
        </Card>

        <Card>
          <CardTitle>Recent activity</CardTitle>
          {recentActivity.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Nothing yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {recentActivity.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs ${
                        r.action === "granted"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {r.action === "granted" ? "✓" : "↺"}
                    </span>
                    <span className="truncate text-slate-700">
                      <span
                        className={
                          r.action === "granted"
                            ? "font-semibold text-emerald-700"
                            : "font-semibold text-amber-700"
                        }
                      >
                        {r.action === "granted" ? "Consent given" : "Withdrawn"}
                      </span>{" "}
                      · {r.purpose}
                    </span>
                  </span>
                  <span className="flex-none text-xs text-slate-400">
                    {new Date(r.timestamp).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
