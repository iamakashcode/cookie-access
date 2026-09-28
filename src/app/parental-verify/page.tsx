"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

type State = "loading" | "confirm" | "confirming" | "done" | "error";

function Verifier() {
  const token = useSearchParams().get("token") || "";
  const [state, setState] = useState<State>("loading");
  const [siteName, setSiteName] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const url = `/api/public/parental-consent/verify?token=${encodeURIComponent(token)}`;

  // Look the request up only — consent is recorded when the guardian clicks
  // Confirm, never just by opening the link (mail scanners open links too).
  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("This verification link is incomplete.");
      return;
    }
    api
      .get<{ siteName: string | null; alreadyVerified: boolean; expired: boolean }>(url)
      .then((r) => {
        setSiteName(r.siteName);
        if (r.alreadyVerified) {
          setState("done");
          setMessage("This consent was already confirmed. Nothing more to do.");
        } else if (r.expired) {
          setState("error");
          setMessage("This link has expired. Please ask for a new one from the website.");
        } else {
          setState("confirm");
        }
      })
      .catch((e) => {
        setState("error");
        setMessage((e as Error).message);
      });
  }, [token, url]);

  async function confirm() {
    setState("confirming");
    try {
      const r = await api.post<{ alreadyVerified?: boolean }>(url, {});
      setState("done");
      setMessage(
        r.alreadyVerified
          ? "This consent was already confirmed. Nothing more to do."
          : "Thank you — consent has been confirmed and recorded.",
      );
    } catch (e) {
      setState("error");
      setMessage((e as Error).message);
    }
  }

  const tone =
    state === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : state === "done"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-slate-200 bg-white text-slate-700";

  return (
    <div className={`rounded-2xl border p-6 text-center ${tone}`}>
      <h1 className="text-lg font-semibold">
        {state === "loading"
          ? "Loading…"
          : state === "error"
            ? "We couldn't confirm this"
            : state === "done"
              ? "Consent confirmed"
              : "Confirm parental consent"}
      </h1>
      {state === "confirm" || state === "confirming" ? (
        <>
          <p className="mt-2 text-sm">
            You were named as the parent or guardian of a child using{" "}
            <strong>{siteName ?? "this website"}</strong>. Do you give consent for
            the choices they made?
          </p>
          <button
            onClick={confirm}
            disabled={state === "confirming"}
            className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {state === "confirming" ? "Confirming…" : "Yes, I give consent"}
          </button>
          <p className="mt-3 text-xs text-slate-500">
            If you don&rsquo;t recognise this, just close this page — nothing is
            recorded unless you confirm.
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm">{message}</p>
      )}
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
