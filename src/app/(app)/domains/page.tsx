"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Site } from "@/lib/types";
import { widgetSnippet } from "@/lib/widget";
import { useDomains } from "@/components/DomainContext";
import { Button, Card, ErrorNote, PageHeader } from "@/components/ui";

export default function DomainsPage() {
  const { sites, current, selectSite, reloadSites } = useDomains();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const active = sites.filter((s) => s.status === "active");
  const archived = sites.filter((s) => s.status !== "active");
  const anyUnverified = active.some((s) => !s.verified);

  // Live poll while any domain is still waiting for its script to load.
  const reload = useRef(reloadSites);
  reload.current = reloadSites;
  useEffect(() => {
    if (!anyUnverified) return;
    const t = setInterval(() => {
      reload.current().catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [anyUnverified]);

  async function addDomain() {
    setError(null);
    try {
      const { site } = await api.post<{ site: Site }>("/api/admin/sites", {
        name,
        domain: domain || undefined,
      });
      await reloadSites();
      selectSite(site.id);
      setShowForm(false);
      setName("");
      setDomain("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function archive(id: string) {
    if (!confirm("Archive this domain? Its widget stops and it's hidden, but its records are kept.")) return;
    setError(null);
    try {
      await api.del(`/api/admin/sites/${id}`);
      await reloadSites();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(s: Site) {
    const records = s.counts?.consentRecords ?? 0;
    if (
      !confirm(
        `Permanently delete "${s.name}"?\n\n` +
          `This erases the domain and ALL its data — purposes, notice history` +
          (records ? `, and ${records.toLocaleString("en-IN")} consent record(s)` : "") +
          `. This cannot be undone.\n\n` +
          `If you only want to stop the widget and hide it, use Archive instead.`,
      )
    )
      return;
    setError(null);
    try {
      await api.del(`/api/admin/sites/${s.id}?purge=1`);
      // If the selected domain was deleted, fall back to another one.
      if (s.id === current.id) {
        const next = sites.find((x) => x.id !== s.id);
        if (next) selectSite(next.id);
      }
      await reloadSites();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function reactivate(id: string) {
    setError(null);
    try {
      await api.patch(`/api/admin/sites/${id}`, { status: "active" });
      await reloadSites();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function copySnippet(s: Site) {
    try {
      await navigator.clipboard.writeText(widgetSnippet(s.apiKey));
      setCopiedId(s.id);
      setTimeout(() => setCopiedId((c) => (c === s.id ? null : c)), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <>
      <PageHeader
        title="Domains"
        subtitle="Each domain is a separate website with its own widget, purposes, notice, and records. A domain becomes Verified once its script goes live on your site."
        action={<Button onClick={() => setShowForm(true)}>+ Add domain</Button>}
      />

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      {showForm && (
        <Card className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">New domain</h2>
          <label className="mb-1 block text-sm font-medium text-slate-600">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Blog"
            className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <label className="mb-1 block text-sm font-medium text-slate-600">
            Website address (optional)
          </label>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="blog.acme.com"
            className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <Button onClick={addDomain} disabled={!name}>
              Create domain
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {active.map((s) => (
          <Card key={s.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900">{s.name}</span>
                  {s.id === current.id && (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                      Selected
                    </span>
                  )}
                  <VerifiedBadge verified={s.verified} />
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    {s.planTier}
                  </span>
                </div>
                {s.domain && (
                  <p className="mt-1 text-sm text-slate-500">{s.domain}</p>
                )}
                {s.verified && s.verifiedOrigin && (
                  <p className="mt-1 text-xs text-emerald-600">
                    Script detected on {s.verifiedOrigin}
                  </p>
                )}
              </div>
              <div className="flex flex-none gap-2">
                {s.id !== current.id && (
                  <Button variant="secondary" onClick={() => selectSite(s.id)}>
                    Switch to
                  </Button>
                )}
                <Button variant="secondary" onClick={() => archive(s.id)}>
                  Archive
                </Button>
                <Button variant="danger" onClick={() => remove(s)}>
                  Delete
                </Button>
              </div>
            </div>

            {!s.verified && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <Spinner /> Waiting for the script to go live…
                </div>
                <p className="mb-3 text-sm text-amber-800">
                  Paste this just before <code>&lt;/body&gt;</code> on{" "}
                  <strong>{s.name}</strong>. This page switches to{" "}
                  <strong>Verified</strong> automatically once it loads.
                </p>
                <div className="relative">
                  <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-[12.5px] leading-relaxed text-slate-100">
                    <code>{widgetSnippet(s.apiKey)}</code>
                  </pre>
                  <button
                    onClick={() => copySnippet(s)}
                    className="absolute right-2 top-2 rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white hover:bg-white/20"
                  >
                    {copiedId === s.id ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}
          </Card>
        ))}

        {archived.length > 0 && (
          <>
            <h3 className="pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Archived domains
            </h3>
            {archived.map((s) => (
              <Card key={s.id} className="flex items-center justify-between opacity-70">
                <span className="font-medium text-slate-700">{s.name}</span>
                <div className="flex flex-none gap-2">
                  <Button variant="secondary" onClick={() => reactivate(s.id)}>
                    Reactivate
                  </Button>
                  <Button variant="danger" onClick={() => remove(s)}>
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>
    </>
  );
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
      ✓ Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
      Unverified
    </span>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
  );
}
