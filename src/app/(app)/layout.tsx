"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getSelectedSiteId, setSelectedSiteId } from "@/lib/api";
import type { SessionResponse, Site } from "@/lib/types";
import { SessionContext } from "@/components/SessionContext";
import { DomainContext } from "@/components/DomainContext";
import { Sidebar } from "@/components/Sidebar";

/**
 * Client-side auth guard + account/domain loading. Loads the session and the
 * account's domains, picks a selected domain (persisted), and provides both to
 * the dashboard. Site-scoped API calls carry the selected domain automatically.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");

  const loadSites = useCallback(async () => {
    const { sites } = await api.get<{ sites: Site[] }>("/api/admin/sites");
    setSites(sites);
    return sites;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await api.get<SessionResponse>("/api/admin/auth/session");
        if (cancelled) return;
        setSession(s);
        const list = await loadSites();
        if (cancelled) return;
        const active = list.filter((x) => x.status === "active");
        const stored = getSelectedSiteId();
        const pick =
          active.find((x) => x.id === stored)?.id ??
          active[0]?.id ??
          list[0]?.id ??
          null;
        if (pick) {
          setSelectedSiteId(pick);
          setCurrentId(pick);
        }
        setState("ready");
      } catch {
        if (cancelled) return;
        setState("denied");
        router.replace("/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, loadSites]);

  const current = sites.find((s) => s.id === currentId) ?? sites[0];

  if (state !== "ready" || !session || !current) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
        {state === "denied" ? "Redirecting to sign in…" : "Loading…"}
      </div>
    );
  }

  return (
    <SessionContext.Provider value={session}>
      <DomainContext.Provider
        value={{
          sites,
          current,
          selectSite: (id) => {
            setSelectedSiteId(id);
            setCurrentId(id);
          },
          reloadSites: async () => {
            await loadSites();
          },
        }}
      >
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Top bar: which domain everything on the page applies to. */}
            <header className="flex flex-none items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-8 py-3.5 backdrop-blur">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="truncate text-sm font-semibold text-slate-800">
                  {current.name}
                </span>
                {current.verified ? (
                  <span className="inline-flex flex-none items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex flex-none items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Unverified
                  </span>
                )}
              </div>
              <span className="flex-none rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-slate-500">
                {current.planTier} plan
              </span>
            </header>
            <main className="app-scroll flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100/70 px-8 py-8">
              {/* Remount page content when the selected domain changes → refetch. */}
              <div key={current.id} className="mx-auto max-w-6xl animate-fade-in">
                {children}
              </div>
            </main>
          </div>
        </div>
      </DomainContext.Provider>
    </SessionContext.Provider>
  );
}
