# Deployment checklist

The app runs on **Vercel** (Next.js) and the consent widget is hosted on **Cloudflare R2**.
The database is **Neon Postgres** (shared between local + production).

---

## 1. Database — already in sync ✅

All schema changes (banner theme, domain verification, consent `eventId`, DPR
`subjectRef`, billing fields) are already pushed to Neon via `prisma db push`,
and the append-only trigger (with the guarded domain-purge path) is applied.
**Nothing to run at deploy time** — Vercel only runs `prisma generate` (via
`postinstall`), not migrations.

> Note: `prisma/migrations/0_init` is a stale baseline (we use `db push`, not
> `migrate`). It is not used by the Vercel build, so it's harmless. Only matters
> if you ever set up a brand-new database from scratch.

## 2. Widget — already live on R2 ✅

`npm run deploy:widget` (run locally) builds the widget and uploads it to R2.
The current build includes: block-first tracker gating, banner theming,
the "Your data rights" link, and the anonymous-consent linkage. Re-run this
command whenever you change anything under `widget/`.

## 3. Vercel environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production),
then redeploy. Copy the actual values from your local `.env`.

### Already set (do not change — encryption keys must match or data becomes unreadable)
- `DATABASE_URL`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `BLIND_INDEX_KEY`

### Add / verify these
| Variable | Purpose | Value source |
|---|---|---|
| `NEXT_PUBLIC_WIDGET_URL` | Install-snippet widget URL | your R2 public URL (`…/widget.js`) |
| `WIDGET_API_BASE` | Baked into widget build | `https://cookie-access.vercel.app` |
| `APP_URL` | Links in emails | `https://cookie-access.vercel.app` |
| `COOKIE_SECURE` | Secure cookies over HTTPS | `true` |
| `COOKIE_SAMESITE` | Cookie policy | `lax` |
| `CRON_SECRET` | Protects the SLA cron endpoint | any long random string |
| `RAZORPAY_KEY_ID` | Billing | from `.env` |
| `RAZORPAY_KEY_SECRET` | Billing | from `.env` |
| `RAZORPAY_PLAN_STARTER` | Starter plan id | from `.env` |
| `RAZORPAY_PLAN_GROWTH` | Growth plan id | from `.env` |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature check | from `.env` (must match Razorpay dashboard) |

### Optional
| Variable | Purpose |
|---|---|
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` | Outgoing email (DPR notifications). Without these, emails silently no-op. |
| `DPR_SLA_DAYS` (default 30), `SESSION_TTL_HOURS` (default 12) | Tuning |

> **Not needed on Vercel:** the `R2_*` keys — they're only used by the local
> `deploy:widget` script, not by the running app.

## 4. Redeploy Vercel

Push to the connected git repo, or run `vercel --prod`. This ships all the
server changes: banner design, billing (subscribe / switch / cancel / embedded
checkout), domain delete, PDF reports, the data-access package, and the
anonymous-consent linkage.

## 5. Your website (e.g. desirediv.com)

Update the widget snippet to load from R2, as the **first script in `<head>`**
(not `async`), so trackers are blocked before they run:

```html
<script src="https://pub-d9c6ef17cb234b90b1124a0c0b9f3e9e.r2.dev/widget.js"
        data-tenant-key="YOUR_DOMAIN_WIDGET_KEY"></script>
```

## 6. Razorpay (billing)

- Webhook is created (URL → `/api/webhooks/razorpay`, secret matches `.env`).
- Recurring payments require Razorpay account activation/approval before real
  card subscriptions succeed. Test mode: use the "Start subscription" button or
  a recurring test card.

---

## Post-deploy smoke test
1. Log in at `/login`.
2. Open a domain → check **Overview**, **Banner design**, **Consent records** load.
3. Visit a site with the widget → accept the banner → confirm a record appears.
4. Open the widget's **Manage preferences → Your data rights**, submit an access
   request, then download the **data package** from the dashboard.
5. **Billing** → upgrade (test card) → confirm plan flips after the webhook.
