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
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-slate-50 px-8 py-8">
            {/* Remount page content when the selected domain changes → refetch. */}
            <div key={current.id} className="mx-auto max-w-5xl">
              {children}
            </div>
          </main>
        </div>
      </DomainContext.Provider>
    </SessionContext.Provider>
  );
}
