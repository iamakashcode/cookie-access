"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { BillingInfo } from "@/lib/types";
import { useDomains } from "@/components/DomainContext";
import { Card, ErrorNote, PageHeader } from "@/components/ui";

export default function BillingPage() {
  const { current } = useDomains();
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<BillingInfo>("/api/admin/billing")
      .then(setInfo)
      .catch((e) => setError(e.message));
  }, []);

  async function subscribe(tier: "starter" | "growth") {
    setBusy(tier);
    setError(null);
    try {
      const res = await api.post<{ checkoutUrl?: string }>(
        "/api/admin/billing/subscribe",
        { tier },
      );
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl; // Razorpay hosted checkout
      } else {
        setError("Subscription created, but no checkout URL was returned.");
      }
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not start checkout.",
      );
    } finally {
      setBusy(null);
    }
  }

  if (error && !info)
    return (
      <>
        <PageHeader title="Billing & plan" />
        <ErrorNote message={error} />
      </>
    );
  if (!info) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <>
      <PageHeader
        title="Billing & plan"
        subtitle={`"${current.name}" is on the ${info.currentPlan} plan. Each domain is billed separately.`}
      />

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      {!info.configured && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">
            Payments aren&rsquo;t connected yet. Add your Razorpay keys
            (<code>RAZORPAY_KEY_ID</code> / <code>RAZORPAY_KEY_SECRET</code>) to the
            server to enable paid plans. The plans below show what will be offered.
          </p>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {info.plans.map((p) => {
          const isCurrent = p.tier === info.currentPlan;
          const isPaid = p.tier !== "free";
          return (
            <Card
              key={p.tier}
              className={isCurrent ? "ring-2 ring-brand-600" : ""}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">
                  {p.name}
                </h3>
                {isCurrent && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                    Current
                  </span>
                )}
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold text-slate-900">
                  ₹{p.priceInr.toLocaleString("en-IN")}
                </span>
                {isPaid && <span className="text-sm text-slate-500">/mo</span>}
              </div>
              <ul className="mt-5 space-y-2">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-slate-600"
                  >
                    <span className="mt-0.5 text-brand-600">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {isPaid && !isCurrent && (
                <button
                  onClick={() => subscribe(p.tier as "starter" | "growth")}
                  disabled={busy === p.tier || !info.configured}
                  className="mt-6 block w-full rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {busy === p.tier ? "Starting…" : `Upgrade to ${p.name}`}
                </button>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
