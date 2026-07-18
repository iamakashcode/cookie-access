import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Seed one demo ACCOUNT with TWO domains, so multi-domain isolation is visible
 * immediately. Idempotent-ish: upserts by unique keys; notices/purposes are
 * only created when absent.
 */

const prisma = new PrismaClient();

const DEMO_ADMIN_EMAIL = "owner@demo-store.test";
const DEMO_ADMIN_PASSWORD = "demo-password-123";

// Stable widget keys so the demo page + README keep working.
const STORE_KEY = "dpdp_pk_demo_0123456789abcdef";
const BLOG_KEY = "dpdp_pk_demo_blog_000000000000";

const SUPER_EMAIL = process.env.SUPERADMIN_EMAIL || "super@demo.test";
const SUPER_PASSWORD = process.env.SUPERADMIN_PASSWORD || "super-password-123";

function noticeFor(business: string, lines: string): string {
  return `Privacy Notice — ${business}

We collect and use your personal data only for the purposes listed below, and
only with your consent (except where a purpose is essential to providing our
service). You can review or withdraw your consent at any time using the
"Manage preferences" link on our site.

What we collect and why:
${lines}

You can also ask us to access, correct, or erase your data, or raise a grievance.

This notice is a template provided via a DPDP consent-management tool. It does
not constitute legal advice.`;
}

async function ensureSite(
  tenantId: string,
  apiKey: string,
  name: string,
  domain: string,
  purposes: {
    name: string;
    description: string;
    isEssential?: boolean;
    sortOrder: number;
    categoryKey: string;
  }[],
  noticeBody: string,
) {
  const site = await prisma.site.upsert({
    where: { apiKey },
    update: { name, domain },
    create: { tenantId, apiKey, name, domain },
  });

  for (const p of purposes) {
    const existing = await prisma.consentPurpose.findFirst({
      where: { siteId: site.id, name: p.name },
    });
    if (existing) {
      await prisma.consentPurpose.update({
        where: { id: existing.id },
        data: {
          description: p.description,
          isEssential: !!p.isEssential,
          sortOrder: p.sortOrder,
          categoryKey: p.categoryKey,
        },
      });
    } else {
      await prisma.consentPurpose.create({
        data: {
          siteId: site.id,
          name: p.name,
          description: p.description,
          isEssential: !!p.isEssential,
          sortOrder: p.sortOrder,
          categoryKey: p.categoryKey,
        },
      });
    }
  }

  const hasNotice = await prisma.noticeVersion.findFirst({
    where: { siteId: site.id, language: "en" },
  });
  if (!hasNotice) {
    await prisma.noticeVersion.create({
      data: { siteId: site.id, language: "en", bodyText: noticeBody, version: 1 },
    });
  }
  return site;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 10);

  // Find the account by its owner admin email (globally unique), else create.
  const existingAdmin = await prisma.adminUser.findFirst({
    where: { email: DEMO_ADMIN_EMAIL },
    select: { tenantId: true },
  });

  let tenantId: string;
  if (existingAdmin) {
    tenantId = existingAdmin.tenantId;
    await prisma.adminUser.updateMany({
      where: { email: DEMO_ADMIN_EMAIL },
      data: { passwordHash },
    });
  } else {
    const tenant = await prisma.tenant.create({
      data: {
        businessName: "Demo Company",
        contactEmail: DEMO_ADMIN_EMAIL,
        admins: {
          create: { email: DEMO_ADMIN_EMAIL, passwordHash, role: "owner" },
        },
      },
    });
    tenantId = tenant.id;
  }

  const store = await ensureSite(
    tenantId,
    STORE_KEY,
    "Demo Store",
    "shop.demo.test",
    [
      {
        name: "Order fulfillment",
        description:
          "We use your contact and delivery details to process and ship your orders.",
        isEssential: true,
        sortOrder: 1,
        categoryKey: "essential",
      },
      {
        name: "Marketing emails",
        description:
          "We use your email address to send you offers, discounts, and product updates.",
        sortOrder: 2,
        categoryKey: "marketing",
      },
      {
        name: "Analytics",
        description:
          "We collect anonymous usage data to understand and improve our website.",
        sortOrder: 3,
        categoryKey: "analytics",
      },
    ],
    noticeFor(
      "Demo Store",
      `- Order fulfillment: contact + delivery details, to ship your orders. Essential.
- Marketing emails: your email, to send offers and updates. Optional.
- Analytics: anonymous usage data, to improve our website. Optional.`,
    ),
  );

  const blog = await ensureSite(
    tenantId,
    BLOG_KEY,
    "Demo Blog",
    "blog.demo.test",
    [
      {
        name: "Newsletter",
        description: "We use your email to send new posts and occasional updates.",
        sortOrder: 1,
        categoryKey: "marketing",
      },
      {
        name: "Comments",
        description:
          "We store your name and comment so others can see your contributions.",
        sortOrder: 2,
        categoryKey: "functional",
      },
    ],
    noticeFor(
      "Demo Blog",
      `- Newsletter: your email, to send new posts. Optional.
- Comments: your name + comment, shown publicly. Optional.`,
    ),
  );

  const superHash = await bcrypt.hash(SUPER_PASSWORD, 10);
  await prisma.superAdmin.upsert({
    where: { email: SUPER_EMAIL.toLowerCase() },
    update: { passwordHash: superHash },
    create: { email: SUPER_EMAIL.toLowerCase(), passwordHash: superHash },
  });

  // eslint-disable-next-line no-console
  console.log(`
✓ Seed complete.

  Account:        Demo Company
  Admin login:    ${DEMO_ADMIN_EMAIL}
  Admin password: ${DEMO_ADMIN_PASSWORD}

  Domains:
    • Demo Store  key=${store.apiKey}
    • Demo Blog   key=${blog.apiKey}

  Super-admin:    ${SUPER_EMAIL} / ${SUPER_PASSWORD}   (login at /super/login)

  The widget demo page uses the Demo Store key automatically.
`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
