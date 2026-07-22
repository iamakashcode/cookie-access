"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { NoticeVersion } from "@/lib/types";
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  PageHero,
  SectionHeader,
} from "@/components/ui";

const TEMPLATE = `Privacy Notice — [Your business name]

We collect and use your personal data only for the purposes listed below, and
only with your consent (except where a purpose is essential to providing our
service). You can review or withdraw your consent at any time.

What we collect and why:
- [Purpose]: [what data, and why you need it]

You can also ask us to access, correct, or erase your data, or raise a concern.
Contact us at [email].`;

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी (Hindi)" },
];

export default function NoticesPage() {
  const [language, setLanguage] = useState("en");
  const [history, setHistory] = useState<NoticeVersion[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(lang: string) {
    setLoading(true);
    try {
      const { notices } = await api.get<{ notices: NoticeVersion[] }>(
        `/api/admin/notices?language=${lang}`,
      );
      setHistory(notices);
      setBody(notices[0]?.bodyText ?? TEMPLATE);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setStatus(null);
    load(language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  async function publish() {
    setError(null);
    setStatus(null);
    try {
      await api.post("/api/admin/notices", { language, bodyText: body });
      setStatus("Published a new version. Visitors will see it on their next visit.");
      await load(language);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const current = history[0];
  const langLabel = LANGUAGES.find((l) => l.code === language)?.label ?? language;

  return (
    <>
      <PageHero
        tone="sky"
        icon="▤"
        title="Privacy notice"
        subtitle="The plain-language notice people see before consenting. Every time you publish, a new dated version is saved — old versions are never overwritten."
        action={
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  language === l.code
                    ? "bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        }
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

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <SectionHeader
              tone="sky"
              icon="▤"
              title={`Notice text (${langLabel})`}
              right={
                current ? (
                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                    Current: v{current.version}
                  </span>
                ) : null
              }
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={18}
              className="w-full rounded-lg border border-slate-300 p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <div className="mt-3 flex items-center gap-3">
              <Button
                onClick={publish}
                disabled={!body.trim() || body === current?.bodyText}
              >
                Publish new version
              </Button>
              <span className="text-xs text-slate-400">
                Visitors are shown the notice matching their language, falling
                back to English.
              </span>
            </div>
          </Card>

          <Card>
            <SectionHeader tone="sky" icon="≣" title="Version history" />
            {history.length === 0 ? (
              <EmptyState title="No versions published yet" />
            ) : (
              <ol className="relative space-y-3 before:absolute before:bottom-3 before:left-[13px] before:top-3 before:w-px before:bg-slate-200">
                {history.map((n, i) => (
                  <li key={n.id} className="relative flex items-center gap-3 pl-9">
                    <span
                      className={`absolute left-0 top-1/2 flex h-[27px] w-[27px] -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold ring-4 ring-white ${
                        i === 0
                          ? "bg-gradient-to-br from-sky-500 to-cyan-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      v{n.version}
                    </span>
                    <div className="flex flex-1 items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">
                        Version {n.version}
                        {i === 0 && (
                          <span className="ml-2 text-[11px] font-semibold text-sky-600">
                            live
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(n.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              Keeping every version lets you show exactly what a person saw and
              agreed to at any point in time.
            </p>
          </Card>
        </div>
      )}
    </>
  );
}
