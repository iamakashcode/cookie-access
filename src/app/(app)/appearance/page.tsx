"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { BannerTheme } from "@/lib/types";
import { useDomains } from "@/components/DomainContext";
import { Button, Card, ErrorNote, PageHeader } from "@/components/ui";

const DEFAULT: BannerTheme = {
  preset: "light",
  layout: "bar",
  primaryColor: "#4338ca",
  bgColor: "#ffffff",
  textColor: "#1a1a2e",
  radius: 14,
};

const PRESETS: { id: string; name: string; theme: BannerTheme }[] = [
  { id: "light", name: "Light", theme: DEFAULT },
  {
    id: "dark",
    name: "Dark",
    theme: { preset: "dark", layout: "bar", primaryColor: "#7c7cf0", bgColor: "#1e1e2e", textColor: "#e8e8f0", radius: 14 },
  },
  {
    id: "minimal",
    name: "Minimal",
    theme: { preset: "minimal", layout: "box-left", primaryColor: "#111111", bgColor: "#ffffff", textColor: "#222222", radius: 6 },
  },
  {
    id: "rounded",
    name: "Rounded",
    theme: { preset: "rounded", layout: "box-right", primaryColor: "#e11d48", bgColor: "#ffffff", textColor: "#1a1a2e", radius: 22 },
  },
  {
    id: "ocean",
    name: "Ocean",
    theme: { preset: "ocean", layout: "bar", primaryColor: "#38bdf8", bgColor: "#0f2942", textColor: "#e6f0f7", radius: 12 },
  },
];

const LAYOUTS: { id: BannerTheme["layout"]; label: string }[] = [
  { id: "bar", label: "Bottom bar" },
  { id: "box-left", label: "Bottom-left" },
  { id: "box-right", label: "Bottom-right" },
  { id: "modal", label: "Center popup" },
];

// Match the widget's colour derivation so the preview is faithful.
function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  const n = m ? parseInt(m[1], 16) : 0x1a1a2e;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function onPrimary(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#111" : "#fff";
}
function rgba(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export default function AppearancePage() {
  const { current } = useDomains();
  const [theme, setTheme] = useState<BannerTheme>(DEFAULT);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ theme: BannerTheme }>("/api/admin/appearance")
      .then((r) => setTheme({ ...DEFAULT, ...r.theme }))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof BannerTheme>(key: K, value: BannerTheme[K]) {
    setTheme((t) => ({ ...t, [key]: value, preset: "custom" }));
    setStatus(null);
  }

  async function save() {
    setError(null);
    setStatus(null);
    try {
      await api.put("/api/admin/appearance", theme);
      setStatus("Saved. Your banner updates on your site within a minute.");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <>
      <PageHeader
        title="Banner design"
        subtitle={`Customize how the consent banner looks on "${current.name}". Changes apply to that domain's widget.`}
        action={<Button onClick={save}>Save design</Button>}
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

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Controls */}
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              Prebuilt themes
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setTheme(p.theme);
                    setStatus(null);
                  }}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-left text-sm transition ${
                    theme.preset === p.id
                      ? "border-brand-500 ring-1 ring-brand-500"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className="h-6 w-6 flex-none rounded-md border"
                    style={{
                      background: p.theme.bgColor,
                      borderColor: rgba(p.theme.textColor, 0.2),
                    }}
                  >
                    <span
                      className="block h-2 w-2 translate-x-1 translate-y-3 rounded-full"
                      style={{ background: p.theme.primaryColor }}
                    />
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                Position
              </label>
              <select
                value={theme.layout}
                onChange={(e) => set("layout", e.target.value as BannerTheme["layout"])}
                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
              >
                {LAYOUTS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <ColorRow label="Buttons / accent" value={theme.primaryColor} onChange={(v) => set("primaryColor", v)} />
            <ColorRow label="Background" value={theme.bgColor} onChange={(v) => set("bgColor", v)} />
            <ColorRow label="Text" value={theme.textColor} onChange={(v) => set("textColor", v)} />

            <div>
              <label className="mb-1 flex items-center justify-between text-sm font-medium text-slate-600">
                <span>Corner radius</span>
                <span className="text-xs text-slate-400">{theme.radius}px</span>
              </label>
              <input
                type="range"
                min={0}
                max={28}
                value={theme.radius}
                onChange={(e) => set("radius", Number(e.target.value))}
                className="w-full"
              />
            </div>
          </Card>
        </div>

        {/* Live preview */}
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-4 py-2 text-xs font-medium text-slate-400">
            Live preview
          </div>
          <Preview theme={theme} business={current.name} />
        </Card>
      </div>
    </>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-600">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 flex-none cursor-pointer rounded border border-slate-300 bg-white p-0.5"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-sm"
        />
      </div>
    </div>
  );
}

function Preview({ theme, business }: { theme: BannerTheme; business: string }) {
  const pos: React.CSSProperties =
    theme.layout === "bar"
      ? { left: 16, right: 16, bottom: 16, maxWidth: 620, margin: "0 auto" }
      : theme.layout === "box-left"
        ? { left: 16, bottom: 16, width: 320 }
        : theme.layout === "box-right"
          ? { right: 16, bottom: 16, width: 320 }
          : { left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 380 };

  const banner: React.CSSProperties = {
    position: "absolute",
    background: theme.bgColor,
    color: theme.textColor,
    border: `1px solid ${rgba(theme.textColor, 0.14)}`,
    borderRadius: theme.radius,
    boxShadow: "0 10px 40px rgba(20,20,60,0.18)",
    padding: "16px 18px",
    ...pos,
  };
  const btn = (bg: string, color: string): React.CSSProperties => ({
    background: bg,
    color,
    border: 0,
    borderRadius: theme.radius * 0.6,
    padding: "8px 14px",
    fontSize: 12.5,
    fontWeight: 600,
  });

  return (
    <div className="relative h-[380px] overflow-hidden bg-slate-100">
      {/* fake page content */}
      <div className="space-y-2 p-6 opacity-50">
        <div className="h-5 w-40 rounded bg-slate-300" />
        <div className="h-3 w-full max-w-md rounded bg-slate-200" />
        <div className="h-3 w-5/6 max-w-md rounded bg-slate-200" />
        <div className="h-3 w-2/3 max-w-md rounded bg-slate-200" />
      </div>
      {theme.layout === "modal" && (
        <div className="absolute inset-0" style={{ background: "rgba(20,20,45,0.45)" }} />
      )}

      <div style={banner}>
        <div style={{ fontSize: 14, fontWeight: 650, marginBottom: 4 }}>
          {business} uses your data with your consent
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.5, color: rgba(theme.textColor, 0.62), marginBottom: 12 }}>
          We ask permission for each purpose before using your personal data.
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button style={btn(theme.primaryColor, onPrimary(theme.primaryColor))}>
            Accept all
          </button>
          <button style={btn(rgba(theme.textColor, 0.08), theme.textColor)}>
            Reject optional
          </button>
          <button style={{ ...btn("transparent", theme.primaryColor), padding: "8px 6px" }}>
            Choose purposes
          </button>
        </div>
      </div>
    </div>
  );
}
