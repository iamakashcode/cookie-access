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
