export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[1.6rem] font-bold leading-tight tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex flex-none items-center gap-2">{action}</div>}
    </div>
  );
}

export type Tone =
  | "indigo"
  | "emerald"
  | "sky"
  | "violet"
  | "teal"
  | "amber"
  | "rose"
  | "fuchsia"
  | "green";

/** Full class strings per tone (Tailwind purge-safe). */
const TONE: Record<Tone, { wash: string; ring: string; chip: string; glow: string }> = {
  indigo: { wash: "from-indigo-50", ring: "ring-indigo-100", chip: "from-indigo-500 to-violet-600", glow: "bg-indigo-400/20" },
  emerald: { wash: "from-emerald-50", ring: "ring-emerald-100", chip: "from-emerald-500 to-teal-600", glow: "bg-emerald-400/20" },
  sky: { wash: "from-sky-50", ring: "ring-sky-100", chip: "from-sky-500 to-cyan-600", glow: "bg-sky-400/20" },
  violet: { wash: "from-violet-50", ring: "ring-violet-100", chip: "from-violet-500 to-purple-600", glow: "bg-violet-400/20" },
  teal: { wash: "from-teal-50", ring: "ring-teal-100", chip: "from-teal-500 to-emerald-600", glow: "bg-teal-400/20" },
  amber: { wash: "from-amber-50", ring: "ring-amber-100", chip: "from-amber-500 to-orange-600", glow: "bg-amber-400/20" },
  rose: { wash: "from-rose-50", ring: "ring-rose-100", chip: "from-rose-500 to-red-600", glow: "bg-rose-400/20" },
  fuchsia: { wash: "from-fuchsia-50", ring: "ring-fuchsia-100", chip: "from-fuchsia-500 to-pink-600", glow: "bg-fuchsia-400/20" },
  green: { wash: "from-green-50", ring: "ring-green-100", chip: "from-green-500 to-emerald-600", glow: "bg-green-400/20" },
};

/**
 * Page header band. Each page carries the accent of its sidebar section, so the
 * dashboard reads as one coloured system instead of pages of plain text.
 */
export function PageHero({
  title,
  subtitle,
  icon,
  tone = "indigo",
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const t = TONE[tone];
  return (
    <div
      className={`relative mb-6 overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br via-white to-white p-6 shadow-card ring-1 ${t.wash} ${t.ring}`}
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full blur-3xl ${t.glow}`}
      />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          {icon && (
            <span
              className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gradient-to-br text-base text-white shadow-sm ${t.chip}`}
            >
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight tracking-tight text-slate-900">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div className="flex flex-none items-center gap-2">{action}</div>}
      </div>
      {children && <div className="relative mt-4">{children}</div>}
    </div>
  );
}

/** Card section heading with a gradient icon chip. */
export function SectionHeader({
  title,
  icon,
  tone = "indigo",
  right,
}: {
  title: string;
  icon?: React.ReactNode;
  tone?: Tone;
  right?: React.ReactNode;
}) {
  const t = TONE[tone];
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        {icon && (
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-xs text-white shadow-sm ${t.chip}`}
          >
            {icon}
          </span>
        )}
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      {right}
    </div>
  );
}

/** Consistent empty state — a dashed well instead of bare grey text. */
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center">
      {icon && <div className="mb-2 text-2xl opacity-40">{icon}</div>}
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

/** Section title used inside cards. */
export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-slate-800">{children}</h2>
  );
}

export type MetricTone = "sky" | "orange" | "violet" | "emerald" | "rose";

/**
 * Metric card. Each tone owns a tinted surface, a gradient icon chip and a
 * soft colour glow, so a row of these reads as a colourful set rather than
 * four identical white boxes. Full class strings (Tailwind purge-safe).
 */
export function MetricCard({
  label,
  value,
  hint,
  delta,
  icon,
  tone = "sky",
  footer,
}: {
  label: string;
  value: number | string;
  hint?: string;
  delta?: { value: string; good?: boolean };
  icon?: React.ReactNode;
  tone?: MetricTone;
  footer?: React.ReactNode;
}) {
  const tones: Record<MetricTone, { card: string; chip: string; glow: string; ring: string }> = {
    sky: {
      card: "bg-gradient-to-br from-sky-50 via-white to-white",
      chip: "bg-gradient-to-br from-sky-400 to-sky-600",
      glow: "bg-sky-400/20",
      ring: "ring-sky-100",
    },
    orange: {
      card: "bg-gradient-to-br from-orange-50 via-white to-white",
      chip: "bg-gradient-to-br from-orange-400 to-orange-600",
      glow: "bg-orange-400/20",
      ring: "ring-orange-100",
    },
    violet: {
      card: "bg-gradient-to-br from-violet-50 via-white to-white",
      chip: "bg-gradient-to-br from-violet-400 to-violet-600",
      glow: "bg-violet-400/20",
      ring: "ring-violet-100",
    },
    emerald: {
      card: "bg-gradient-to-br from-emerald-50 via-white to-white",
      chip: "bg-gradient-to-br from-emerald-400 to-emerald-600",
      glow: "bg-emerald-400/20",
      ring: "ring-emerald-100",
    },
    rose: {
      card: "bg-gradient-to-br from-rose-50 via-white to-white",
      chip: "bg-gradient-to-br from-rose-400 to-rose-600",
      glow: "bg-rose-400/20",
      ring: "ring-rose-100",
    },
  };
  const t = tones[tone];

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/60 p-5 shadow-card ring-1 transition duration-200 hover:-translate-y-1 hover:shadow-card-hover ${t.card} ${t.ring}`}
    >
      {/* colour glow */}
      <div
        className={`pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full blur-2xl ${t.glow}`}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </div>
          {icon && (
            <span
              className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl text-sm text-white shadow-sm ${t.chip}`}
            >
              {icon}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-[2rem] font-bold leading-none tracking-tight text-slate-900">
            {value}
          </span>
          {delta && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                delta.good === false
                  ? "bg-orange-100 text-orange-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {delta.value}
            </span>
          )}
        </div>

        {hint && <div className="mt-1.5 text-xs text-slate-500">{hint}</div>}
        {footer && <div className="mt-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
}) {
  const variants = {
    primary:
      "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800",
    secondary:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100",
    danger:
      "border border-red-200 bg-white text-red-600 hover:bg-red-50 active:bg-red-100",
  }[variant];
  const sizes = {
    sm: "px-3 py-1.5 text-[13px]",
    md: "px-4 py-2 text-sm",
  }[size];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants} ${sizes} ${props.className || ""}`}
    >
      {children}
    </button>
  );
}

export type BadgeColor =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple";

export function Badge({
  children,
  color = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  color?: BadgeColor;
  className?: string;
}) {
  const colors: Record<BadgeColor, string> = {
    neutral: "bg-slate-100 text-slate-600",
    brand: "bg-brand-50 text-brand-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    info: "bg-sky-50 text-sky-700",
    purple: "bg-violet-50 text-violet-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${colors[color]} ${className}`}
    >
      {children}
    </span>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
      <span aria-hidden className="mt-px flex-none font-semibold">
        !
      </span>
      <span>{message}</span>
    </div>
  );
}
