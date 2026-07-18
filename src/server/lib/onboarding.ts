import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { hashPassword } from "./password";
import { generateApiKey } from "./crypto";
import { HttpError } from "../http";

/**
 * Account + domain provisioning.
 *  - registerTenant: sign up a new account with its first domain.
 *  - provisionSite: create an additional domain with starter data.
 * A domain always starts with a usable set of purposes + a draft notice.
 */

const STARTER_PURPOSES = [
  {
    name: "Account & service delivery",
    description:
      "We use your details to create your account and provide the service you asked for.",
    isEssential: true,
    sortOrder: 1,
    categoryKey: "essential",
  },
  {
    name: "Marketing communications",
    description:
      "We use your email to send you offers, news, and product updates. Optional.",
    isEssential: false,
    sortOrder: 2,
    categoryKey: "marketing",
  },
  {
    name: "Analytics & improvement",
    description:
      "We collect anonymous usage data to understand and improve our website. Optional.",
    isEssential: false,
    sortOrder: 3,
    categoryKey: "analytics",
  },
];

function starterNotice(name: string): string {
  return `Privacy Notice — ${name}

We collect and use your personal data only for the purposes listed below, and
only with your consent (except where a purpose is essential to providing our
service). You can review or withdraw your consent at any time using the
"Manage preferences" link on our site.

This is a starter template — please review and edit it to match how this site
actually uses personal data. It does not constitute legal advice.`;
}

/** Create a domain (Site) with a fresh key + starter purposes + a draft notice. */
export async function provisionSite(
  tx: Prisma.TransactionClient,
  tenantId: string,
  name: string,
  domain?: string | null,
) {
  const site = await tx.site.create({
    data: { tenantId, name, domain: domain || null, apiKey: generateApiKey() },
  });
  await tx.consentPurpose.createMany({
    data: STARTER_PURPOSES.map((p) => ({ ...p, siteId: site.id })),
  });
  await tx.noticeVersion.create({
    data: {
      siteId: site.id,
      language: "en",
      bodyText: starterNotice(name),
      version: 1,
    },
  });
  return site;
}

interface RegisterInput {
  businessName: string;
  contactEmail: string;
  email: string; // owner login email (already lowercased)
  password: string;
}

export async function registerTenant(input: RegisterInput) {
  // Login resolves an admin by email across all accounts, so email must be
  // globally unique.
  const existing = await prisma.adminUser.findFirst({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw new HttpError(409, "An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        businessName: input.businessName,
        contactEmail: input.contactEmail,
        status: "active",
      },
    });
    const admin = await tx.adminUser.create({
      data: {
        tenantId: tenant.id,
        email: input.email,
        passwordHash,
        role: "owner",
      },
    });
    // First domain, named after the business to start.
    const site = await provisionSite(tx, tenant.id, input.businessName);
    return { tenant, admin, site };
  });
}
