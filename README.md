# DPDP Consent Manager

A multi-tenant SaaS that helps Indian businesses **operationalize consent
management and record-keeping** under the Digital Personal Data Protection
(DPDP) Act, 2023 and the DPDP Rules, 2025.

> ⚠️ **Not legal advice.** This tool helps you operationalize consent and
> record-keeping. It does not guarantee legal compliance and is not a substitute
> for a lawyer. Consult qualified legal counsel about your obligations.

An **account** can manage **many domains (websites)**; each domain has its own
widget key, consent purposes, privacy notice, consent ledger, rights-request
queue, breach log, and plan. Visitors get a clear, purpose-level consent notice
via a one-line `<script>`, can withdraw as easily as they consented, and every
choice is written to a permanent, append-only ledger.

## One app

This is a **single Next.js application** — marketing site, tenant dashboard, and
the whole API (Next.js route handlers) live together. The only separate artifact
is the embeddable widget, a tiny static file hosted on a CDN.

```
.
├── src/
│   ├── app/                 pages (/, /login, /signup, /dashboard, /domains, …)
│   │   └── api/             the API — route handlers (public, admin, super, webhooks, cron)
│   └── server/              backend code (Prisma client, auth, crypto, mailer, billing, …)
├── prisma/                  schema, migrations, seed
├── widget/                  embeddable widget source (esbuild → public/widget.js → R2)
├── public/                  static assets incl. the built widget.js + widget-demo.html
├── scripts/deploy-widget.mjs  builds + uploads the widget to Cloudflare R2
├── ecosystem.config.js      PM2 config (production)
└── deploy/nginx.example.conf reverse-proxy config
```

Because the dashboard and API share one origin, there's **no cross-origin/CORS
complexity** for admin auth. The public widget API is the only cross-origin
surface, and it sends permissive CORS headers.

## Features

**Core** — self-serve signup; account with **multiple domains**; per-domain
consent purposes (CRUD), versioned privacy notices, the embeddable widget
(Shadow DOM, ~6 KB), an append-only consent ledger with CSV export, and a stats
dashboard.

**Rights & notifications** — public data-rights portal (access/correction/
erasure/grievance/nomination), an admin queue with SLA due dates, bilingual
notices (English + हिन्दी), and email notifications + an SLA-reminder cron.

**Children, breaches, billing, platform** — parental-consent flow (guardian
email verification), breach register, per-domain Razorpay billing (gated behind
keys), and a super-admin panel to manage every domain across accounts.

## Prerequisites

- Node.js ≥ 20 (22 recommended — see `.nvmrc`)
- A PostgreSQL database (this project points at **Neon**; any Postgres works)

## Local setup

```bash
npm install                      # installs deps + generates the Prisma client
cp .env.example .env             # then fill in DATABASE_URL + generate secrets

# generate secrets for .env:
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 32   # ENCRYPTION_KEY  (decodes to 32 bytes)
openssl rand -base64 32   # BLIND_INDEX_KEY

npm run db:setup                 # migrate + append-only triggers + seed demo data
npm run dev                      # http://localhost:3000
```

`db:setup` seeds a demo **account with two domains**. Credentials:

- **Dashboard:** `owner@demo-store.test` / `demo-password-123`
- **Super-admin:** `super@demo.test` / `super-password-123` (at `/super/login`)
- **Widget keys:** Demo Store `dpdp_pk_demo_0123456789abcdef`, Demo Blog `dpdp_pk_demo_blog_000000000000`

### Try it
- **http://localhost:3000** — landing → sign in, or register a new account at `/signup`
- Switch domains with the **sidebar dropdown**; manage them at `/domains`
- **http://localhost:3000/widget-demo.html** — a test "customer site" with the widget
- **http://localhost:3000/rights?k=dpdp_pk_demo_0123456789abcdef** — public rights portal

The widget after editing its source: `npm run build:widget` (or `watch:widget`).

## The widget on Cloudflare R2

The widget is a static file that belongs on a CDN so customer-site traffic never
hits your server. To deploy it:

1. Fill the `R2_*` values + `WIDGET_API_BASE` (your public app URL) in `.env`.
   Create keys in R2 → *Manage R2 API Tokens* (Object Read & Write, bucket `cookie-access`).
2. `npm run deploy:widget` — builds `widget.js` with your API URL baked in and
   uploads it to R2.
3. Set `NEXT_PUBLIC_WIDGET_URL` to your R2 public URL so the Install-page snippet
   points customers at it, and `npm run build`.

## Production deploy (single VPS + PM2 + Nginx + R2)

```bash
# on the server
git clone <repo> && cd <repo>
npm ci
cp .env.example .env             # fill real values; set COOKIE_SECURE=true, APP_URL=https://...
npm run prisma:deploy            # apply migrations + append-only triggers
npm run prisma:seed              # first time only (creates the super-admin etc.)
npm run build                    # builds the widget + Next app

pm2 start ecosystem.config.js && pm2 save     # runs `next start` on :3000
```

- **Nginx:** copy `deploy/nginx.example.conf`, set your domain, then
  `sudo certbot --nginx -d app.yourdomain.com` for HTTPS. Reload Nginx.
- **Widget:** `WIDGET_API_BASE=https://app.yourdomain.com npm run deploy:widget`,
  then set `NEXT_PUBLIC_WIDGET_URL` to the R2 URL and rebuild/restart.
- **SLA reminders:** add a daily system cron:
  ```
  0 8 * * *  curl -s -X POST -H "x-cron-secret: $CRON_SECRET" https://app.yourdomain.com/api/cron/sla
  ```
- **Razorpay webhook** (if using billing): point it at
  `https://app.yourdomain.com/api/webhooks/razorpay` and set `RAZORPAY_WEBHOOK_SECRET`.

## Environment variables

See `.env.example` — everything is documented there. Key ones:
`DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `BLIND_INDEX_KEY`, `APP_URL`,
`COOKIE_SECURE`/`COOKIE_SAMESITE`, `WIDGET_API_BASE`, `NEXT_PUBLIC_WIDGET_URL`,
the `R2_*` deploy keys, and optional `SMTP_*` / `RAZORPAY_*` / `CRON_SECRET`.

## Security & compliance notes

- **PII at rest** is encrypted (AES-256-GCM) in `data_principals` and
  `dpr_requests`; a keyed blind index enables lookups without exposing plaintext.
- The **consent ledger is append-only** — enforced in code *and* by a Postgres
  trigger that rejects `UPDATE`/`DELETE` on `consent_records` (and `notice_versions`).
- Every admin query is **scoped to the selected domain** of the authenticated account.
- The widget **fails soft**: any API error leaves the host page untouched.
