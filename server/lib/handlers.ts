import { VALID_COUNTRY_CODES } from "../../src/data/countries";
import { serverConfig } from "./config";
import { applyCors, clientIp, header, methodGuard, type ApiReq, type ApiRes } from "./http";
import { rejectIfLimited } from "./rateLimit";
import { createLockedCheckout, getStripe, verifyWebhook } from "./stripe";
import { findByHash, findBySession, getStats, insertSignal, sessionAlreadyRecorded } from "./store";

function gate(req: ApiReq, res: ApiRes, methods: string[], limit: number, windowMs: number): boolean {
  if (applyCors(req, res)) return false;
  if (!methodGuard(req, res, methods)) return false;
  if (rejectIfLimited(res, `${req.method}:${req.ip || clientIp(req)}`, limit, windowMs)) return false;
  return true;
}

export async function handleHealth(req: ApiReq, res: ApiRes): Promise<void> {
  if (!gate(req, res, ["GET"], 60, 60_000)) return;
  res.status(200).json({ ok: true, brand: "$1 Only" });
}

export async function handleConfig(req: ApiReq, res: ApiRes): Promise<void> {
  if (!gate(req, res, ["GET"], 60, 60_000)) return;
  res.status(200).json({
    brand: "$1 Only",
    payAmount: serverConfig.payAmount,
    netAmount: serverConfig.netAmount,
    currency: serverConfig.currency.toUpperCase(),
    feeNote: serverConfig.feeNote,
    upiEnabled: Boolean(serverConfig.upiId),
    upiId: serverConfig.upiId,
    upiName: serverConfig.upiName,
    upiAmountInr: serverConfig.upiAmountInr,
    demoEnabled: serverConfig.demoEnabled,
  });
}

export async function handleStats(req: ApiReq, res: ApiRes): Promise<void> {
  if (!gate(req, res, ["GET"], 60, 60_000)) return;
  try {
    res.status(200).json(await getStats());
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Stats unavailable." });
  }
}

export async function handleCheckout(req: ApiReq, res: ApiRes): Promise<void> {
  if (!gate(req, res, ["POST"], 8, 15 * 60_000)) return;
  try {
    const url = await createLockedCheckout();
    res.status(200).json({ url });
  } catch (error) {
    res.status(503).json({
      error: error instanceof Error ? error.message : "Checkout is not configured.",
    });
  }
}

export async function handleWebhook(req: ApiReq, res: ApiRes): Promise<void> {
  if (applyCors(req, res)) return;
  if (!methodGuard(req, res, ["POST"])) return;
  if (rejectIfLimited(res, `stripe-webhook:${clientIp(req)}`, 120, 60_000)) return;

  const signature = header(req, "stripe-signature");
  if (!signature) {
    res.status(400).json({ error: "Missing Stripe-Signature." });
    return;
  }

  try {
    const event = verifyWebhook(req.rawBody, signature);
    if (event.type === "checkout.session.completed") {
      await recordStripeSession(event.data.object);
    }
    res.status(200).json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid webhook." });
  }
}

async function recordStripeSession(session: {
  id?: string;
  amount_total?: number | null;
  currency?: string | null;
  customer_details?: { address?: { country?: string | null } | null } | null;
}): Promise<void> {
  if (!session.id) return;
  if (await sessionAlreadyRecorded(session.id)) return;

  if (session.amount_total !== serverConfig.chargeCents) {
    throw new Error("Rejected: amount was not the locked $1 Only charge.");
  }
  if ((session.currency ?? serverConfig.currency).toLowerCase() !== serverConfig.currency) {
    throw new Error("Rejected: currency mismatch.");
  }

  const country = session.customer_details?.address?.country;
  if (!country || !VALID_COUNTRY_CODES.has(country.toUpperCase())) {
    throw new Error("Rejected: billing country missing.");
  }

  await insertSignal({
    countryCode: country,
    paymentMethod: "stripe",
    stripeSessionId: session.id,
  });
}

export async function handleReceipt(req: ApiReq, res: ApiRes): Promise<void> {
  if (!gate(req, res, ["GET"], 30, 60_000)) return;
  const hash = req.query.hash;
  const sessionId = req.query.session_id;
  try {
    if (hash) {
      const receipt = await findByHash(hash);
      if (!receipt) {
        res.status(404).json({ error: "Unknown soul receipt." });
        return;
      }
      res.status(200).json(receipt);
      return;
    }
    if (sessionId) {
      const existing = await findBySession(sessionId);
      if (existing) {
        res.status(200).json(existing);
        return;
      }
      // Webhook may still be arriving — verify with Stripe, then write once.
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") {
        res.status(404).json({ error: "Payment is not complete." });
        return;
      }
      await recordStripeSession(session);
      const receipt = await findBySession(sessionId);
      if (!receipt) {
        res.status(404).json({ error: "Receipt is still forming." });
        return;
      }
      res.status(200).json(receipt);
      return;
    }
    res.status(400).json({ error: "Provide hash or session_id." });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Receipt lookup failed." });
  }
}

export async function handleConfirmUpi(req: ApiReq, res: ApiRes): Promise<void> {
  if (!gate(req, res, ["POST"], 3, 60 * 60_000)) return;
  if (!serverConfig.upiId) {
    res.status(503).json({ error: "UPI is not configured." });
    return;
  }
  const body = (req.body ?? {}) as { countryCode?: string; token?: string };
  if (serverConfig.upiConfirmToken && body.token !== serverConfig.upiConfirmToken) {
    res.status(401).json({ error: "UPI confirm token rejected." });
    return;
  }
  try {
    const receipt = await insertSignal({
      countryCode: body.countryCode ?? "IN",
      paymentMethod: "upi",
    });
    res.status(200).json(receipt);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Could not record UPI." });
  }
}

export async function handleDemo(req: ApiReq, res: ApiRes): Promise<void> {
  if (!gate(req, res, ["POST"], 20, 60 * 60_000)) return;
  if (!serverConfig.demoEnabled) {
    res.status(403).json({ error: "Demo mode is off." });
    return;
  }
  const body = (req.body ?? {}) as { countryCode?: string };
  try {
    const receipt = await insertSignal({
      countryCode: body.countryCode ?? "IN",
      paymentMethod: "demo",
    });
    res.status(200).json(receipt);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Demo failed." });
  }
}
