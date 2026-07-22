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
      });
      setShowForm(false);
      setDescription("");
      setDiscoveredAt("");
      await load();
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
            placeholder="Describe the incident: what data, how many people, cause…"
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
              {b.status !== "closed" && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  {!b.reportedToBoardAt && (
                    <Button
                      variant="secondary"
                      onClick={() => stamp(b.id, "reportedToBoardAt")}
                    >
                      Mark reported to Board
                    </Button>
                  )}
                  {!b.affectedUsersNotifiedAt && (
                    <Button
                      variant="secondary"
                      onClick={() => stamp(b.id, "affectedUsersNotifiedAt")}
                    >
                      Mark users notified
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => close(b.id)}>
                    Close incident
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
