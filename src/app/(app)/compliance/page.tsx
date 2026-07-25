"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useDomains } from "@/components/DomainContext";
import {
  Button,
  Card,
  ErrorNote,
  PageHero,
  SectionHeader,
} from "@/components/ui";

interface Contact {
  legalName: string;
  businessAddress: string;
  grievanceName: string;
  grievanceEmail: string;
  grievancePhone: string;
  dpoName: string;
  dpoEmail: string;
}

interface Check {
  key: string;
  label: string;
  done: boolean;
  why: string;
  href: string;
}

interface Retention {
  autoEraseEnabled: boolean;
  retentionGraceDays: number;
}

interface Processor {
  id: string;
  name: string;
  purpose: string;
  dataShared: string | null;
}

interface Data {
  contact: Contact;
  retention: Retention;
  checklist: Check[];
  score: number;
  done: number;
  total: number;
  hasMinors: boolean;
}

const EMPTY: Contact = {
  legalName: "",
  businessAddress: "",
  grievanceName: "",
  grievanceEmail: "",
  grievancePhone: "",
  dpoName: "",
  dpoEmail: "",
};

export default function CompliancePage() {
  const { current } = useDomains();
  const [data, setData] = useState<Data | null>(null);
  const [form, setForm] = useState<Contact>(EMPTY);
  const [retention, setRetention] = useState<Retention>({
    autoEraseEnabled: false,
    retentionGraceDays: 30,
  });
  const [processors, setProcessors] = useState<Processor[]>([]);
  const [pForm, setPForm] = useState({ name: "", purpose: "", dataShared: "" });
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    api
      .get<Data>("/api/admin/compliance")
      .then((d) => {
        setData(d);
        setForm({ ...EMPTY, ...d.contact });
        setRetention(d.retention);
      })
      .catch((e) => setError((e as Error).message));
    api
      .get<{ processors: Processor[] }>("/api/admin/processors")
      .then((r) => setProcessors(r.processors))
      .catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  async function addProcessor() {
    if (!pForm.name.trim() || !pForm.purpose.trim()) return;
    setError(null);
    try {
      await api.post("/api/admin/processors", pForm);
      setPForm({ name: "", purpose: "", dataShared: "" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function removeProcessor(id: string) {
    setError(null);
    try {
      await api.del(`/api/admin/processors/${id}`);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      await api.put("/api/admin/compliance", { ...form, ...retention });
      setStatus("Saved. Your settings have been published.");
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof Contact>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  if (!data && !error)
    return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <>
      <PageHero
        tone="rose"
        icon="✓"
        title="DPDP compliance"
        subtitle={`Your readiness under India's DPDP Act for "${current.name}", and the business contacts published to your visitors.`}
      >
        {data && (
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 flex-none">
              <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke={data.score === 100 ? "#0ca30c" : data.score >= 50 ? "#eda100" : "#e34948"}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${(data.score / 100) * 97.4} 97.4`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-800">
                {data.score}%
              </span>
            </div>
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">
                {data.done} of {data.total} checks passing
              </span>
              <p className="text-xs text-slate-500">
                Complete the checklist below to be consent-ready. This covers the
                website-facing duties — not legal sign-off.
              </p>
            </div>
          </div>
        )}
      </PageHero>

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}
      {status && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {status}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Readiness checklist */}
        <Card>
          <SectionHeader tone="rose" icon="✓" title="Readiness checklist" />
          <ul className="space-y-2">
            {data?.checklist.map((c) => (
              <li
                key={c.key}
                className="flex items-start gap-3 rounded-lg border border-slate-100 px-3 py-2.5"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] font-bold text-white ${
                    c.done ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  {c.done ? "✓" : "!"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm font-medium ${c.done ? "text-slate-700" : "text-slate-900"}`}
                    >
                      {c.label}
                    </span>
                    {!c.done && (
                      <Link
                        href={c.href}
                        className="flex-none text-xs font-semibold text-brand-700 hover:underline"
                      >
                        Fix →
                      </Link>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{c.why}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-400">
            This checklist covers the consent, notice, rights and record-keeping
            duties this tool can help with. Full DPDP compliance also needs your
            own security measures, vendor contracts and legal review — it is not
            legal advice.
          </p>
        </Card>

        {/* Contact settings */}
        <Card>
          <SectionHeader tone="rose" icon="◕" title="Published contacts & identity" />

          <Field label="Registered business (Data Fiduciary) name" hint="Shown in your privacy notice — §5">
            <input value={form.legalName} onChange={(e) => set("legalName", e.target.value)} placeholder="e.g. Acme Retail Pvt. Ltd." className="w-full px-3 py-2 text-sm" />
          </Field>
          <Field label="Business address">
            <textarea value={form.businessAddress} onChange={(e) => set("businessAddress", e.target.value)} rows={2} placeholder="Registered address" className="w-full px-3 py-2 text-sm" />
          </Field>

          <div className="my-4 border-t border-slate-100" />
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Grievance officer <span className="font-normal normal-case text-slate-400">— published to visitors (§8(9), §13)</span>
          </p>
          <Field label="Name">
            <input value={form.grievanceName} onChange={(e) => set("grievanceName", e.target.value)} placeholder="e.g. Priya Sharma" className="w-full px-3 py-2 text-sm" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email">
              <input type="email" value={form.grievanceEmail} onChange={(e) => set("grievanceEmail", e.target.value)} placeholder="grievance@business.com" className="w-full px-3 py-2 text-sm" />
            </Field>
            <Field label="Phone">
              <input value={form.grievancePhone} onChange={(e) => set("grievancePhone", e.target.value)} placeholder="+91…" className="w-full px-3 py-2 text-sm" />
            </Field>
          </div>

          <div className="my-4 border-t border-slate-100" />
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Data Protection Officer <span className="font-normal normal-case text-slate-400">— only if you're a Significant Data Fiduciary (§10)</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input value={form.dpoName} onChange={(e) => set("dpoName", e.target.value)} placeholder="Optional" className="w-full px-3 py-2 text-sm" />
            </Field>
            <Field label="Email">
              <input type="email" value={form.dpoEmail} onChange={(e) => set("dpoEmail", e.target.value)} placeholder="Optional" className="w-full px-3 py-2 text-sm" />
            </Field>
          </div>

          <div className="mt-5">
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save & publish"}
            </Button>
          </div>
        </Card>
      </div>

      {/* Data retention & auto-erasure (§8(7)) */}
      <Card className="mt-6">
        <SectionHeader tone="rose" icon="🗑" title="Data retention & auto-erasure" />
        <p className="mb-4 max-w-3xl text-sm leading-relaxed text-slate-500">
          The DPDP Act requires erasing personal data once consent is withdrawn or
          the purpose is served (§8(7)). Set a retention period on each purpose
          (on the{" "}
          <Link href="/purposes" className="font-semibold text-brand-700 hover:underline">
            Consent purposes
          </Link>{" "}
          page), then turn this on. A daily job then erases the identity of anyone
          who has withdrawn all consent, or whose purposes have all expired — their
          consent history is kept as anonymous records.
        </p>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <input
            type="checkbox"
            checked={retention.autoEraseEnabled}
            onChange={(e) =>
              setRetention((r) => ({ ...r, autoEraseEnabled: e.target.checked }))
            }
            className="mt-0.5"
          />
          <span>
            <span className="text-sm font-semibold text-slate-800">
              Automatically erase expired / withdrawn people
            </span>
            <span className="block text-xs text-slate-500">
              When off, you erase people manually from data-rights requests. When
              on, the daily retention sweep does it for you.
            </span>
          </span>
        </label>

        <div className="mt-4 max-w-xs">
          <label className="mb-1 block text-sm font-medium text-slate-600">
            Grace period{" "}
            <span className="font-normal text-slate-400">
              (days after withdrawal/expiry before erasing)
            </span>
          </label>
          <input
            type="number"
            min={0}
            value={retention.retentionGraceDays}
            onChange={(e) =>
              setRetention((r) => ({
                ...r,
                retentionGraceDays: Number(e.target.value),
              }))
            }
            className="w-full px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-5">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save retention settings"}
          </Button>
        </div>
      </Card>

      {/* Data sharing / processor register (§11) */}
      <Card className="mt-6">
        <SectionHeader tone="rose" icon="◑" title="Who you share data with" />
        <p className="mb-4 max-w-3xl text-sm leading-relaxed text-slate-500">
          People have the right to know every third party and processor you share
          their data with (§11). List them here — they&rsquo;re automatically
          disclosed in your generated notice and in every access-data package.
        </p>

        {processors.length > 0 && (
          <ul className="mb-4 space-y-2">
            {processors.map((p) => (
              <li
                key={p.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-slate-800">{p.name}</span>
                  <span className="ml-2 text-xs text-slate-500">{p.purpose}</span>
                  {p.dataShared && (
                    <p className="mt-0.5 text-xs text-slate-400">Shares: {p.dataShared}</p>
                  )}
                </div>
                <button
                  onClick={() => removeProcessor(p.id)}
                  className="flex-none text-xs font-semibold text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            value={pForm.name}
            onChange={(e) => setPForm({ ...pForm, name: e.target.value })}
            placeholder="Third party (e.g. Razorpay)"
            className="px-3 py-2 text-sm"
          />
          <input
            value={pForm.purpose}
            onChange={(e) => setPForm({ ...pForm, purpose: e.target.value })}
            placeholder="Why (e.g. payments)"
            className="px-3 py-2 text-sm"
          />
          <input
            value={pForm.dataShared}
            onChange={(e) => setPForm({ ...pForm, dataShared: e.target.value })}
            placeholder="Data shared (optional)"
            className="px-3 py-2 text-sm"
          />
          <Button
            variant="secondary"
            onClick={addProcessor}
            disabled={!pForm.name.trim() || !pForm.purpose.trim()}
          >
            + Add
          </Button>
        </div>
      </Card>
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-sm font-medium text-slate-600">
        {label}
        {hint && <span className="ml-1 text-xs font-normal text-slate-400">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
