"use client";

import { useCallback, useEffect, useState } from "react";
import { api, consentCsvUrl, consentEventPdfUrl } from "@/lib/api";
import type {
  ConsentEventsPage,
  ConsentPage,
  Purpose,
} from "@/lib/types";
import { Button, Card, ErrorNote, PageHero } from "@/components/ui";

type View = "grouped" | "detailed";

export default function ConsentLogPage() {
  const [view, setView] = useState<View>("grouped");
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [records, setRecords] = useState<ConsentPage | null>(null);
  const [events, setEvents] = useState<ConsentEventsPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [purposeId, setPurposeId] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    api
      .get<{ purposes: Purpose[] }>("/api/admin/purposes")
      .then((r) => setPurposes(r.purposes))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", String(page));
    params.set("pageSize", "25");
    try {
      if (view === "grouped") {
        setEvents(
          await api.get<ConsentEventsPage>(`/api/admin/consent/events?${params}`),
        );
      } else {
        if (purposeId) params.set("purposeId", purposeId);
        if (action) params.set("action", action);
        setRecords(await api.get<ConsentPage>(`/api/admin/consent?${params}`));
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [view, purposeId, action, from, to, page]);

  useEffect(() => {
    load();
  }, [load]);

  const csvHref = consentCsvUrl({ purposeId, action, from, to });
  const total = view === "grouped" ? events?.total ?? 0 : records?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));

  function switchView(v: View) {
    setView(v);
    setPage(1);
  }

  return (
    <>
      <PageHero
        tone="teal"
        icon="≣"
        title="Consent records"
        subtitle="A permanent, append-only log of every consent given and withdrawn — your evidence trail."
        action={
          <a href={csvHref}>
            <Button variant="secondary">Export CSV</Button>
          </a>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      {/* View toggle */}
      <div className="mb-4 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {(["grouped", "detailed"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => switchView(v)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold capitalize transition ${
              view === v
                ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {v === "grouped" ? "By submission" : "Every change"}
          </button>
        ))}
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          {view === "detailed" && (
            <>
              <Filter label="Purpose">
                <select
                  value={purposeId}
                  onChange={(e) => {
                    setPage(1);
                    setPurposeId(e.target.value);
                  }}
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">All</option>
                  {purposes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Filter>
              <Filter label="Action">
                <select
                  value={action}
                  onChange={(e) => {
                    setPage(1);
                    setAction(e.target.value);
                  }}
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">All</option>
                  <option value="granted">Given</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </Filter>
            </>
          )}
          <Filter label="From">
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setPage(1);
                setFrom(e.target.value);
              }}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </Filter>
          <Filter label="To">
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setPage(1);
                setTo(e.target.value);
              }}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </Filter>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          {view === "grouped" ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <Th>When</Th>
                  <Th>Person</Th>
                  <Th>Decision</Th>
                  <Th>Source</Th>
                  <Th>Report</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 [&_tr:hover]:bg-slate-50/60">
                {events?.events.map((ev) => (
                  <tr key={ev.id}>
                    <Td>{new Date(ev.timestamp).toLocaleString()}</Td>
                    <Td>
                      <span className="font-mono text-xs text-slate-600">
                        {ev.identifier}
                      </span>
                      <span className="ml-2 text-[11px] text-slate-400">
                        {ev.identifierType}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {ev.accepted.map((p) => (
                          <span
                            key={"a" + p}
                            className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                          >
                            ✓ {p}
                          </span>
                        ))}
                        {ev.declined.map((p) => (
                          <span
                            key={"d" + p}
                            className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                          >
                            ✕ {p}
                          </span>
                        ))}
                      </div>
                    </Td>
                    <Td>{ev.method}</Td>
                    <Td>
                      <a
                        href={consentEventPdfUrl(ev.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                      >
                        ↓ PDF
                      </a>
                    </Td>
                  </tr>
                ))}
                {events && events.events.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      No consent submissions match these filters yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <Th>When</Th>
                  <Th>Person</Th>
                  <Th>Purpose</Th>
                  <Th>Action</Th>
                  <Th>Source</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 [&_tr:hover]:bg-slate-50/60">
                {records?.records.map((r) => (
                  <tr key={r.id}>
                    <Td>{new Date(r.timestamp).toLocaleString()}</Td>
                    <Td>
                      <span className="font-mono text-xs text-slate-600">
                        {r.identifier}
                      </span>
                      <span className="ml-2 text-[11px] text-slate-400">
                        {r.identifierType}
                      </span>
                    </Td>
                    <Td>{r.purpose}</Td>
                    <Td>
                      <span
                        className={
                          r.action === "granted"
                            ? "rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                            : "rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                        }
                      >
                        {r.action === "granted" ? "Given" : "Withdrawn"}
                      </span>
                    </Td>
                    <Td>{r.method}</Td>
                  </tr>
                ))}
                {records && records.records.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      No records match these filters yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          {total} {view === "grouped" ? "submission" : "record"}
          {total === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}

function Filter({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="px-4 py-3 font-medium">{children}</th>
);
const Td = ({ children }: { children: React.ReactNode }) => (
  <td className="px-4 py-3 align-top text-slate-700">{children}</td>
);
