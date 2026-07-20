"use client";

import { useEffect, useState } from "react";
import { api, dprExportUrl } from "@/lib/api";
import type { DprRequest } from "@/lib/types";
import { Badge, type BadgeColor, Button, Card, ErrorNote, PageHeader } from "@/components/ui";

const TYPE_LABEL: Record<string, string> = {
  access: "Access data",
  correction: "Correct data",
  erasure: "Erase data",
  grievance: "Grievance",
  nomination: "Nomination",
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<DprRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

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

  return (
    <>
      <PageHeader
        title="Data-rights requests"
        subtitle="When someone asks to access, correct, or erase their data — or raises a grievance — it lands here with a due date."
        action={
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
        <Card>
          <p className="text-sm text-slate-400">
            No requests yet. Share your rights portal so people can submit them —
            you&rsquo;ll find the link on the Install page.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const overdue = r.daysLeft !== null && r.daysLeft < 0;
            return (
              <Card key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {TYPE_LABEL[r.type] ?? r.type}
                      </span>
                      <StatusBadge status={r.status} />
                      {r.status !== "resolved" && r.daysLeft !== null && (
                        <span
                          className={`text-xs font-medium ${overdue ? "text-red-600" : "text-slate-400"}`}
                        >
                          {overdue
                            ? `${-r.daysLeft} day(s) overdue`
                            : `due in ${r.daysLeft} day(s)`}
                        </span>
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

                    {/* Access requests: assemble the data this platform holds. */}
                    {r.type === "access" && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                        <p className="mb-2 text-xs font-medium text-slate-600">
                          This person&rsquo;s data held here — send it to fulfil the
                          access request:
                        </p>
                        <div className="flex flex-wrap gap-2">
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
                    {r.status !== "resolved" && (
                      <Button onClick={() => setEditing(r.id)}>Resolve</Button>
                    )}
                  </div>
                </div>

                {editing === r.id && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <label className="mb-1 block text-sm font-medium text-slate-600">
                      Resolution note (emailed to the requester)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="e.g. We've deleted your account and associated data."
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => update(r.id, "resolved", notes)}>
                        Mark resolved
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
