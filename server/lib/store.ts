import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { countryName, VALID_COUNTRY_CODES } from "../../src/data/countries.js";
import type { PaymentMethod, SoulReceipt, StatsPayload } from "../../src/types";
import { serverConfig } from "./config.js";
import { createReceiptHash } from "./receipt.js";

export type SignalRow = {
  country_code: string;
  created_at: string;
  payment_method: PaymentMethod;
  receipt_hash: string;
  stripe_session_id?: string | null;
};

type MemoryState = {
  signals: SignalRow[];
  sessions: Map<string, string>;
};

const memory: MemoryState = {
  signals: [],
  sessions: new Map(),
};

let supabase: SupabaseClient | null = null;

function db(): SupabaseClient | null {
  if (!serverConfig.supabaseUrl || !serverConfig.supabaseServiceKey) return null;
  if (!supabase) {
    supabase = createClient(serverConfig.supabaseUrl, serverConfig.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabase;
}

export function assertCountry(code: string): string {
  const next = code.trim().toUpperCase();
  if (!VALID_COUNTRY_CODES.has(next)) {
    throw new Error("Unknown country.");
  }
  return next;
}

export function toReceipt(row: SignalRow): SoulReceipt {
  return {
    receiptHash: row.receipt_hash,
    countryCode: row.country_code,
    countryName: countryName(row.country_code),
    createdAt: row.created_at,
    paymentMethod: row.payment_method,
  };
}

export async function insertSignal(input: {
  countryCode: string;
  paymentMethod: PaymentMethod;
  stripeSessionId?: string;
}): Promise<SoulReceipt> {
  const countryCode = assertCountry(input.countryCode);
  const createdAt = new Date().toISOString();
  const receiptHash = createReceiptHash({
    countryCode,
    createdAt,
    paymentMethod: input.paymentMethod,
  });
  const row: SignalRow = {
    country_code: countryCode,
    created_at: createdAt,
    payment_method: input.paymentMethod,
    receipt_hash: receiptHash,
    stripe_session_id: input.stripeSessionId ?? null,
  };

  const client = db();
  if (client) {
    const { error } = await client.from("live_signals").insert({
      country_code: row.country_code,
      created_at: row.created_at,
      payment_method: row.payment_method,
      receipt_hash: row.receipt_hash,
    });
    if (error) throw new Error(error.message);

    if (row.stripe_session_id) {
      const lookup = await client.from("receipt_index").insert({
        receipt_hash: row.receipt_hash,
        stripe_session_id: row.stripe_session_id,
      });
      if (lookup.error) throw new Error(lookup.error.message);
    }
  } else {
    memory.signals.unshift(row);
    if (row.stripe_session_id) memory.sessions.set(row.stripe_session_id, row.receipt_hash);
  }

  return toReceipt(row);
}

export async function getStats(): Promise<StatsPayload> {
  const rows = await listSignals();
  const byCountry: StatsPayload["byCountry"] = {};
  for (const row of rows) {
    const current = byCountry[row.country_code];
    byCountry[row.country_code] = {
      count: (current?.count ?? 0) + 1,
      lastAt: current && current.lastAt > row.created_at ? current.lastAt : row.created_at,
    };
  }
  return {
    total: rows.length,
    countriesAwakened: Object.keys(byCountry).length,
    byCountry,
    recent: rows.slice(0, 16).map((row) => ({
      countryCode: row.country_code,
      createdAt: row.created_at,
    })),
  };
}

export async function findByHash(hash: string): Promise<SoulReceipt | null> {
  const rows = await listSignals();
  const row = rows.find((item) => item.receipt_hash === hash);
  return row ? toReceipt(row) : null;
}

export async function findBySession(sessionId: string): Promise<SoulReceipt | null> {
  const client = db();
  if (client) {
    const { data, error } = await client
      .from("receipt_index")
      .select("receipt_hash")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();
    if (error || !data?.receipt_hash) return null;
    return findByHash(data.receipt_hash);
  }
  const hash = memory.sessions.get(sessionId);
  return hash ? findByHash(hash) : null;
}

async function listSignals(): Promise<SignalRow[]> {
  const client = db();
  if (!client) return memory.signals;

  const { data, error } = await client
    .from("live_signals")
    .select("country_code, created_at, payment_method, receipt_hash")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []) as SignalRow[];
}

export async function sessionAlreadyRecorded(sessionId: string): Promise<boolean> {
  return Boolean(await findBySession(sessionId));
}
