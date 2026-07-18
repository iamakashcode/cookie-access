"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";
import { Card, PageHeader, StatTile } from "@/components/ui";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardSummary>("/api/admin/dashboard/summary")
      .then(setData)
      .catch((e) => setError(e.message));
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

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Consents given" value={totals.grants} />
        <StatTile label="Consents withdrawn" value={totals.withdrawals} />
        <StatTile label="People tracked" value={totals.trackedPeople} />
        <StatTile
          label="Open requests"
          value={totals.openDprRequests}
          hint="Access / correction / erasure"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            Consent by purpose
          </h2>
          {byPurpose.length === 0 ? (
            <p className="text-sm text-slate-400">
              No consent recorded yet. Install the widget to start collecting.
            </p>
          ) : (
            <div className="space-y-3">
              {byPurpose.map((p) => {
                const total = p.granted + p.withdrawn || 1;
                const pct = Math.round((p.granted / total) * 100);
                return (
                  <div key={p.purpose}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-700">{p.purpose}</span>
                      <span className="text-slate-400">
                        {p.granted} on · {p.withdrawn} off
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
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
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            Recent activity
          </h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentActivity.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-slate-700">
                    <span
                      className={
                        r.action === "granted"
                          ? "font-medium text-emerald-600"
                          : "font-medium text-amber-600"
                      }
                    >
                      {r.action === "granted" ? "Consent given" : "Withdrawn"}
                    </span>{" "}
                    · {r.purpose}
                  </span>
                  <span className="text-xs text-slate-400">
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
