# Deployment checklist

The app runs on **Vercel** (Next.js) and the consent widget is hosted on **Cloudflare R2**.
The database is **Neon Postgres**. Production must have its own database — use a
separate Neon branch for local development (the demo seed has public passwords).

After deploying, open **/super → Platform setup**: it reads the live server
environment and flags anything below that's still missing.

---

## 0. Order matters when the schema changes

The code expects the database to already have any new columns/tables, so:

1. **Push the schema to production first:**
   ```bash
   DATABASE_URL="<production url>" npx prisma db push
   ```
   Additive changes only (new columns with defaults, new tables) — review the
   summary Prisma prints before confirming.
2. **Then redeploy Vercel** (section 4).
3. **Then rebuild the widget** if anything under `widget/` changed (section 2).

Deploying code before step 1 breaks the dashboard and API with
"column does not exist" errors.

## 1. Database

Production is managed with `prisma db push`, and the append-only trigger
(with the guarded domain-purge path) is applied via `npm run guards:apply`.
Vercel only runs `prisma generate` (via `postinstall`), never migrations.

`prisma/migrations/0_init` is a full baseline generated from `schema.prisma`.
It's what `npm run db:setup` uses to build a **fresh** database (a new dev
branch, or rebuilding after data loss). Regenerate it after schema changes:

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0_init/migration.sql
```

Don't run `prisma migrate deploy` against the existing production database —
it was built with `db push`, so the migration would try to recreate tables. To
switch production to migrations later, mark the baseline as applied once:
`npx prisma migrate resolve --applied 0_init`.

## 2. Widget — serve it from your own domain

The widget URL gets pasted into every client's website, so it must be one you
control for good. `r2.dev` URLs are rate-limited by Cloudflare and not meant
for production traffic.

1. Cloudflare → R2 → bucket `cookie-access` → **Settings → Custom Domains** →
   connect e.g. `cdn.yourdomain.com`.
2. Set `R2_PUBLIC_URL=https://cdn.yourdomain.com` locally, and
   `NEXT_PUBLIC_WIDGET_URL=https://cdn.yourdomain.com/widget.js` locally **and**
   on Vercel.
3. `npm run deploy:widget` (run locally) builds the widget with
   `WIDGET_API_BASE` baked in and uploads it. Re-run it whenever anything under
   `widget/` changes.
4. Redeploy Vercel so the Install page shows the new snippet.

The same file is served at both the `r2.dev` and custom-domain URLs, so sites
already using the old snippet keep working. Move them over, then turn off
`r2.dev` public access.

## 3. Vercel environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production),
then redeploy.

### Never change after launch (encryption keys must match or data becomes unreadable)
- `DATABASE_URL`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `BLIND_INDEX_KEY`

### Required
| Variable | Purpose | Value |
|---|---|---|
| `APP_URL` | Links in emails | your public `https://` app URL |
| `WIDGET_API_BASE` | Baked into the widget build | same as `APP_URL` |
| `NEXT_PUBLIC_WIDGET_URL` | Install-snippet widget URL | `https://cdn.yourdomain.com/widget.js` |
| `COOKIE_SECURE` | Secure cookies over HTTPS | `true` |
| `COOKIE_SAMESITE` | Cookie policy | `lax` |
| `CRON_SECRET` | Authorises the daily cron jobs | long random string (`openssl rand -hex 32`) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` | Outgoing email | from your email provider |

Without `CRON_SECRET` the SLA-reminder and retention jobs refuse to run. Without
SMTP, no email is sent at all: clients aren't told about data-rights requests,
and guardians never receive the parental-consent link.

### Billing
| Variable | Purpose |
|---|---|
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | API keys (`rzp_live_…` for real payments) |
| `RAZORPAY_PLAN_STARTER` / `RAZORPAY_PLAN_GROWTH` | Plan ids (live and test plans have different ids) |
| `RAZORPAY_WEBHOOK_SECRET` | Must match the webhook in the Razorpay dashboard |

### Optional
| Variable | Purpose |
|---|---|
| `DPR_SLA_DAYS` (default 30), `SESSION_TTL_HOURS` (default 12) | Tuning |

> **Not needed on Vercel:** the `R2_*` keys — they're only used by the local
> `deploy:widget` script, not by the running app.

## 4. Redeploy Vercel

Push to the connected git repo, or run `vercel --prod` — after section 0 step 1
whenever the schema changed.

## 5. Onboarding a client website

1. The client **publishes a privacy notice** (Dashboard → Privacy notice →
   "Generate from my settings", review, publish). Until then the widget shows
   no banner and keeps every tracker blocked.
2. They add the snippet as the **first script in `<head>`** (not `async`), so
   trackers are held before they run:
   ```html
   <script src="https://cdn.yourdomain.com/widget.js"
           data-tenant-key="YOUR_DOMAIN_WIDGET_KEY"></script>
   ```
3. Known trackers (GA, GTM, Meta Pixel, Hotjar, Clarity, …) are held
   automatically — in the HTML or injected by other scripts. Anything else,
   plus iframes (YouTube, maps) and tracking images, must be wrapped as
   `<script type="text/plain" data-dpdp="analytics">` or gated with
   `window.DPDPConsent.getConsent(...)`. Check each client site once by loading
   it in a private window and confirming nothing tracks before consent.

## 6. Razorpay (billing)

- Webhook URL → `/api/webhooks/razorpay`, secret matching
  `RAZORPAY_WEBHOOK_SECRET`. Subscribe it to: `subscription.activated`,
  `.charged`, `.pending`, `.halted`, `.cancelled`, `.completed`, `.paused`,
  `.resumed`.
- **Going live** needs Razorpay account activation, which requires Terms,
  Privacy Policy, Refund/Cancellation and Contact pages on your public site.
  Then switch to live keys, live plan ids and a live webhook.
- Subscriptions run for 12 billing cycles (`total_count` in
  `src/server/lib/billing.ts`); when they complete, the domain returns to Free.

---

## Post-deploy smoke test
1. **/super → Platform setup** shows everything green.
2. Log in at `/login`, open a domain → **Overview**, **Banner design**, **Consent records** load.
3. Publish a privacy notice, then visit a site with the widget → accept → confirm a record appears.
4. Open the widget's **Manage preferences → Your data rights**, submit an access
   request, check the notification email arrives, then download the **data package**.
5. **Billing** → upgrade (test card) → confirm the plan flips after the webhook.
