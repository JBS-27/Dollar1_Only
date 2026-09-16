import { config as loadEnv } from "dotenv";
import path from "node:path";

loadEnv({ path: path.resolve(process.cwd(), ".env") });

function read(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

function readNumber(name: string, fallback: number): number {
  const raw = read(name);
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

const chargeCents = readNumber("STRIPE_CHARGE_AMOUNT_CENTS", 150);
const payAmount = chargeCents / 100;
const netAmount = readNumber("NET_AMOUNT", 1);

export const serverConfig = {
  port: readNumber("PORT", 8787),
  nodeEnv: read("NODE_ENV", "development"),
  isProd: read("NODE_ENV") === "production",
  frontendOrigins: read("FRONTEND_URL", "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  chargeCents,
  payAmount,
  netAmount,
  currency: read("STRIPE_CURRENCY", "usd").toLowerCase(),
  stripeSecretKey: read("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: read("STRIPE_WEBHOOK_SECRET"),
  supabaseUrl: read("SUPABASE_URL") || read("VITE_SUPABASE_URL"),
  supabaseServiceKey: read("SUPABASE_SERVICE_ROLE_KEY"),
  demoEnabled: read("ENABLE_DEMO", read("NODE_ENV") === "production" ? "false" : "true") === "true",
  upiId: read("VITE_UPI_ID"),
  upiName: read("VITE_UPI_NAME", "$1 Only"),
  upiAmountInr: read("VITE_UPI_AMOUNT_INR"),
  upiConfirmToken: read("UPI_CONFIRM_TOKEN"),
  feeNote:
    `You pay $${payAmount.toFixed(2)} → I receive a clean ~$${netAmount}. The extra only covers processing fees so the $1 experiment stays pure.`,
};

export function publicOrigin(): string {
  return serverConfig.frontendOrigins[0] ?? "http://localhost:5173";
}
