"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { BillingInfo, UsageInfo } from "@/lib/types";
import { useDomains } from "@/components/DomainContext";
import { Button, Card, ErrorNote, PageHero } from "@/components/ui";
import { UsageBar } from "@/components/UsageBar";

// Minimal shape of Razorpay Checkout we use.
interface RazorpayOptions {
  key: string;
  subscription_id: string;
  name: string;
  description?: string;
  handler: (r: unknown) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
}
interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (r: unknown) => void) => void;
}
declare global {
  interface Window {
    Razorpay?: new (o: RazorpayOptions) => RazorpayInstance;
  }
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

// Load Razorpay Checkout once, on demand.
function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = CHECKOUT_SRC;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function BillingPage() {
  const { current } = useDomains();
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function refresh() {
    return api
      .get<BillingInfo>("/api/admin/billing")
      .then(setInfo)
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    refresh();
    api
      .get<UsageInfo>("/api/admin/usage")
      .then(setUsage)
      .catch(() => {});
  }, []);

  // After a successful payment the plan is upgraded by the Razorpay webhook,
  // which can land anywhere from a few seconds to a couple of minutes later.
  // Poll for up to ~3 minutes (every 3s) so the UI reflects it without a manual
  // reload, and keep showing progress the whole time.
  async function awaitUpgrade(tier: string) {
    const deadline = Date.now() + 3 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 3000));
      const next = await api
        .get<BillingInfo>("/api/admin/billing")
        .catch(() => null);
      if (next) {
        setInfo(next);
        if (next.currentPlan === tier) {
          setStatus(`You're now on the ${tier} plan. 🎉`);
          return;
        }
      }
    }
    setStatus(
      "Payment received — your plan will activate here as soon as the payment " +
        "provider confirms it (usually within a couple of minutes). You can " +
        "safely refresh this page.",
    );
  }

  async function cancel() {
    if (
      !confirm(
        `Cancel the ${info?.currentPlan} plan for "${current.name}"?\n\n` +
          `The subscription and its auto-renewal are stopped, and the domain ` +
          `returns to the Free plan. You can upgrade again anytime.`,
      )
    )
      return;
    setBusy("cancel");
    setError(null);
    setStatus(null);
    try {
      await api.post("/api/admin/billing/cancel");
      await refresh();
      setStatus("Your subscription has been cancelled. You're back on the Free plan.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not cancel the subscription.");
    } finally {
      setBusy(null);
    }
  }

  async function subscribe(tier: "starter" | "growth") {
    setBusy(tier);
    setError(null);
    setStatus(null);
    try {
      const res = await api.post<{
        subscriptionId: string;
        keyId: string | null;
        businessName: string;
        checkoutUrl?: string;
      }>("/api/admin/billing/subscribe", { tier });

      // Preferred: embedded Checkout popup over this page → we control the
      // post-payment flow and keep the user on the dashboard.
      if (res.keyId && (await loadCheckout()) && window.Razorpay) {
        const rzp = new window.Razorpay({
          key: res.keyId,
          subscription_id: res.subscriptionId,
          name: res.businessName || current.name,
          description: `${tier[0].toUpperCase()}${tier.slice(1)} plan`,
          theme: { color: "#4338ca" },
          handler: () => {
            setBusy(null);
            setStatus("Payment successful — activating your plan…");
            void awaitUpgrade(tier);
          },
          modal: { ondismiss: () => setBusy(null) },
        });
        rzp.open();
        return;
      }

      // Fallback: Razorpay hosted page (leaves the dashboard).
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      setError("Subscription created, but checkout could not be opened.");
      setBusy(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start checkout.");
      setBusy(null);
    }
  }

  if (error && !info)
    return (
      <>
        <PageHero tone="green" icon="◈" title="Billing & plan" />
        <ErrorNote message={error} />
      </>
    );
  if (!info) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <>
      <PageHero
        tone="green"
        icon="◈"
        title="Billing & plan"
        subtitle={`"${current.name}" is on the ${info.currentPlan} plan. Each domain is billed separately.`}
      />

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

      {!info.configured && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">
            Payments aren&rsquo;t connected yet. Add your Razorpay keys
            (<code>RAZORPAY_KEY_ID</code> / <code>RAZORPAY_KEY_SECRET</code>) to the
            server to enable paid plans. The plans below show what will be offered.
          </p>
        </Card>
      )}

      {usage && <UsageBar usage={usage} />}

      {info.currentPlan !== "free" && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold capitalize text-slate-900">
              {info.currentPlan} plan — active
            </p>
            <p className="text-sm text-slate-500">
              {info.renewsAt
                ? `Renews on ${new Date(info.renewsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.`
                : "Auto-renews monthly."}{" "}
              Cancelling stops future charges and returns this domain to Free.
            </p>
          </div>
          <Button
            variant="danger"
            onClick={cancel}
            disabled={busy === "cancel"}
          >
            {busy === "cancel" ? "Cancelling…" : "Cancel subscription"}
          </Button>
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
