"use client";

import Link from "next/link";
import type { UsageInfo } from "@/lib/types";
import { Card, CardTitle } from "@/components/ui";

/**
 * Monthly traffic meter for the selected domain. Plans are metered on visitor
 * sessions; at 80% we warn, at 100% the consent banner stops being shown.
 */
export function UsageBar({ usage }: { usage: UsageInfo }) {
  const pct = Math.min(100, usage.percent);
  const tone = usage.over
    ? { bar: "bg-red-500", text: "text-red-700", ring: "border-red-200 bg-red-50" }
    : usage.warn
      ? { bar: "bg-amber-500", text: "text-amber-700", ring: "border-amber-200 bg-amber-50" }
      : { bar: "bg-gradient-to-r from-brand-500 to-brand-600", text: "text-slate-500", ring: "" };

  return (
    <Card className={usage.warn || usage.over ? `mb-6 ${tone.ring}` : "mb-6"}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Traffic this month</CardTitle>
        <span className="text-xs font-medium text-slate-400">
          {usage.period} · {usage.planTier} plan
        </span>
      </div>

      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-2xl font-bold tracking-tight text-slate-900">
          {usage.sessions.toLocaleString("en-IN")}
          <span className="ml-1 text-sm font-medium text-slate-400">
            / {usage.limit.toLocaleString("en-IN")} visitors
          </span>
        </span>
        <span className={`text-sm font-semibold ${tone.text}`}>{usage.percent}%</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${pct}%` }} />
      </div>

      {usage.over ? (
        <p className="mt-3 text-sm text-red-700">
          <strong>Monthly limit reached.</strong> The consent banner has stopped
          appearing for new visitors, so no new consent is being collected.
          Trackers stay blocked, so your site is still safe.{" "}
          <Link href="/billing" className="font-semibold underline">
            Upgrade to resume
          </Link>
          .
        </p>
      ) : usage.warn ? (
        <p className="mt-3 text-sm text-amber-700">
          You&rsquo;ve used {usage.percent}% of this month&rsquo;s visitors. At 100%
          the consent banner stops showing.{" "}
          <Link href="/billing" className="font-semibold underline">
            Upgrade
          </Link>{" "}
          to avoid interruption.
        </p>
      ) : (
        <p className="mt-3 text-xs text-slate-400">
          Counted once per visitor session, not per page view. Resets on the 1st
          of each month.
        </p>
      )}
    </Card>
  );
}
