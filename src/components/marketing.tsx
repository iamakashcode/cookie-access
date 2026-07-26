"use client";

import { useEffect, useRef, useState } from "react";

/** Thin gradient bar at the top that tracks scroll progress. */
export function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? h.scrollTop / max : 0);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);
  return (
    <div className="fixed left-0 top-0 z-[60] h-[3px] w-full bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-brand-500 via-violet-500 to-sky-500"
        style={{ width: `${p * 100}%` }}
      />
    </div>
  );
}

/**
 * Interactive 3D tilt — the element rotates in perspective toward the cursor,
 * so cards feel like physical objects. Children with `translateZ` pop forward.
 */
export function Tilt3D({
  children,
  className = "",
  max = 9,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1000px) rotateX(${-py * max}deg) rotateY(${px * max}deg)`;
  }
  function reset() {
    const el = ref.current;
    if (el) el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
  }
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={`transition-transform duration-200 ease-out [transform-style:preserve-3d] will-change-transform ${className}`}
    >
      {children}
    </div>
  );
}

/** Translates its children as the page scrolls, for depth/parallax. */
export function Parallax({
  children,
  speed = 0.15,
  className = "",
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      const center = r.top + r.height / 2 - window.innerHeight / 2;
      el.style.transform = `translate3d(0, ${center * -speed}px, 0)`;
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [speed]);
  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}

/** A button/link wrapper that drifts slightly toward the cursor. */
export function Magnetic({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${x * 0.25}px, ${y * 0.4}px)`;
  }
  function reset() {
    const el = ref.current;
    if (el) el.style.transform = "translate(0,0)";
  }
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={`inline-block transition-transform duration-300 ease-out ${className}`}
    >
      {children}
    </div>
  );
}

/** A section that renders a soft glow following the cursor. */
export function Spotlight({
  children,
  className = "",
  color = "rgba(99,102,241,0.14)",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }
  return (
    <div ref={ref} id={id} onMouseMove={onMove} className={`relative ${className}`}>
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity"
        style={{
          background: `radial-gradient(600px circle at var(--mx, 50%) var(--my, 20%), ${color}, transparent 45%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** Fades + slides its children in the first time they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: React.ElementType;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Show immediately when animation isn't wanted or supported — content is
    // never left invisible.
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        shown ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

/** Counts up to a number when it scrolls into view. */
export function Counter({
  to,
  suffix = "",
  prefix = "",
  duration = 1600,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(Math.round(to * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);
  return (
    <span ref={ref}>
      {prefix}
      {val.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

/**
 * A live visual for the "block-first" feature card: named trackers cycle
 * between blocked and active as a mock consent toggle flips, on a timer.
 */
export function TrackerPills() {
  const NAMES = ["Google Analytics", "Meta Pixel", "Hotjar", "TikTok", "LinkedIn"];
  const [granted, setGranted] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setGranted((g) => !g), 2600);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[11px] font-medium text-slate-400">Analytics consent</span>
        <span
          className={`relative h-5 w-9 rounded-full transition-colors duration-500 ${granted ? "bg-emerald-500" : "bg-white/15"}`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-500 ${granted ? "left-[18px]" : "left-0.5"}`}
          />
        </span>
        <span
          className={`text-[11px] font-semibold transition-colors duration-500 ${granted ? "text-emerald-400" : "text-slate-500"}`}
        >
          {granted ? "granted" : "not granted"}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {NAMES.map((n, i) => (
          <span
            key={n}
            style={{ transitionDelay: `${i * 60}ms` }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-500 ${
              granted
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-white/10 bg-white/[0.04] text-slate-400"
            }`}
          >
            <span className={granted ? "text-emerald-400" : "text-rose-400"}>
              {granted ? "▶" : "■"}
            </span>
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

/** An infinite horizontal marquee of items. */
export function Marquee({ items }: { items: string[] }) {
  return (
    <div className="group relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
      <div className="flex w-max animate-marquee gap-4 group-hover:[animation-play-state:paused]">
        {[...items, ...items].map((it, i) => (
          <span
            key={i}
            className="flex items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm backdrop-blur"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-brand-500 to-violet-500" />
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * A working miniature of the consent widget the product ships — visitors toggle
 * purposes and watch trackers get blocked or activated live. The "wow" demo.
 */
export function LiveConsentDemo() {
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [saved, setSaved] = useState(false);

  const active = (analytics ? 1 : 0) + (marketing ? 1 : 0);
  const blocked = 2 - active;

  return (
    <div className="relative w-full max-w-md">
      {/* floating glow */}
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-400/30 via-violet-400/20 to-sky-400/20 blur-2xl" />
      <div className="animate-float-slow rounded-2xl border border-white/70 bg-white/90 p-5 shadow-pop backdrop-blur">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 text-xs text-white">
            🍪
          </span>
          <div className="text-sm font-semibold text-slate-900">
            We value your privacy
          </div>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-slate-500">
          We ask permission for each purpose before using your data. Try it —
          toggle a purpose and watch trackers respond.
        </p>

        <DemoRow label="Essential" desc="Required to run the site" locked checked />
        <DemoRow
          label="Analytics"
          desc="Understand site usage"
          checked={analytics}
          onToggle={() => {
            setAnalytics((v) => !v);
            setSaved(false);
          }}
        />
        <DemoRow
          label="Marketing"
          desc="Personalised offers"
          checked={marketing}
          onToggle={() => {
            setMarketing((v) => !v);
            setSaved(false);
          }}
        />

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => {
              setAnalytics(true);
              setMarketing(true);
              setSaved(true);
            }}
            className="flex-1 rounded-lg bg-gradient-to-r from-brand-600 to-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Accept all
          </button>
          <button
            onClick={() => setSaved(true)}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Save choices
          </button>
        </div>

        {/* live tracker status */}
        <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-medium">
          <span className="flex items-center gap-1.5 text-emerald-600">
            <Dot className="bg-emerald-500" /> {blocked} tracker
            {blocked === 1 ? "" : "s"} blocked
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <Dot className={active ? "bg-brand-500" : "bg-slate-300"} /> {active}{" "}
            active
          </span>
          {saved && (
            <span className="font-semibold text-emerald-600">✓ Saved</span>
          )}
        </div>
      </div>
    </div>
  );
}

function DemoRow({
  label,
  desc,
  checked,
  onToggle,
  locked,
}: {
  label: string;
  desc: string;
  checked?: boolean;
  onToggle?: () => void;
  locked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 py-2.5">
      <div>
        <div className="text-[13px] font-semibold text-slate-800">{label}</div>
        <div className="text-[11px] text-slate-400">{desc}</div>
      </div>
      <button
        disabled={locked}
        onClick={onToggle}
        aria-label={label}
        className={`relative h-5 w-9 flex-none rounded-full transition ${
          checked ? "bg-brand-600" : "bg-slate-300"
        } ${locked ? "opacity-60" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function Dot({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${className}`} />;
}
