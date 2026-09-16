import type { PublicConfig, SoulReceipt, StatsPayload } from "../types";

const base = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }
  return payload;
}

export const api = {
  config: () => request<PublicConfig>("/api/config"),
  stats: () => request<StatsPayload>("/api/stats"),
  checkout: () =>
    request<{ url: string }>("/api/checkout", { method: "POST", body: "{}" }),
  confirmUpi: (countryCode: string) =>
    request<SoulReceipt>("/api/confirm-upi", {
      method: "POST",
      body: JSON.stringify({ countryCode }),
    }),
  demo: (countryCode: string) =>
    request<SoulReceipt>("/api/demo", {
      method: "POST",
      body: JSON.stringify({ countryCode }),
    }),
  receipt: (query: { sessionId?: string; hash?: string }) => {
    const params = new URLSearchParams();
    if (query.sessionId) params.set("session_id", query.sessionId);
    if (query.hash) params.set("hash", query.hash);
    return request<SoulReceipt>(`/api/receipt?${params.toString()}`);
  },
};
