"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Purpose } from "@/lib/types";
import { Button, Card, ErrorNote, PageHeader } from "@/components/ui";

interface FormState {
  id?: string;
  name: string;
  description: string;
  isEssential: boolean;
  involvesMinors: boolean;
  categoryKey: string;
}

const EMPTY: FormState = {
  name: "",
  description: "",
  isEssential: false,
  involvesMinors: false,
  categoryKey: "",
};

export default function PurposesPage() {
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { purposes } = await api.get<{ purposes: Purpose[] }>(
        "/api/admin/purposes",
      );
      setPurposes(purposes);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!form) return;
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description,
        isEssential: form.isEssential,
        involvesMinors: form.involvesMinors,
      };
      // Only send a category key if the owner set one (else the server derives it).
      if (form.categoryKey.trim()) payload.categoryKey = form.categoryKey.trim();
      if (form.id) {
        await api.put(`/api/admin/purposes/${form.id}`, payload);
      } else {
        await api.post("/api/admin/purposes", payload);
      }
      setForm(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function deactivate(id: string) {
    if (!confirm("Hide this purpose from your consent notice? Existing records are kept.")) return;
    try {
      await api.del(`/api/admin/purposes/${id}`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const active = purposes.filter((p) => p.isActive);
  const inactive = purposes.filter((p) => !p.isActive);

  return (
    <>
      <PageHeader
        title="Consent purposes"
        subtitle="The specific reasons you collect personal data. People consent to each one separately."
        action={
          <Button onClick={() => setForm({ ...EMPTY })}>+ Add purpose</Button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      {form && (
        <Card className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            {form.id ? "Edit purpose" : "New purpose"}
          </h2>
          <label className="mb-1 block text-sm font-medium text-slate-600">
            Name
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Marketing emails"
            className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <label className="mb-1 block text-sm font-medium text-slate-600">
            What you tell people (plain language)
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="e.g. We use your email to send offers and product updates."
            className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <label className="mb-3 flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.isEssential}
              onChange={(e) =>
                setForm({ ...form, isEssential: e.target.checked })
              }
            />
            This is essential to provide the service (people can&rsquo;t switch it
            off)
          </label>
          <label className="mb-3 flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.involvesMinors}
              onChange={(e) =>
                setForm({ ...form, involvesMinors: e.target.checked })
              }
            />
            This may involve children under 18 (routes through parental consent)
          </label>
          <label className="mb-1 block text-sm font-medium text-slate-600">
            Category key <span className="font-normal text-slate-400">(for blocking scripts — optional)</span>
          </label>
          <input
            value={form.categoryKey}
            onChange={(e) => setForm({ ...form, categoryKey: e.target.value })}
            placeholder="e.g. analytics, marketing (auto-generated if blank)"
            className="mb-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <p className="mb-4 text-xs text-slate-400">
            Used in your site as <code>data-dpdp=&quot;{form.categoryKey.trim() || "key"}&quot;</code>{" "}
            to gate scripts. Use <code>analytics</code> / <code>marketing</code> to
            match the built-in auto-blocker.
          </p>
          <div className="flex gap-2">
            <Button onClick={save} disabled={!form.name || !form.description}>
              Save
            </Button>
            <Button variant="secondary" onClick={() => setForm(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="space-y-3">
          {active.map((p) => (
            <Card key={p.id} className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">{p.name}</span>
                  {p.isEssential && (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Essential
                    </span>
                  )}
                  {p.involvesMinors && (
                    <span className="rounded bg-purple-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-purple-600">
                      Minors
                    </span>
                  )}
                  {p.categoryKey && (
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-500">
                      {p.categoryKey}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">{p.description}</p>
              </div>
              <div className="flex flex-none gap-2">
                <Button
                  variant="secondary"
                  onClick={() =>
                    setForm({
                      id: p.id,
                      name: p.name,
                      description: p.description,
                      isEssential: p.isEssential,
                      involvesMinors: p.involvesMinors,
                      categoryKey: p.categoryKey,
                    })
                  }
                >
                  Edit
                </Button>
                <Button variant="danger" onClick={() => deactivate(p.id)}>
                  Hide
                </Button>
              </div>
            </Card>
          ))}
          {active.length === 0 && (
            <p className="text-sm text-slate-400">
              No purposes yet. Add your first one to start collecting consent.
            </p>
          )}

          {inactive.length > 0 && (
            <>
              <h3 className="pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Hidden purposes
              </h3>
              {inactive.map((p) => (
                <Card key={p.id} className="opacity-60">
                  <span className="font-medium text-slate-700">{p.name}</span>
                  <p className="mt-1 text-sm text-slate-500">{p.description}</p>
                </Card>
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}
