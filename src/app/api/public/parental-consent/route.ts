import crypto from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { corsJson, corsPreflight, handlePublic, resolveSiteKey } from "@/server/http";
import { upsertDataPrincipal } from "@/server/lib/principals";
import { encrypt } from "@/server/lib/crypto";
import { sendGuardianVerification } from "@/server/lib/notify";
import { env } from "@/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = corsPreflight;

const schema = z.object({
  tenantKey: z.string().optional(),
  minorIdentifier: z.string().min(1).max(320),
  guardianEmail: z.string().email(),
  language: z.string().default("en"),
  decisions: z
    .array(z.object({ purposeId: z.string().min(1), granted: z.boolean() }))
    .min(1),
});

// POST /api/public/parental-consent — records a pending consent and emails the
// guardian a verification link. Consent is written only after they confirm.
export function POST(req: NextRequest) {
  return handlePublic(async () => {
    const body = schema.parse(await req.json());
    const site = await resolveSiteKey(body.tenantKey);

    const minor = await upsertDataPrincipal(site.id, body.minorIdentifier, "anon");
    const token = crypto.randomBytes(24).toString("base64url");

    await prisma.parentalConsent.create({
      data: {
        siteId: site.id,
        dataPrincipalId: minor.id,
        guardianRef: encrypt(body.guardianEmail),
        verificationToken: token,
        pendingPurposes: body.decisions,
        language: body.language,
      },
    });

    const verifyUrl = `${env.APP_URL}/parental-verify?token=${token}`;
    void sendGuardianVerification(body.guardianEmail, site.name, verifyUrl);

    return corsJson({ ok: true, pendingVerification: true }, 201);
  });
}
