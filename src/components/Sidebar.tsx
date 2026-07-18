"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useSession } from "./SessionContext";
import { useDomains } from "./DomainContext";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "▚" },
  { href: "/purposes", label: "Consent purposes", icon: "☑" },
  { href: "/notices", label: "Privacy notice", icon: "▤" },
  { href: "/appearance", label: "Banner design", icon: "◑" },
  { href: "/consent-log", label: "Consent records", icon: "≣" },
  { href: "/requests", label: "Data-rights requests", icon: "✎" },
  { href: "/breaches", label: "Breach log", icon: "⚠" },
  { href: "/install", label: "Install widget", icon: "❮❯" },
  { href: "/billing", label: "Billing & plan", icon: "◈" },
];

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

  return (
    <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          C
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-900">
            Consent Manager
          </div>
          <div className="truncate text-xs text-slate-400">
            {session.tenant?.businessName}
          </div>
        </div>
      </div>

      {/* Domain switcher — everything below operates on the selected domain. */}
      <div className="px-3 pb-3">
        <label className="mb-1 block px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Domain
        </label>
        <div className="flex gap-1">
          <select
            value={current.id}
            onChange={(e) => selectSite(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.status !== "active" ? " (archived)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1">
          {current.verified ? (
            <span className="text-[11px] font-medium text-emerald-600">
              ✓ Verified
            </span>
          ) : (
            <Link
              href="/install"
              className="text-[11px] font-medium text-amber-600 hover:underline"
            >
              ● Unverified — install
            </Link>
          )}
          <Link
            href="/domains"
            className="text-[11px] font-medium text-brand-700 hover:underline"
          >
            Manage →
          </Link>
        </div>
      </div>

      <nav className="flex-1 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-brand-50 font-semibold text-brand-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="w-4 text-center text-xs opacity-70">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-4 py-3">
        <div className="mb-2 truncate text-xs text-slate-500">
          {session.admin.email}
        </div>
        <button
          onClick={logout}
          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
