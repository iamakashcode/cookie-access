"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Badge, Button, Card, EmptyState, ErrorNote, PageHero } from "@/components/ui";

interface SuperDomain {
  id: string;
  name: string;
  domain: string | null;
  account: string;
  contactEmail: string;
  planTier: string;
  status: "active" | "suspended";
  verified: boolean;
  subscriptionStatus: string | null;
  createdAt: string;
  usage: { sessions: number; limit: number; percent: number };
  counts: { consentRecords: number; dprRequests: number };
}

type Filter = "all" | "active" | "suspended" | "unverified" | "paid";

export default function SuperDomains() {
  const [sites, setSites] = useState<SuperDomain[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ sites: SuperDomain[] }>("/api/super/sites");
      setSites(r.sites);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function update(id: string, body: { status?: string; planTier?: string }) {
    setError(null);
    try {
      await api.patch(`/api/super/sites/${id}`, body);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const shown = useMemo(() => {
    let list = sites;
    if (filter === "active") list = list.filter((s) => s.status === "active");
    if (filter === "suspended") list = list.filter((s) => s.status !== "active");
    if (filter === "unverified") list = list.filter((s) => !s.verified);
    if (filter === "paid") list = list.filter((s) => s.planTier !== "free");
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(t) ||
          (s.domain ?? "").toLowerCase().includes(t) ||
          s.account.toLowerCase().includes(t),
      );
    }
    return list;
  }, [sites, filter, q]);

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: `All (${sites.length})` },
    { id: "active", label: "Active" },
    { id: "paid", label: "Paid" },
    { id: "unverified", label: "Unverified" },
    { id: "suspended", label: "Suspended" },
  ];

  return (
    <>
      <PageHero
        tone="sky"
        icon="▤"
        title="Domains"
        subtitle="Every website running the consent widget, across all accounts — with this month's traffic and plan."
        action={
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search domain or account…"
            className="w-56 px-3 py-2 text-sm"
          />
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      <div className="mb-4 inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              filter === f.id
                ? "bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : shown.length === 0 ? (
        <EmptyState icon="▤" title="No domains match this view" />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <Th>Domain</Th>
                  <Th>Account</Th>
                  <Th>Plan</Th>
                  <Th>Traffic (month)</Th>
                  <Th>Data</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 [&_tr:hover]:bg-slate-50/60">
                {shown.map((s) => (
                  <tr key={s.id}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{s.name}</span>
                        {s.verified ? (
                          <Badge color="success">✓</Badge>
                        ) : (
                          <Badge color="warning">unverified</Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{s.domain || "—"}</div>
                    </Td>
                    <Td>
                      <div className="text-slate-700">{s.account}</div>
                      <div className="text-xs text-slate-400">{s.contactEmail}</div>
                    </Td>
                    <Td>
                      <select
                        value={s.planTier}
                        onChange={(e) => update(s.id, { planTier: e.target.value })}
                        className="px-2 py-1 text-sm"
                      >
                        <option value="free">free</option>
                        <option value="starter">starter</option>
                        <option value="growth">growth</option>
                      </select>
                    </Td>
                    <Td>
                      <div className="mb-1 text-xs tabular-nums text-slate-600">
                        {s.usage.sessions.toLocaleString("en-IN")} /{" "}
                        {s.usage.limit.toLocaleString("en-IN")}
                      </div>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            s.usage.percent >= 100
                              ? "bg-red-500"
                              : s.usage.percent >= 80
                                ? "bg-amber-500"
                                : "bg-gradient-to-r from-sky-500 to-cyan-600"
                          }`}
                          style={{ width: `${Math.min(100, s.usage.percent)}%` }}
                        />
                      </div>
                    </Td>
                    <Td>
                      <div className="text-xs text-slate-500">
                        {s.counts.consentRecords.toLocaleString("en-IN")} consents
                      </div>
                      <div className="text-xs text-slate-400">
                        {s.counts.dprRequests} requests
                      </div>
                    </Td>
                    <Td>
                      {s.status === "active" ? (
                        <Badge color="success">active</Badge>
                      ) : (
                        <Badge color="danger">suspended</Badge>
                      )}
                    </Td>
                    <Td>
                      {s.status === "active" ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => update(s.id, { status: "suspended" })}
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => update(s.id, { status: "active" })}
                        >
                          Reactivate
                        </Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="px-4 py-3 font-medium">{children}</th>
);
const Td = ({ children }: { children: React.ReactNode }) => (
  <td className="px-4 py-3 align-top text-slate-700">{children}</td>
);
