"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { SuperSite } from "@/lib/types";

export default function SuperDashboard() {
  const router = useRouter();
  const [sites, setSites] = useState<SuperSite[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const { sites } = await api.get<{ sites: SuperSite[] }>("/api/super/sites");
      setSites(sites);
      setState("ready");
    } catch {
      setState("denied");
      router.replace("/super/login");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function update(id: string, body: { status?: string; planTier?: string }) {
    setError(null);
    try {
      await api.patch(`/api/super/sites/${id}`, body);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function logout() {
    await api.post("/api/super/logout").catch(() => {});
    router.replace("/super/login");
  }

  if (state !== "ready")
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
        Loading…
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Platform admin</h1>
          <p className="text-sm text-slate-500">
            {sites.length} domain{sites.length === 1 ? "" : "s"} across all accounts
          </p>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Domain</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Usage</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sites.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{s.name}</div>
                  <div className="text-xs text-slate-400">{s.domain || "—"}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-slate-700">{s.account}</div>
                  <div className="text-xs text-slate-400">{s.contactEmail}</div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={s.planTier}
                    onChange={(e) => update(s.id, { planTier: e.target.value })}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  >
                    <option value="free">free</option>
                    <option value="starter">starter</option>
                    <option value="growth">growth</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {s.counts.consentRecords} consents · {s.counts.dprRequests} requests
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      s.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {s.status === "active" ? (
                    <button
                      onClick={() => update(s.id, { status: "suspended" })}
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      onClick={() => update(s.id, { status: "active" })}
                      className="rounded-lg border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
                    >
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
