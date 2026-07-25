"use client";

import { useEffect, useState } from "react";
import { api, dprExportUrl } from "@/lib/api";
import type { DprRequest } from "@/lib/types";
import {
  Badge,
  type BadgeColor,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  PageHero,
} from "@/components/ui";

const TYPE_LABEL: Record<string, string> = {
  access: "Access data",
  correction: "Correct data",
  erasure: "Erase data",
  grievance: "Grievance",
  nomination: "Nomination",
};

// What each request type is asking for, and how the admin fulfils it — so every
// type has a clear, guided action rather than a bare "resolve".
const TYPE_GUIDE: Record<
  string,
  { icon: string; what: string; how: string; resolveLabel: string }
> = {
  access: {
    icon: "↓",
    what: "This person wants a copy of the data you hold about them.",
    how: "Download the data package below and send it to them, then mark it done.",
    resolveLabel: "Mark sent & resolve",
  },
  correction: {
    icon: "✎",
    what: "This person says some of their data is wrong and wants it fixed.",
    how: "Use the package to see what's on file, correct it in your systems, then note what you changed.",
    resolveLabel: "Mark corrected",
  },
  erasure: {
    icon: "🗑",
    what: "This person wants their personal data deleted.",
    how: "One click erases their identity from your consent records — no manual work.",
    resolveLabel: "Mark resolved",
  },
  grievance: {
    icon: "!",
    what: "This person has raised a complaint or concern.",
    how: "Review it, then write a response — it's emailed to them when you resolve.",
    resolveLabel: "Send response & resolve",
  },
  nomination: {
    icon: "◕",
    what: "This person is nominating someone to act for them (e.g. if they can't).",
    how: "Record the nominee's name and contact in the note, then resolve.",
    resolveLabel: "Save nominee & resolve",
  },
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<DprRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const q = filter ? `?status=${filter}` : "";
      const { requests } = await api.get<{ requests: DprRequest[] }>(
        `/api/admin/dpr${q}`,
      );
      setRequests(requests);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function update(
    id: string,
    status: DprRequest["status"],
    resolutionNotes?: string,
  ) {
    setError(null);
    try {
      await api.patch(`/api/admin/dpr/${id}`, { status, resolutionNotes });
      setEditing(null);
      setNotes("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function erase(r: DprRequest) {
    if (
      !confirm(
        `Erase all personal data for ${r.requester}?\n\n` +
          `Their identity (email/phone) is permanently removed from your consent ` +
          `records and they can no longer be identified. Their consent history is ` +
          `kept as anonymous records. This cannot be undone.`,
      )
    )
      return;
    setBusy(r.id);
    setError(null);
    try {
      await api.post(`/api/admin/dpr/${r.id}/erase`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHero
        tone="amber"
        icon="✎"
        title="Data-rights requests"
        subtitle="When someone asks to access, correct, or erase their data — or raises a grievance — it lands here with a due date."
        action={
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm font-medium"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : requests.length === 0 ? (
        <EmptyState
          icon="✎"
          title="No requests yet"
          hint="Share your rights portal so people can submit them — the link is on the Install page. It's also built into the consent widget."
        />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const overdue = r.daysLeft !== null && r.daysLeft < 0;
            return (
              <Card
                key={r.id}
                className={`transition duration-200 hover:shadow-card-hover ${overdue ? "ring-1 ring-red-200" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-xs text-white shadow-sm">
                        ✎
                      </span>
                      <span className="font-semibold text-slate-900">
                        {TYPE_LABEL[r.type] ?? r.type}
                      </span>
                      <StatusBadge status={r.status} />
                      {r.status !== "resolved" && r.daysLeft !== null && (
                        <Badge color={overdue ? "danger" : "neutral"}>
                          {overdue
                            ? `${-r.daysLeft} day(s) overdue`
                            : `due in ${r.daysLeft} day(s)`}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      From <span className="font-mono text-xs">{r.requester}</span>{" "}
                      · {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                      {r.details}
                    </p>
                    {r.resolutionNotes && (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <strong>Resolution:</strong> {r.resolutionNotes}
                      </p>
                    )}

                    {/* Type-specific guidance + action, shown until resolved. */}
                    {r.status !== "resolved" && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                        <p className="text-xs font-medium text-slate-600">
                          {guide(r.type).what}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {guide(r.type).how}
                        </p>

                        {/* Access & correction: the data package to send / review. */}
                        {(r.type === "access" || r.type === "correction") && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <a
                              href={dprExportUrl(r.id, "pdf")}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                            >
                              ↓ Data package (PDF)
                            </a>
                            <a
                              href={dprExportUrl(r.id, "json")}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                            >
                              ↓ JSON
                            </a>
                          </div>
                        )}

                        {/* Erasure: one-click delete of the person's identity. */}
                        {r.type === "erasure" && (
                          <div className="mt-2">
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={busy === r.id}
                              onClick={() => erase(r)}
                            >
                              {busy === r.id ? "Erasing…" : "🗑 Erase personal data"}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-none flex-col gap-2">
                    {r.status === "open" && (
                      <Button
                        variant="secondary"
                        onClick={() => update(r.id, "in_progress")}
                      >
                        Start
                      </Button>
                    )}
                    {r.status !== "resolved" && r.type !== "erasure" && (
                      <Button onClick={() => setEditing(r.id)}>Resolve</Button>
                    )}
                  </div>
                </div>

                {editing === r.id && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <label className="mb-1 block text-sm font-medium text-slate-600">
                      {r.type === "nomination"
                        ? "Nominee details (name + contact) — emailed to the requester"
                        : "Response note (emailed to the requester)"}
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder={placeholderFor(r.type)}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => update(r.id, "resolved", notes)}
                        disabled={r.type === "nomination" && !notes.trim()}
                      >
                        {guide(r.type).resolveLabel}
                      </Button>
                      <Button variant="secondary" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
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

function guide(type: string) {
  return TYPE_GUIDE[type] ?? TYPE_GUIDE.grievance;
}

function placeholderFor(type: string): string {
  switch (type) {
    case "access":
      return "e.g. Sent the requested data to their email on 25 Jul.";
    case "correction":
      return "e.g. Updated their email from old@x.com to new@x.com.";
    case "nomination":
      return "e.g. Nominee: Priya Sharma, priya@example.com, +91…";
    case "grievance":
      return "e.g. Thanks for raising this. Here's how we've addressed it…";
    default:
      return "Write a note for the requester…";
  }
}

function StatusBadge({ status }: { status: string }) {
  const color: Record<string, BadgeColor> = {
    open: "warning",
    in_progress: "info",
    resolved: "success",
  };
  const label: Record<string, string> = {
    open: "Open",
    in_progress: "In progress",
    resolved: "Resolved",
  };
  return <Badge color={color[status] ?? "neutral"}>{label[status] ?? status}</Badge>;
}
