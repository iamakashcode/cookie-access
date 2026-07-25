"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { BreachIncident } from "@/lib/types";
import {
  Badge,
  type BadgeColor,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  PageHero,
  SectionHeader,
} from "@/components/ui";

export default function BreachesPage() {
  const [breaches, setBreaches] = useState<BreachIncident[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [discoveredAt, setDiscoveredAt] = useState("");
  const [affectedCount, setAffectedCount] = useState("");
  const [dataCategories, setDataCategories] = useState("");
  const [consequences, setConsequences] = useState("");
  const [remediation, setRemediation] = useState("");
  const [notice, setNotice] = useState<{ title: string; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { breaches } = await api.get<{ breaches: BreachIncident[] }>(
        "/api/admin/breaches",
      );
      setBreaches(breaches);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    setError(null);
    try {
      await api.post("/api/admin/breaches", {
        description,
        discoveredAt: new Date(discoveredAt).toISOString(),
        affectedCount: affectedCount ? Number(affectedCount) : null,
        dataCategories: dataCategories || null,
        consequences: consequences || null,
        remediation: remediation || null,
      });
      setShowForm(false);
      setDescription("");
      setDiscoveredAt("");
      setAffectedCount("");
      setDataCategories("");
      setConsequences("");
      setRemediation("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function generate(id: string, type: "board" | "users") {
    setError(null);
    try {
      const { text } = await api.get<{ text: string }>(
        `/api/admin/breaches/${id}/notice?type=${type}`,
      );
      setNotice({
        title: type === "board" ? "Data Protection Board report" : "Notice to affected users",
        text,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function stamp(
    id: string,
    field: "reportedToBoardAt" | "affectedUsersNotifiedAt",
  ) {
    try {
      await api.patch(`/api/admin/breaches/${id}`, {
        [field]: new Date().toISOString(),
        status: field === "reportedToBoardAt" ? "reported" : undefined,
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function close(id: string) {
    try {
      await api.patch(`/api/admin/breaches/${id}`, { status: "closed" });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <PageHero
        tone="rose"
        icon="⚠"
        title="Breach log"
        subtitle="An internal record of any data breach and the steps you took — for your own accountability under the DPDP Act."
        action={<Button onClick={() => setShowForm(true)}>+ Log an incident</Button>}
      />

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      {showForm && (
        <Card className="mb-6 ring-1 ring-rose-100">
          <SectionHeader tone="rose" icon="⚠" title="New incident" />
          <label className="mb-1 block text-sm font-medium text-slate-600">
            When did you discover it?
          </label>
          <input
            type="datetime-local"
            value={discoveredAt}
            onChange={(e) => setDiscoveredAt(e.target.value)}
            className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <label className="mb-1 block text-sm font-medium text-slate-600">
            What happened?
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Describe the incident and its cause…"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                People affected (approx.)
              </label>
              <input
                type="number"
                min={0}
                value={affectedCount}
                onChange={(e) => setAffectedCount(e.target.value)}
                className="w-full px-3 py-2 text-sm"
                placeholder="e.g. 1200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                Data involved
              </label>
              <input
                value={dataCategories}
                onChange={(e) => setDataCategories(e.target.value)}
                className="w-full px-3 py-2 text-sm"
                placeholder="e.g. names, emails, order history"
              />
            </div>
          </div>
          <label className="mb-1 mt-3 block text-sm font-medium text-slate-600">
            Likely consequences
          </label>
          <textarea
            value={consequences}
            onChange={(e) => setConsequences(e.target.value)}
            rows={2}
            className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="What's the likely impact on affected people?"
          />
          <label className="mb-1 block text-sm font-medium text-slate-600">
            Measures taken / being taken
          </label>
          <textarea
            value={remediation}
            onChange={(e) => setRemediation(e.target.value)}
            rows={2}
            className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="How are you containing and remedying it?"
          />
          <div className="flex gap-2">
            <Button onClick={create} disabled={!description || !discoveredAt}>
              Save incident
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : breaches.length === 0 ? (
        <EmptyState
          icon="✓"
          title="No incidents logged"
          hint="That's a good thing — but if a breach ever happens, record it here to keep your accountability trail."
        />
      ) : (
        <div className="space-y-3">
          {breaches.map((b) => (
            <Card key={b.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      Discovered {new Date(b.discoveredAt).toLocaleString()}
                    </span>
                    <Badge
                      color={
                        (
                          {
                            closed: "neutral",
                            reported: "info",
                            open: "warning",
                          } as Record<string, BadgeColor>
                        )[b.status] ?? "warning"
                      }
                      className="capitalize"
                    >
                      {b.status}
                    </Badge>
                    {b.status !== "closed" && !b.reportedToBoardAt && (
                      <BoardDeadline discoveredAt={b.discoveredAt} />
                    )}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {b.description}
                  </p>
                  <div className="mt-2 text-xs text-slate-500">
                    Reported to Board:{" "}
                    {b.reportedToBoardAt
                      ? new Date(b.reportedToBoardAt).toLocaleDateString()
                      : "—"}{" "}
                    · Affected users notified:{" "}
                    {b.affectedUsersNotifiedAt
                      ? new Date(b.affectedUsersNotifiedAt).toLocaleDateString()
                      : "—"}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <Button variant="secondary" size="sm" onClick={() => generate(b.id, "board")}>
                  ✎ Board report
                </Button>
                <Button variant="secondary" size="sm" onClick={() => generate(b.id, "users")}>
                  ✎ User notice
                </Button>
                {b.status !== "closed" && (
                  <>
                    {!b.reportedToBoardAt && (
                      <Button variant="secondary" size="sm" onClick={() => stamp(b.id, "reportedToBoardAt")}>
                        Mark reported to Board
                      </Button>
                    )}
                    {!b.affectedUsersNotifiedAt && (
                      <Button variant="secondary" size="sm" onClick={() => stamp(b.id, "affectedUsersNotifiedAt")}>
                        Mark users notified
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => close(b.id)}>
                      Close incident
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {notice && <NoticeModal title={notice.title} text={notice.text} onClose={() => setNotice(null)} />}
    </>
  );
}

/** Countdown to the 72-hour Board-reporting deadline (from discovery). */
function BoardDeadline({ discoveredAt }: { discoveredAt: string }) {
  const hours = Math.round(
    (new Date(discoveredAt).getTime() + 72 * 3600_000 - Date.now()) / 3600_000,
  );
  if (hours < 0)
    return <Badge color="danger">Board report {-hours}h overdue</Badge>;
  return <Badge color="warning">Report to Board within {hours}h</Badge>;
}

/** Read-only draft with copy-to-clipboard. */
function NoticeModal({
  title,
  text,
  onClose,
}: {
  title: string;
  text: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
        <pre className="app-scroll flex-1 overflow-auto whitespace-pre-wrap px-5 py-4 text-[13px] leading-relaxed text-slate-700">
          {text}
        </pre>
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
          <p className="text-xs text-slate-400">
            Draft — review and adapt before sending. Not legal advice.
          </p>
          <Button
            size="sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                /* clipboard blocked */
              }
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </div>
    </div>
  );
}
