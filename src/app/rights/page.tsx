"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

const TYPES = [
  { value: "access", label: "Access my data", hint: "Get a copy of the data held about me" },
  { value: "correction", label: "Correct my data", hint: "Fix something that's wrong" },
  { value: "erasure", label: "Erase my data", hint: "Delete my personal data" },
  { value: "grievance", label: "Raise a grievance", hint: "Report a concern or complaint" },
  { value: "nomination", label: "Nominate someone", hint: "Nominate a person to act for me" },
];

function RightsForm() {
  const params = useSearchParams();
  const tenantKey = params.get("k") || "";

  const [businessName, setBusinessName] = useState("");
  const [type, setType] = useState("access");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantKey) return;
    api
      .get<{ businessName: string }>(
        `/api/public/tenant-info?tenantKey=${encodeURIComponent(tenantKey)}`,
      )
      .then((r) => setBusinessName(r.businessName))
      .catch(() => {});
  }, [tenantKey]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    try {
      const res = await api.post<{ referenceId: string }>(
        "/api/public/dpr-request",
        { tenantKey, type, email, details },
      );
      setReference(res.referenceId);
      setState("done");
    } catch (err) {
      setError((err as Error).message);
      setState("error");
    }
  }

  if (!tenantKey) {
    return (
      <p className="text-sm text-slate-500">
        This link is missing its business code. Please use the exact link the
        business gave you.
      </p>
    );
  }

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-emerald-800">Request received</h2>
        <p className="mt-2 text-sm text-emerald-700">
          {businessName || "The business"} will respond to you by email. Your
          reference number is:
        </p>
        <p className="mt-2 font-mono text-sm text-emerald-900">{reference}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <label className="mb-1 block text-sm font-medium text-slate-700">
        What would you like to do?
      </label>
      <div className="mb-4 space-y-2">
        {TYPES.map((t) => (
          <label
            key={t.value}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
              type === t.value ? "border-brand-500 bg-brand-50" : "border-slate-200"
            }`}
          >
            <input
              type="radio"
              name="type"
              value={t.value}
              checked={type === t.value}
              onChange={(e) => setType(e.target.value)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium text-slate-800">{t.label}</span>
              <span className="block text-xs text-slate-500">{t.hint}</span>
            </span>
          </label>
        ))}
      </div>

      <label className="mb-1 block text-sm font-medium text-slate-700">
        Your email
      </label>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        placeholder="you@example.com"
      />

      <label className="mb-1 block text-sm font-medium text-slate-700">
        Details
      </label>
      <textarea
        required
        rows={4}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        className="mb-5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        placeholder="Tell the business what you need."
      />

      <button
        type="submit"
        disabled={state === "sending"}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {state === "sending" ? "Sending…" : "Submit request"}
      </button>
    </form>
  );
}

export default function RightsPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <Suspense fallback={<p className="text-sm text-slate-400">Loading…</p>}>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            Your data rights
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Submit a request about your personal data under the DPDP Act.
          </p>
        </div>
        <RightsForm />
      </Suspense>
    </div>
  );
}
