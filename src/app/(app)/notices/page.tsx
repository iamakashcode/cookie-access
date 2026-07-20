"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { NoticeVersion } from "@/lib/types";
import { Button, Card, CardTitle, ErrorNote, PageHeader } from "@/components/ui";

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
      <PageHeader
        title="Privacy notice"
        subtitle="The plain-language notice people see before consenting. Every time you publish, a new dated version is saved — old versions are never overwritten."
      />

      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => setLanguage(l.code)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              language === l.code
                ? "bg-brand-600 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

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
            <div className="mb-3 flex items-center justify-between">
              <CardTitle>Notice text ({langLabel})</CardTitle>
              {current && (
                <span className="text-xs font-medium text-slate-400">
                  Current: v{current.version}
                </span>
              )}
            </div>
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
            <div className="mb-3">
              <CardTitle>Version history</CardTitle>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-slate-400">No versions published yet.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((n) => (
                  <li
                    key={n.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-700">
                      Version {n.version}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(n.publishedAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
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
