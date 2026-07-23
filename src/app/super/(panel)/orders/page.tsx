"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Badge,
  type BadgeColor,
  Card,
  EmptyState,
  ErrorNote,
  PageHero,
  MetricCard,
} from "@/components/ui";

interface Order {
  id: string;
  domain: string;
  host: string | null;
  account: string;
  contactEmail: string;
  planTier: string;
  amountInr: number;
  subscriptionStatus: string | null;
  subscriptionId: string | null;
  renewsAt: string | null;
  createdAt: string;
}

interface Summary {
  total: number;
  active: number;
  pending: number;
  cancelled: number;
  halted: number;
  mrr: number;
}

const STATUS_COLOR: Record<string, BadgeColor> = {
  active: "success",
  created: "warning",
  cancelled: "neutral",
  halted: "danger",
  none: "neutral",
};

const FILTERS = [
  { id: "", label: "All" },
  { id: "active", label: "Active" },
  { id: "created", label: "Pending payment" },
  { id: "halted", label: "Halted" },
  { id: "cancelled", label: "Cancelled" },
];

export default function SuperOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ orders: Order[]; summary: Summary }>(
        `/api/super/orders${status ? `?status=${status}` : ""}`,
      )
      .then((r) => {
        setOrders(r.orders);
        setSummary(r.summary);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <>
      <PageHero
        tone="amber"
        icon="◈"
        title="Orders & revenue"
        subtitle="Every subscription on the platform — live plans, pending checkouts, and the ones that lapsed."
      />

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      {summary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-pop">
            <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                MRR
              </div>
              <div className="mt-2 text-3xl font-bold tracking-tight">
                ₹{summary.mrr.toLocaleString("en-IN")}
              </div>
              <div className="mt-1 text-xs text-white/70">
                {summary.active} active subscription
                {summary.active === 1 ? "" : "s"}
              </div>
            </div>
          </div>
          <MetricCard label="Total orders" value={summary.total} icon="◈" tone="violet" />
          <MetricCard
            label="Pending payment"
            value={summary.pending}
            icon="◔"
            tone="orange"
          />
          <MetricCard
            label="Cancelled / halted"
            value={summary.cancelled + summary.halted}
            icon="↺"
            tone="rose"
          />
        </div>
      )}

      <div className="mb-4 inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setStatus(f.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              status === f.id
                ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : orders.length === 0 ? (
        <EmptyState
          icon="◈"
          title="No orders in this view"
          hint="Subscriptions appear here as soon as a customer starts a checkout."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <Th>Domain</Th>
                  <Th>Account</Th>
                  <Th>Plan</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>Renews</Th>
                  <Th>Subscription</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 [&_tr:hover]:bg-slate-50/60">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <Td>
                      <div className="font-semibold text-slate-800">{o.domain}</div>
                      <div className="text-xs text-slate-400">{o.host || "—"}</div>
                    </Td>
                    <Td>
                      <div className="text-slate-700">{o.account}</div>
                      <div className="text-xs text-slate-400">{o.contactEmail}</div>
                    </Td>
                    <Td>
                      <Badge color={o.planTier === "free" ? "neutral" : "brand"}>
                        {o.planTier}
                      </Badge>
                    </Td>
                    <Td>
                      <span className="font-semibold tabular-nums text-slate-800">
                        ₹{o.amountInr.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-slate-400">/mo</span>
                    </Td>
                    <Td>
                      <Badge
                        color={STATUS_COLOR[o.subscriptionStatus ?? "none"] ?? "neutral"}
                      >
                        {o.subscriptionStatus ?? "none"}
                      </Badge>
                    </Td>
                    <Td>
                      <span className="text-xs text-slate-500">
                        {o.renewsAt
                          ? new Date(o.renewsAt).toLocaleDateString()
                          : "—"}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-[11px] text-slate-400">
                        {o.subscriptionId ?? "—"}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="px-4 py-3 font-medium">{children}</th>
);
const Td = ({ children }: { children: React.ReactNode }) => (
  <td className="px-4 py-3 align-top text-slate-700">{children}</td>
);
