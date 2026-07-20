import crypto from "node:crypto";
import Razorpay from "razorpay";
import { env } from "../env";

/**
 * Billing via Razorpay subscriptions. The whole module is optional: if
 * RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET aren't set, `billingConfigured` is false
 * and the routes tell the UI billing isn't connected yet.
 *
 * Razorpay subscriptions require a Plan to be created in the Razorpay dashboard;
 * pass its id per tier via RAZORPAY_PLAN_STARTER / RAZORPAY_PLAN_GROWTH.
 */

export type PaidTier = "starter" | "growth";

export interface PlanInfo {
  tier: "free" | PaidTier;
  name: string;
  priceInr: number; // rupees / month, for display
  features: string[];
}

export const PLANS: PlanInfo[] = [
  {
    tier: "free",
    name: "Free",
    priceInr: 0,
    features: ["1 website", "Unlimited purposes", "Consent records + CSV export"],
  },
  {
    tier: "starter",
    name: "Starter",
    priceInr: 999,
    features: ["Everything in Free", "Data-rights portal", "Hindi + English notices"],
  },
  {
    tier: "growth",
    name: "Growth",
    priceInr: 2999,
    features: ["Everything in Starter", "Team members & roles", "Priority support"],
  },
];

export const billingConfigured = Boolean(
  env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET,
);

// Public key id — safe to expose to the browser for Razorpay Checkout.
export const razorpayKeyId = env.RAZORPAY_KEY_ID ?? null;

let client: Razorpay | null = null;
function razorpay(): Razorpay {
  if (!client) {
    client = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID!,
      key_secret: env.RAZORPAY_KEY_SECRET!,
    });
  }
  return client;
}

function planIdForTier(tier: PaidTier): string {
  const id =
    tier === "starter"
      ? process.env.RAZORPAY_PLAN_STARTER
      : process.env.RAZORPAY_PLAN_GROWTH;
  if (!id) throw new Error(`No Razorpay plan id configured for tier "${tier}"`);
  return id;
}

export async function createSubscription(tier: PaidTier): Promise<{
  subscriptionId: string;
  shortUrl?: string;
}> {
  const rp = razorpay();
  const sub = await rp.subscriptions.create({
    plan_id: planIdForTier(tier),
    total_count: 12, // 12 billing cycles
    customer_notify: 1,
  });
  // Razorpay generates the hosted-checkout short_url asynchronously, so it's
  // often absent from the create response. Re-fetch once to pick it up.
  let shortUrl = (sub as { short_url?: string }).short_url;
  if (!shortUrl) {
    try {
      const fetched = await rp.subscriptions.fetch(sub.id);
      shortUrl = (fetched as { short_url?: string }).short_url;
    } catch {
      /* fall through — caller handles a missing URL */
    }
  }
  return { subscriptionId: sub.id, shortUrl };
}

/** Verify a Razorpay webhook signature. */
export function verifyWebhook(rawBody: string, signature: string): boolean {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}
