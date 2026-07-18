import { z } from "zod";

/**
 * Server-side env for the merged Next.js app. Next auto-loads .env, so route
 * handlers get these from process.env. Validated once at import; throws (not
 * process.exit) so it plays nicely with the Next runtime.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars"),
  ENCRYPTION_KEY: z.string().min(1, "ENCRYPTION_KEY is required (base64 32 bytes)"),
  BLIND_INDEX_KEY: z.string().min(1, "BLIND_INDEX_KEY is required (base64)"),
  SESSION_TTL_HOURS: z.coerce.number().default(12),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),

  APP_URL: z.string().default("http://localhost:3000"),
  DPR_SLA_DAYS: z.coerce.number().default(30),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("Consent Manager <no-reply@consent.local>"),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // Shared secret protecting the cron endpoint (SLA reminder sweep).
  CRON_SECRET: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid server environment configuration:\n${issues}`);
}

export const env = parsed.data;
