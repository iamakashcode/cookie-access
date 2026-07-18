"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

function Verifier() {
  const token = useSearchParams().get("token") || "";
  const [state, setState] = useState<"verifying" | "done" | "error">("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("This verification link is incomplete.");
      return;
    }
    api
      .get<{ verified?: boolean; alreadyVerified?: boolean }>(
        `/api/public/parental-consent/verify?token=${encodeURIComponent(token)}`,
      )
      .then((r) => {
        setState("done");
        setMessage(
          r.alreadyVerified
            ? "This consent was already confirmed. Nothing more to do."
            : "Thank you — consent has been confirmed and recorded.",
        );
      })
      .catch((e) => {
        setState("error");
        setMessage((e as Error).message);
      });
  }, [token]);

  const tone =
    state === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <div className={`rounded-2xl border p-6 text-center ${tone}`}>
      <h1 className="text-lg font-semibold">
        {state === "verifying"
          ? "Confirming…"
          : state === "error"
            ? "We couldn't confirm this"
            : "Consent confirmed"}
      </h1>
      <p className="mt-2 text-sm">{message}</p>
    </div>
  );
}

export default function ParentalVerifyPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Suspense fallback={<p className="text-sm text-slate-400">Loading…</p>}>
        <Verifier />
      </Suspense>
    </div>
  );
}
