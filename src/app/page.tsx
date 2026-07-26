import Link from "next/link";
import Image from "next/image";
import {
  Counter,
  LiveConsentDemo,
  Magnetic,
  Marquee,
  Parallax,
  Reveal,
  ScrollProgress,
  Spotlight,
  Tilt3D,
  TrackerPills,
} from "@/components/marketing";
import { ThreeHeroLazy } from "@/components/three-hero-lazy";

// Public marketing landing page — the product's front door.
export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col overflow-x-hidden bg-white">
      <ScrollProgress />
      <MarketingNav />
      <Hero />
      <TrustStrip />
      <Stats />
      <Features />
      <HowItWorks />
      <Compliance />
      <Pricing />
      <FinalCta />
      <MarketingFooter />
    </div>
  );
}

function Logo({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/cookie-access-logo.png"
      alt="Cookie Access"
      width={1013}
      height={162}
      priority
      className={`h-8 w-auto ${className}`}
    />
  );
}

function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          <a href="#features" className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            Features
          </a>
          <a href="#compliance" className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            DPDP Act
          </a>
          <a href="#pricing" className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
          >
            <span className="relative z-10">Get started free</span>
            <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <Spotlight className="relative isolate overflow-hidden">
      {/* animated aurora blobs + live 3D globe */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-0 h-96 w-96 animate-blob rounded-full bg-brand-300/40 blur-3xl" />
        <div className="absolute right-0 top-10 h-96 w-96 animate-blob rounded-full bg-violet-300/40 blur-3xl [animation-delay:3s]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 animate-blob rounded-full bg-sky-300/40 blur-3xl [animation-delay:6s]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.05)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>
      <div className="absolute inset-0 -z-10 opacity-90">
        <ThreeHeroLazy />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 sm:pt-24 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <Reveal className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/80 px-3 py-1 text-xs font-semibold text-brand-700 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand-500" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
            </span>
            Built for India&rsquo;s DPDP Act, 2023 &amp; Rules, 2025
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Consent, done{" "}
              <span className="animate-gradient-pan bg-[linear-gradient(90deg,#4f46e5,#7c3aed,#0ea5e9,#4f46e5)] bg-[length:200%_auto] bg-clip-text text-transparent">
                the right way
              </span>{" "}
              — one line of code.
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              A purpose-by-purpose consent banner that blocks trackers until people
              agree, lets them withdraw as easily as they said yes, and keeps a
              permanent, exportable record of every choice. No legal jargon, no
              engineering team required.
            </p>
          </Reveal>

          <Reveal delay={240} className="mt-8 flex flex-wrap items-center gap-3">
            <Magnetic>
              <Link
                href="/signup"
                className="group relative flex overflow-hidden rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:shadow-xl hover:shadow-brand-600/30"
              >
                <span className="relative z-10">Create your free account →</span>
                <span className="absolute inset-0 -translate-x-full bg-white/25 transition-transform duration-700 group-hover:translate-x-full" />
              </Link>
            </Magnetic>
            <a
              href="#features"
              className="rounded-xl border border-slate-300 bg-white/80 px-6 py-3.5 text-sm font-semibold text-slate-700 backdrop-blur transition hover:bg-white"
            >
              See how it works
            </a>
          </Reveal>

          <Reveal delay={320} className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400">
            <span>✓ Free to start</span>
            <span>✓ Install in 10 minutes</span>
            <span>✓ Encrypted &amp; append-only records</span>
          </Reveal>
        </div>

        <Reveal delay={200} className="flex justify-center lg:justify-end">
          <Tilt3D max={8}>
            <LiveConsentDemo />
          </Tilt3D>
        </Reveal>
      </div>
    </Spotlight>
  );
}

function TrustStrip() {
  return (
    <div className="border-y border-slate-200 bg-slate-50/60 py-5">
      <div className="mx-auto max-w-6xl px-6">
        <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Drops into any website
        </p>
        <Marquee
          items={[
            "Shopify",
            "WordPress",
            "Wix",
            "Next.js",
            "React",
            "Webflow",
            "Custom HTML",
            "Squarespace",
            "Razorpay",
            "Google Tag Manager",
          ]}
        />
      </div>
    </div>
  );
}

const STAT_ITEMS = [
  { to: 1, suffix: " line", label: "to install the widget" },
  { to: 100, suffix: "%", label: "append-only consent ledger" },
  { to: 2, suffix: " langs", label: "English + Hindi notices" },
  { to: 72, suffix: "h", label: "breach-report tracking" },
];

