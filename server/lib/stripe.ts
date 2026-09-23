import Stripe from "stripe";
import { publicOrigin, serverConfig } from "./config.js";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!serverConfig.stripeSecretKey) {
    throw new Error("Stripe is not configured.");
  }
  if (!stripe) {
    stripe = new Stripe(serverConfig.stripeSecretKey);
  }
  return stripe;
}

export async function createLockedCheckout(): Promise<string> {
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    currency: serverConfig.currency,
    submit_type: "pay",
    billing_address_collection: "required",
    allow_promotion_codes: false,
    success_url: `${publicOrigin()}/?soul={CHECKOUT_SESSION_ID}`,
    cancel_url: `${publicOrigin()}/?cancelled=1`,
    metadata: {
      brand: "$1 Only",
      expected_amount: String(serverConfig.chargeCents),
    },
    payment_intent_data: {
      metadata: {
        brand: "$1 Only",
        expected_amount: String(serverConfig.chargeCents),
      },
    },
    line_items: [
      {
        quantity: 1,
        adjustable_quantity: { enabled: false },
        price_data: {
          currency: serverConfig.currency,
          unit_amount: serverConfig.chargeCents,
          product_data: {
            name: "$1 Only",
            description: serverConfig.feeNote,
          },
        },
      },
    ],
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

export function verifyWebhook(rawBody: string, signature: string): Stripe.Event {
  if (!serverConfig.stripeWebhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is missing.");
  }
  return getStripe().webhooks.constructEvent(rawBody, signature, serverConfig.stripeWebhookSecret);
}
