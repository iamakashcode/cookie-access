"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";

const NAV = [
  { href: "/super", label: "Analytics", icon: "▚", tint: "indigo" },
  { href: "/super/accounts", label: "Accounts", icon: "◕", tint: "emerald" },
  { href: "/super/domains", label: "Domains", icon: "▤", tint: "sky" },
  { href: "/super/orders", label: "Orders & revenue", icon: "◈", tint: "amber" },
] as const;

const TINT = {
  indigo: { chip: "bg-brand-50 text-brand-600", aChip: "bg-brand-100 text-brand-700", aBg: "bg-brand-50", aText: "text-brand-700", bar: "bg-brand-600" },
  emerald: { chip: "bg-emerald-50 text-emerald-600", aChip: "bg-emerald-100 text-emerald-700", aBg: "bg-emerald-50", aText: "text-emerald-700", bar: "bg-emerald-500" },
  sky: { chip: "bg-sky-50 text-sky-600", aChip: "bg-sky-100 text-sky-700", aBg: "bg-sky-50", aText: "text-sky-700", bar: "bg-sky-500" },
  amber: { chip: "bg-amber-50 text-amber-600", aChip: "bg-amber-100 text-amber-700", aBg: "bg-amber-50", aText: "text-amber-700", bar: "bg-amber-500" },
} as const;

export default function SuperLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");

  useEffect(() => {
    api
      .get<{ superAdmin: { email: string } }>("/api/super/session")
      .then((s) => {
        setEmail(s.superAdmin.email);
        setState("ready");
      })
      .catch(() => {
        setState("denied");
        router.replace("/super/login");
      });
  }, [router]);

  async function logout() {
    await api.post("/api/super/logout").catch(() => {});
    router.replace("/super/login");
  }

  if (state !== "ready") {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
        {state === "denied" ? "Redirecting to sign in…" : "Loading…"}
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Dark sidebar distinguishes the operator console from a customer's dashboard */}
      <aside className="flex w-64 flex-col border-r border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-sm font-bold text-white shadow-sm">
            ◆
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">Platform admin</div>
            <div className="text-[11px] font-medium text-slate-400">
              Consent Manager
            </div>
          </div>
        </div>

        <div className="mx-3 border-t border-slate-800" />

        <nav className="flex-1 space-y-0.5 px-3 py-3">
          {NAV.map((item) => {
            const active =
              item.href === "/super"
                ? pathname === "/super"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition ${
                  active
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                {active && (
                  <span
                    className={`absolute inset-y-1.5 left-0 w-1 rounded-r-full ${TINT[item.tint].bar}`}
                  />
                )}
                <span
                  className={`flex h-6 w-6 flex-none items-center justify-center rounded-md text-[11px] ${TINT[item.tint].chip}`}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-300">
              {(email?.[0] || "S").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-slate-300">
                {email}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-1.5 w-full rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex flex-none items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-8 py-3.5 backdrop-blur">
          <span className="text-sm font-semibold text-slate-800">
            Platform operator console
          </span>
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
            All accounts
          </span>
        </header>
        <main className="app-scroll flex-1 overflow-y-auto bg-slate-50 px-8 py-8">
          <div className="mx-auto max-w-6xl animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
