"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  PageHero,
} from "@/components/ui";

interface Account {
  id: string;
  businessName: string;
  contactEmail: string;
  status: "active" | "suspended";
  createdAt: string;
  admins: { email: string; role: string; createdAt: string }[];
  sites: {
    id: string;
    name: string;
    domain: string | null;
    planTier: string;
    status: string;
    verified: boolean;
  }[];
  siteCount: number;
  paidSites: number;
  verifiedSites: number;
}

export default function SuperAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ accounts: Account[] }>(
        `/api/super/accounts${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      );
      setAccounts(r.accounts);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0); // debounce search
    return () => clearTimeout(t);
  }, [load, q]);

  async function setStatus(id: string, status: "active" | "suspended") {
    if (
      status === "suspended" &&
      !confirm(
        "Suspend this account?\n\nAll of its domains stop serving the consent widget until you reactivate it.",
      )
    )
      return;
    setError(null);
    try {
      await api.patch(`/api/super/accounts/${id}`, { status });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const totalDomains = accounts.reduce((a, x) => a + x.siteCount, 0);

  return (
    <>
      <PageHero
        tone="emerald"
        icon="◕"
        title="Accounts"
        subtitle="Every business using the platform. Suspend an account to stop all of its domains at once."
        action={
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email…"
            className="w-56 px-3 py-2 text-sm"
          />
        }
      >
        <div className="flex flex-wrap gap-5 text-sm">
          <Stat label="Accounts" value={accounts.length} />
          <Stat label="Domains" value={totalDomains} />
          <Stat
            label="Suspended"
            value={accounts.filter((a) => a.status !== "active").length}
          />
        </div>
      </PageHero>

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon="◕"
          title={q ? "No accounts match that search" : "No accounts yet"}
        />
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => {
            const expanded = open === a.id;
            return (
              <Card
                key={a.id}
                className={`transition duration-200 hover:shadow-card-hover ${a.status !== "active" ? "ring-1 ring-red-200" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3.5">
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-sm">
                      {a.businessName.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {a.businessName}
                        </span>
                        {a.status === "active" ? (
                          <Badge color="success">Active</Badge>
                        ) : (
                          <Badge color="danger">Suspended</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-slate-500">
                        {a.contactEmail}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {a.siteCount} domain{a.siteCount === 1 ? "" : "s"} ·{" "}
                        {a.paidSites} paid · {a.verifiedSites} verified · joined{" "}
                        {new Date(a.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-none gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setOpen(expanded ? null : a.id)}
                    >
                      {expanded ? "Hide" : "Details"}
                    </Button>
                    {a.status === "active" ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setStatus(a.id, "suspended")}
                      >
                        Suspend
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setStatus(a.id, "active")}>
                        Reactivate
                      </Button>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
                    <div>
                      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Team ({a.admins.length})
                      </h3>
                      <ul className="space-y-1.5">
                        {a.admins.map((u) => (
                          <li
                            key={u.email}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="truncate text-slate-700">{u.email}</span>
                            <Badge color={u.role === "owner" ? "brand" : "neutral"}>
                              {u.role}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Domains ({a.sites.length})
                      </h3>
                      <ul className="space-y-1.5">
                        {a.sites.map((s) => (
                          <li
                            key={s.id}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <span className="min-w-0 truncate text-slate-700">
                              {s.name}
                              {s.domain && (
                                <span className="ml-1.5 text-xs text-slate-400">
                                  {s.domain}
                                </span>
                              )}
                            </span>
                            <span className="flex flex-none items-center gap-1.5">
                              {s.verified && <Badge color="success">✓</Badge>}
                              <Badge
                                color={s.planTier === "free" ? "neutral" : "brand"}
                              >
                                {s.planTier}
                              </Badge>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="text-lg font-bold text-slate-900">{value}</div>
    </div>
  );
}