function Stats() {
  return (
    <section className="relative mx-auto max-w-6xl overflow-hidden px-6 py-16">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <Parallax speed={0.18} className="absolute -left-10 top-0">
          <div className="h-40 w-40 rounded-full bg-brand-200/40 blur-3xl" />
        </Parallax>
        <Parallax speed={-0.18} className="absolute -right-10 bottom-0">
          <div className="h-40 w-40 rounded-full bg-violet-200/40 blur-3xl" />
        </Parallax>
      </div>
      <div className="relative grid grid-cols-2 gap-6 lg:grid-cols-4">
        {STAT_ITEMS.map((s, i) => (
          <Reveal key={s.label} delay={i * 80}>
            <Tilt3D
              max={12}
              className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-6 text-center shadow-card"
            >
              <div className="bg-gradient-to-r from-brand-600 to-violet-600 bg-clip-text text-4xl font-bold tracking-tight text-transparent [transform:translateZ(30px)]">
                <Counter to={s.to} suffix={s.suffix} />
              </div>
              <div className="mt-1 text-xs font-medium text-slate-500 [transform:translateZ(16px)]">
                {s.label}
              </div>
            </Tilt3D>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function BentoCard({
  span = "",
  icon,
  iconGradient,
  glow,
  title,
  body,
  children,
}: {
  span?: string;
  icon: string;
  iconGradient: string;
  glow: string;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <Reveal className={span}>
      <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-white/20">
        <div
          className={`pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full opacity-30 blur-3xl transition-opacity duration-500 group-hover:opacity-70 ${glow}`}
        />
        <div className="relative flex h-full flex-col">
          <span
            className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-lg text-white shadow-lg transition duration-300 group-hover:scale-110 ${iconGradient}`}
          >
            {icon}
          </span>
          <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
          {children}
        </div>
      </div>
    </Reveal>
  );
}

function MiniToggle({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5">
      <span className="text-[12px] text-slate-300">{label}</span>
      <span className={`relative h-4 w-7 rounded-full ${on ? "bg-violet-500" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white ${on ? "left-[15px]" : "left-0.5"}`} />
      </span>
    </div>
  );
}

function Features() {
  return (
    <Spotlight
      id="features"
      className="relative isolate overflow-hidden bg-slate-950"
      color="rgba(139,92,246,0.16)"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-20 top-20 h-96 w-96 animate-blob rounded-full bg-brand-600/25 blur-3xl" />
        <div className="absolute right-0 top-40 h-96 w-96 animate-blob rounded-full bg-fuchsia-600/20 blur-3xl [animation-delay:4s]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 animate-blob rounded-full bg-sky-600/20 blur-3xl [animation-delay:8s]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />
      </div>

      <div className="mx-auto max-w-6xl px-6 py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-brand-200">
            The toolkit
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything you need to manage consent
          </h2>
          <p className="mt-3 text-slate-400">
            One widget on your site, one dashboard for your team — the whole
            consent lifecycle, handled.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 md:grid-cols-6">
          {/* Big live card */}
          <BentoCard
            span="md:col-span-4"
            icon="⛔"
            iconGradient="from-rose-500 to-orange-600"
            glow="bg-rose-500"
            title="Block-first trackers"
            body="The widget denies analytics, pixels and ad scripts by default, and only activates them the moment consent is granted — watch it live."
          >
            <TrackerPills />
          </BentoCard>

          <BentoCard
            span="md:col-span-2"
            icon="☑"
            iconGradient="from-violet-500 to-fuchsia-600"
            glow="bg-violet-500"
            title="Purpose-level consent"
            body="Ask for each specific reason — not one all-or-nothing banner."
          >
            <div className="mt-4 space-y-2">
              <MiniToggle label="Marketing" on />
              <MiniToggle label="Analytics" on={false} />
              <MiniToggle label="Order updates" on />
            </div>
          </BentoCard>

          <BentoCard
            span="md:col-span-2"
            icon="≣"
            iconGradient="from-emerald-500 to-teal-600"
            glow="bg-emerald-500"
            title="Tamper-proof records"
            body="Every choice is written to an append-only ledger you can export as evidence."
          >
            <div className="mt-4 space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center gap-2 text-emerald-300"><span>✓</span> granted · analytics · 3f9a</div>
              <div className="flex items-center gap-2 text-amber-300"><span>↺</span> withdrawn · marketing · 7c2b</div>
              <div className="flex items-center gap-2 text-emerald-300"><span>✓</span> granted · essential · a10e</div>
            </div>
          </BentoCard>

          <BentoCard
            span="md:col-span-2"
            icon="↺"
            iconGradient="from-amber-400 to-orange-600"
            glow="bg-amber-500"
            title="Effortless withdrawal"
            body="A persistent “Manage preferences” link lets people change their mind anytime — as easy to say no as yes."
          />

          <BentoCard
            span="md:col-span-2"
            icon="▤"
            iconGradient="from-sky-500 to-cyan-600"
            glow="bg-sky-500"
            title="Auto-generated notice"
            body="Build a complete, itemized DPDP privacy notice from your purposes and settings — in English and Hindi."
          >
            <div className="mt-4 flex gap-2">
              <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-slate-300">English</span>
              <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-slate-300">हिन्दी</span>
            </div>
          </BentoCard>

          {/* Wide retention card */}
          <BentoCard
            span="md:col-span-6"
            icon="🗑"
            iconGradient="from-fuchsia-500 to-pink-600"
            glow="bg-fuchsia-500"
            title="Retention & auto-erasure"
            body="Set retention periods and let a daily sweep erase people whose consent lapsed — privacy by design, and one less thing to remember."
          >
            <div className="mt-5 flex flex-wrap items-center gap-3 text-[12px] font-medium">
              <span className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-emerald-300">Consent given</span>
              <span className="h-px flex-1 min-w-8 bg-gradient-to-r from-emerald-400/50 to-fuchsia-400/50" />
              <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-slate-300">Retained 90 days</span>
              <span className="h-px flex-1 min-w-8 bg-gradient-to-r from-fuchsia-400/50 to-rose-400/50" />
              <span className="rounded-full bg-fuchsia-400/10 px-3 py-1.5 text-fuchsia-300">Auto-erased ✓</span>
            </div>
          </BentoCard>
        </div>
      </div>
    </Spotlight>
  );
}

const STEPS = [
  { n: "1", title: "Define your purposes", body: "List the specific reasons you collect data — order delivery, marketing, analytics." },
  { n: "2", title: "Paste one script tag", body: "Drop a single line into your site. The consent banner appears instantly, trackers block by default." },
  { n: "3", title: "Track & prove consent", body: "Watch consent come in on a live dashboard, handle data-rights requests, and export records anytime." },
];

function HowItWorks() {
  return (
    <section className="relative mx-auto max-w-6xl overflow-hidden px-6 py-24">
      {/* scroll-driven floating shapes */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <Parallax speed={0.35} className="absolute left-6 top-10">
          <div className="h-20 w-20 rotate-12 rounded-2xl bg-gradient-to-br from-brand-400/70 to-violet-500/70 shadow-pop animate-float" />
        </Parallax>
        <Parallax speed={-0.25} className="absolute right-10 top-6">
          <div className="h-24 w-24 rounded-full border-[6px] border-sky-300/60 animate-float-slow" />
        </Parallax>
        <Parallax speed={0.2} className="absolute bottom-8 left-1/4">
          <div className="h-14 w-14 rotate-45 rounded-lg bg-gradient-to-br from-amber-300/70 to-orange-400/70 animate-float" />
        </Parallax>
        <Parallax speed={-0.3} className="absolute bottom-16 right-1/4">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-300/80 to-teal-400/80 blur-[1px] animate-float-slow" />
        </Parallax>
      </div>
      <Reveal className="relative mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Live in three steps
        </h2>
      </Reveal>
      <div className="relative mt-14 grid gap-8 md:grid-cols-3">
        <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent md:block" />
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 120} className="relative text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-violet-600 text-lg font-bold text-white shadow-lg shadow-brand-600/25 ring-8 ring-white">
              {s.n}
            </div>
            <h3 className="mt-5 text-base font-semibold text-slate-900">{s.title}</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-600">
              {s.body}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const DUTIES = [
  { s: "§5", t: "Itemized notice" },
  { s: "§6", t: "Purpose-level consent" },
  { s: "§8(6)", t: "Breach notifications" },
  { s: "§8(7)", t: "Retention & erasure" },
  { s: "§8(9)", t: "Grievance officer" },
  { s: "§9", t: "Children's data" },
  { s: "§11", t: "Access & data-sharing" },
  { s: "§12–14", t: "Correction · Erasure · Nomination" },
];

function Compliance() {
  return (
    <Spotlight
      className="relative isolate overflow-hidden bg-slate-950"
      color="rgba(139,92,246,0.18)"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-20 top-10 h-80 w-80 animate-blob rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -right-10 bottom-0 h-80 w-80 animate-blob rounded-full bg-violet-600/30 blur-3xl [animation-delay:4s]" />
      </div>
      <div id="compliance" className="mx-auto max-w-6xl px-6 py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-brand-200">
            Compliance-friendly by design
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Maps to every Data Fiduciary duty in the DPDP Act
          </h2>
          <p className="mt-3 text-slate-400">
            The website-facing obligations — notice, consent, rights, retention,
            breach records and disclosures — handled in one place.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DUTIES.map((d, i) => (
            <Reveal
              key={d.s}
              delay={(i % 4) * 70}
              className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur transition hover:border-brand-400/40 hover:bg-white/[0.07]"
            >
              <div className="bg-gradient-to-r from-brand-300 to-violet-300 bg-clip-text text-lg font-bold text-transparent">
                {d.s}
              </div>
              <div className="mt-1 text-sm font-medium text-slate-200">{d.t}</div>
            </Reveal>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-slate-500">
          Covers the consent, notice, rights and record-keeping duties this tool
          can help with. Full compliance also needs your own security, vendor
          contracts and legal review — this is not legal advice.
        </p>
      </div>
    </Spotlight>
  );
}

const PLANS = [
  { name: "Free", price: "₹0", tagline: "For getting started", features: ["1 website", "Unlimited consent purposes", "Consent records + CSV export", "5,000 visitors / month"], highlighted: false },
  { name: "Starter", price: "₹999", period: "/mo", tagline: "For growing businesses", features: ["Everything in Free", "Data-rights request portal", "Hindi + English notices", "50,000 visitors / month"], highlighted: true },
  { name: "Growth", price: "₹2,999", period: "/mo", tagline: "For established teams", features: ["Everything in Starter", "Team members & roles", "Priority support", "500,000 visitors / month"], highlighted: false },
];

function Pricing() {
  return (
    <section id="pricing" className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Simple, traffic-based pricing
          </h2>
          <p className="mt-3 text-slate-600">
            Start free. Pay only as your traffic grows — billed per domain.
          </p>
        </Reveal>
        <div className="mt-12 grid items-stretch gap-6 md:grid-cols-3">
          {PLANS.map((p, i) => (
            <Reveal
              key={p.name}
              delay={i * 90}
              className={`relative flex flex-col rounded-3xl p-7 ${
                p.highlighted
                  ? "bg-gradient-to-b from-brand-600 to-violet-700 text-white shadow-pop"
                  : "border border-slate-200 bg-white shadow-card"
              }`}
            >
              {p.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-brand-700 shadow">
                  ★ Most popular
                </span>
              )}
              <h3 className={`text-lg font-semibold ${p.highlighted ? "text-white" : "text-slate-900"}`}>
                {p.name}
              </h3>
              <p className={`text-xs ${p.highlighted ? "text-white/70" : "text-slate-500"}`}>
                {p.tagline}
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className={`text-4xl font-bold ${p.highlighted ? "text-white" : "text-slate-900"}`}>
                  {p.price}
                </span>
                {p.period && (
                  <span className={`text-sm ${p.highlighted ? "text-white/70" : "text-slate-500"}`}>
                    {p.period}
                  </span>
                )}
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className={`flex items-start gap-2 text-sm ${p.highlighted ? "text-white/90" : "text-slate-600"}`}>
                    <span className={p.highlighted ? "text-white" : "text-brand-600"}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-7 block rounded-xl px-4 py-3 text-center text-sm font-semibold transition ${
                  p.highlighted
                    ? "bg-white text-brand-700 hover:bg-slate-100"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Get started
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <Spotlight
        className="relative isolate overflow-hidden rounded-[2rem] bg-slate-950 px-8 py-16 text-center"
        color="rgba(99,102,241,0.25)"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-0 h-64 w-64 animate-blob rounded-full bg-brand-500/30 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-64 w-64 animate-blob rounded-full bg-violet-500/30 blur-3xl [animation-delay:3s]" />
        </div>
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Start collecting consent the compliant way
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            Create your free account and add the consent widget to your website in
            the next ten minutes.
          </p>
          <Link
            href="/signup"
            className="group relative mt-8 inline-flex overflow-hidden rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:-translate-y-0.5"
          >
            <span className="relative z-10">Create your free account →</span>
            <span className="absolute inset-0 -translate-x-full bg-brand-600/10 transition-transform duration-700 group-hover:translate-x-full" />
          </Link>
        </Reveal>
      </Spotlight>
    </section>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8">
        <Logo />
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
          <a href="#features" className="hover:text-slate-800">Features</a>
          <a href="#pricing" className="hover:text-slate-800">Pricing</a>
          <Link href="/login" className="hover:text-slate-800">Sign in</Link>
          <Link href="/signup" className="hover:text-slate-800">Get started</Link>
        </nav>
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} Cookie Access
        </p>
      </div>
    </footer>
  );
}
