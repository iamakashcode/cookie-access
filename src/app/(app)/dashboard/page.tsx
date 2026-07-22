"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DashboardSummary, UsageInfo } from "@/lib/types";
import { Card, CardTitle, PageHeader, StatTile } from "@/components/ui";
import { UsageBar } from "@/components/UsageBar";

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

  const { totals, byPurpose, recentActivity } = data;

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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Consent by purpose</CardTitle>
          {byPurpose.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              No consent recorded yet. Install the widget to start collecting.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {byPurpose.map((p) => {
                const total = p.granted + p.withdrawn || 1;
                const pct = Math.round((p.granted / total) * 100);
                return (
                  <div key={p.purpose}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        {p.purpose}
                      </span>
                      <span className="text-xs text-slate-400">
                        {p.granted} on · {p.withdrawn} off
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
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
