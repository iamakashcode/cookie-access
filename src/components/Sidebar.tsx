"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useSession } from "./SessionContext";
import { useDomains } from "./DomainContext";

// Each section carries its own accent so the nav reads as a colourful map of
// the product rather than a monotone list. Full class strings (no dynamic
// concatenation) keep them safe from Tailwind's purge.
const TINTS = {
  indigo: { chip: "bg-brand-50 text-brand-600", aChip: "bg-brand-100 text-brand-700", aBg: "bg-brand-50", aText: "text-brand-700", bar: "bg-brand-600" },
  emerald: { chip: "bg-emerald-50 text-emerald-600", aChip: "bg-emerald-100 text-emerald-700", aBg: "bg-emerald-50", aText: "text-emerald-700", bar: "bg-emerald-500" },
  sky: { chip: "bg-sky-50 text-sky-600", aChip: "bg-sky-100 text-sky-700", aBg: "bg-sky-50", aText: "text-sky-700", bar: "bg-sky-500" },
  violet: { chip: "bg-violet-50 text-violet-600", aChip: "bg-violet-100 text-violet-700", aBg: "bg-violet-50", aText: "text-violet-700", bar: "bg-violet-500" },
  teal: { chip: "bg-teal-50 text-teal-600", aChip: "bg-teal-100 text-teal-700", aBg: "bg-teal-50", aText: "text-teal-700", bar: "bg-teal-500" },
  amber: { chip: "bg-amber-50 text-amber-600", aChip: "bg-amber-100 text-amber-700", aBg: "bg-amber-50", aText: "text-amber-700", bar: "bg-amber-500" },
  rose: { chip: "bg-rose-50 text-rose-600", aChip: "bg-rose-100 text-rose-700", aBg: "bg-rose-50", aText: "text-rose-700", bar: "bg-rose-500" },
  fuchsia: { chip: "bg-fuchsia-50 text-fuchsia-600", aChip: "bg-fuchsia-100 text-fuchsia-700", aBg: "bg-fuchsia-50", aText: "text-fuchsia-700", bar: "bg-fuchsia-500" },
  green: { chip: "bg-green-50 text-green-600", aChip: "bg-green-100 text-green-700", aBg: "bg-green-50", aText: "text-green-700", bar: "bg-green-500" },
} as const;

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "▚", tint: "indigo" },
  { href: "/purposes", label: "Consent purposes", icon: "☑", tint: "emerald" },
  { href: "/notices", label: "Privacy notice", icon: "▤", tint: "sky" },
  { href: "/appearance", label: "Banner design", icon: "◑", tint: "violet" },
  { href: "/consent-log", label: "Consent records", icon: "≣", tint: "teal" },
  { href: "/requests", label: "Data-rights requests", icon: "✎", tint: "amber" },
  { href: "/breaches", label: "Breach log", icon: "⚠", tint: "rose" },
  { href: "/install", label: "Install widget", icon: "❮❯", tint: "fuchsia" },
  { href: "/billing", label: "Billing & plan", icon: "◈", tint: "green" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const { sites, current, selectSite } = useDomains();

  async function logout() {
    try {
      await api.post("/api/admin/auth/logout");
    } catch {
      /* ignore */
    }
    router.replace("/login");
  }

  const initials = (session.tenant?.businessName || "C")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm">
          {initials}
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold text-slate-900">
            {session.tenant?.businessName || "Consent Manager"}
          </div>
          <div className="text-[11px] font-medium text-slate-400">
            Consent Manager
          </div>
        </div>
      </div>

      {/* Domain switcher — everything below operates on the selected domain. */}
      <div className="px-3 pb-4">
        <label className="mb-1.5 block px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Domain
        </label>
        <div className="relative">
          <select
            value={current.id}
            onChange={(e) => selectSite(e.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 focus:border-brand-500"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.status !== "active" ? " (archived)" : ""}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            ▾
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between px-1">
          {current.verified ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Verified
            </span>
          ) : (
            <Link
              href="/install"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:underline"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Unverified — install
            </Link>
          )}
          <Link
            href="/domains"
            className="text-[11px] font-semibold text-brand-700 hover:underline"
          >
            Manage →
          </Link>
        </div>
      </div>

      <div className="mx-3 border-t border-slate-100" />

      {/* Navigation */}
      <nav className="app-scroll flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const t = TINTS[item.tint];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition ${
                active
                  ? `${t.aBg} ${t.aText}`
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {active && (
                <span
                  className={`absolute inset-y-1.5 left-0 w-1 rounded-r-full ${t.bar}`}
                />
              )}
              <span
                className={`flex h-6 w-6 flex-none items-center justify-center rounded-md text-[11px] transition ${
                  active ? t.aChip : t.chip
                }`}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Account */}
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
            {(session.admin.email[0] || "?").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-slate-600">
              {session.admin.email}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
