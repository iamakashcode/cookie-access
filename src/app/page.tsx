import Link from "next/link";

// Public marketing landing page. This is the front door: a visitor learns what
// the product does and either signs in or registers a new business (tenant).
export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <MarketingNav />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <FinalCta />
    </div>
  );
}

function MarketingNav() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            C
          </span>
          <span className="text-sm font-semibold text-slate-900">
            Consent Manager
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Get started free
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-6 pb-16 pt-16 text-center sm:pt-24">
      <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
        Built for India&rsquo;s DPDP Act, 2023 &amp; Rules, 2025
      </span>
      <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
        Collect consent the right way — one line of code.
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
        Show your website visitors a clear, purpose-by-purpose consent notice,
        let them withdraw as easily as they agreed, and keep a permanent,
        exportable record of every choice. No legal jargon, no engineering team
        required.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/signup"
          className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          Create your free account
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Sign in
        </Link>
      </div>
      <p className="mt-4 text-xs text-slate-400">
        Free to start · Helps you operationalize consent — not legal advice.
      </p>
    </section>
  );
}

const FEATURES = [
  {
    title: "Purpose-level consent",
    body: "Ask permission for each specific reason you use data — not a single all-or-nothing cookie banner.",
  },
  {
    title: "Effortless withdrawal",
    body: "A persistent “Manage preferences” link lets people change their mind any time. As easy to say no as yes.",
  },
  {
    title: "Tamper-proof records",
    body: "Every grant and withdrawal is written to an append-only ledger you can export as evidence — nothing is ever overwritten.",
  },
  {
    title: "Plain-language notices",
    body: "Generate and edit a privacy notice from a template. Every version is saved and dated automatically.",
  },
  {
    title: "One-line install",
    body: "Paste a single script tag into your site. Works on Shopify, WordPress, Wix, or custom builds.",
  },
  {
    title: "Privacy by design",
    body: "Personal data is encrypted at rest, and every account's data is fully isolated from every other.",
  },
];

function Features() {
  return (
    <section className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold text-slate-900">
          Everything you need to manage consent
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 p-5"
            >
              <h3 className="text-sm font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    n: "1",
    title: "Define your purposes",
    body: "List the specific reasons you collect data — e.g. order delivery, marketing, analytics.",
  },
  {
    n: "2",
    title: "Install the widget",
    body: "Copy one script tag into your website. The consent banner appears instantly.",
  },
  {
    n: "3",
    title: "Track & prove consent",
    body: "Watch consent come in, handle requests, and export your records whenever you need them.",
  },
];

function HowItWorks() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="text-center text-2xl font-semibold text-slate-900">
        Live in three steps
      </h2>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
              {s.n}
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              {s.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    tagline: "For getting started",
    features: ["1 website", "Unlimited consent purposes", "Consent records + CSV export"],
    highlighted: false,
  },
  {
    name: "Starter",
    price: "₹999",
    period: "/mo",
    tagline: "For growing businesses",
    features: ["Everything in Free", "Data-rights request portal", "Hindi + English notices"],
    highlighted: true,
  },
  {
    name: "Growth",
    price: "₹2,999",
    period: "/mo",
    tagline: "For established teams",
    features: ["Everything in Starter", "Team members & roles", "Priority support"],
    highlighted: false,
  },
];

function Pricing() {
  return (
    <section className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold text-slate-900">
          Simple, transparent pricing
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Start free. Paid plans arrive with later releases.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border p-6 ${
                p.highlighted
                  ? "border-brand-600 shadow-md ring-1 ring-brand-600"
                  : "border-slate-200"
              }`}
            >
              {p.highlighted && (
                <span className="mb-3 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  Most popular
                </span>
              )}
              <h3 className="text-base font-semibold text-slate-900">{p.name}</h3>
              <p className="text-xs text-slate-500">{p.tagline}</p>
              <div className="mt-4">
                <span className="text-3xl font-bold text-slate-900">{p.price}</span>
                {p.period && (
                  <span className="text-sm text-slate-500">{p.period}</span>
                )}
              </div>
              <ul className="mt-5 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-0.5 text-brand-600">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-6 block rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition ${
                  p.highlighted
                    ? "bg-brand-600 text-white hover:bg-brand-700"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="rounded-3xl bg-slate-900 px-8 py-14 text-center">
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">
          Start collecting consent the compliant way
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
          Create your free account and add the consent widget to your website in
          the next ten minutes.
        </p>
        <Link
          href="/signup"
          className="mt-7 inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
        >
          Create your free account
        </Link>
      </div>
    </section>
  );
}
