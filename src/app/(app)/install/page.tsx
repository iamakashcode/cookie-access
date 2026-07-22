"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Purpose } from "@/lib/types";
import { useDomains } from "@/components/DomainContext";
import { widgetSnippet } from "@/lib/widget";
import { Card, PageHero, SectionHeader } from "@/components/ui";

export default function InstallPage() {
  const { current, reloadSites } = useDomains();
  const apiKey = current.apiKey;
  const [copied, setCopied] = useState(false);
  const [purposes, setPurposes] = useState<Purpose[]>([]);

  useEffect(() => {
    api
      .get<{ purposes: Purpose[] }>("/api/admin/purposes")
      .then((r) => setPurposes(r.purposes.filter((p) => p.isActive)))
      .catch(() => {});
  }, []);

  // A representative gate-able category (prefer analytics), for the example.
  const optional = purposes.filter((p) => !p.isEssential);
  const exampleKey =
    optional.find((p) => p.categoryKey === "analytics")?.categoryKey ||
    optional[0]?.categoryKey ||
    "analytics";

  const snippet = widgetSnippet(apiKey);
  const blockSnippet = `<!-- blocked until "${exampleKey}" consent -->\n<script type="text/plain" data-dpdp="${exampleKey}"\n  src="https://example.com/tracker.js"></script>`;

  const rightsUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/rights?k=${apiKey}`
      : `/rights?k=${apiKey}`;

  // Poll for verification while the selected domain hasn't been detected yet.
  const reload = useRef(reloadSites);
  reload.current = reloadSites;
  useEffect(() => {
    if (current.verified) return;
    const t = setInterval(() => reload.current().catch(() => {}), 4000);
    return () => clearInterval(t);
  }, [current.verified]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <>
      <PageHero
        tone="fuchsia"
        icon="❮❯"
        title="Install the widget"
        subtitle={`For the "${current.name}" domain. One line of code adds the consent banner and a permanent "Manage preferences" link to your website.`}
      />

      {current.verified ? (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="text-base">✓</span>
          <span>
            <strong>Verified.</strong> The widget is live
            {current.verifiedOrigin ? ` on ${current.verifiedOrigin}` : ""}.
          </span>
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <span>
            <strong>Not verified yet.</strong> Add the snippet below to your site
            — this turns green automatically once the widget loads.
          </span>
        </div>
      )}

      <Card className="mb-6">
        <SectionHeader
          tone="fuchsia"
          icon="1"
          title="Add this to your site's <head>"
        />
        <p className="mb-3 text-sm text-slate-500">
          Paste it as <strong>the first script inside <code>&lt;head&gt;</code></strong>,
          before any other scripts. That&rsquo;s important: to block trackers
          before they run, the consent widget has to load first.
        </p>
        <div className="relative">
          <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-[13px] leading-relaxed text-slate-100">
            <code>{snippet}</code>
          </pre>
          <button
            onClick={copy}
            className="absolute right-3 top-3 rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/20"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </Card>

      <Card className="mb-6">
        <SectionHeader
          tone="fuchsia"
          icon="2"
          title="Block your trackers until consent"
        />
        <p className="mb-3 text-sm text-slate-500">
          The widget <strong>denies trackers by default</strong> and only lets
          them run once the visitor consents to the matching purpose.
        </p>
        <p className="mb-2 text-sm font-medium text-slate-600">
          Common trackers are auto-blocked
        </p>
        <p className="mb-3 text-sm text-slate-500">
          Google Analytics, Google Tag Manager, Facebook Pixel, Hotjar and others
          are recognised and held automatically — nothing to do.
        </p>
        <p className="mb-2 text-sm font-medium text-slate-600">
          For anything else, wrap the script
        </p>
        <p className="mb-2 text-sm text-slate-500">
          Change the tracker&rsquo;s <code>type</code> to <code>text/plain</code>{" "}
          and add <code>data-dpdp=&quot;&lt;purpose key&gt;&quot;</code>. It stays
          off until that purpose is consented to:
        </p>
        <pre className="mb-3 overflow-x-auto rounded-xl bg-slate-900 p-4 text-[12.5px] leading-relaxed text-slate-100">
          <code>{blockSnippet}</code>
        </pre>
        <p className="mb-2 text-sm font-medium text-slate-600">
          Or gate your own code
        </p>
        <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-[12.5px] leading-relaxed text-slate-100">
          <code>{`if (window.DPDPConsent.getConsent("${exampleKey}")) {\n  // run analytics / load pixel\n}\nwindow.DPDPConsent.onChange(() => { /* react to changes */ });`}</code>
        </pre>
        {optional.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            Your purpose keys:{" "}
            {optional.map((p) => (
              <code
                key={p.id}
                className="mr-1 rounded bg-slate-100 px-1.5 py-0.5 text-slate-700"
              >
                {p.categoryKey}
              </code>
            ))}
          </p>
        )}
      </Card>

      <Card className="mb-6">
        <SectionHeader tone="amber" icon="✎" title="Your data-rights portal" />
        <p className="mb-2 text-sm text-slate-500">
          Share this link (e.g. in your privacy policy or website footer) so
          people can request access to, correction, or erasure of their data.
          Requests land under <strong>Data-rights requests</strong>.
        </p>
        <a
          href={rightsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block break-all rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-sm text-brand-700 hover:underline"
        >
          {rightsUrl}
        </a>
      </Card>

      <Card>
        <SectionHeader tone="indigo" icon="🔑" title="Your public widget key" />
        <p className="mb-2 text-sm text-slate-500">
          This key only identifies your account to the widget. It&rsquo;s safe to
          have in your website&rsquo;s code — it can&rsquo;t be used to sign in or
          read your data.
        </p>
        <code className="inline-block rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-sm text-slate-700">
          {apiKey}
        </code>
      </Card>
    </>
  );
}
