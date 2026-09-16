import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { PublicConfig } from "../types";

const FALLBACK: PublicConfig = {
  brand: "$1 Only",
  payAmount: Number(import.meta.env.VITE_PAY_AMOUNT || 1.5),
  netAmount: Number(import.meta.env.VITE_NET_AMOUNT || 1),
  currency: import.meta.env.VITE_CURRENCY || "USD",
  feeNote:
    "You pay $1.50 → I receive a clean ~$1. The extra only covers processing fees so the $1 experiment stays pure.",
  upiEnabled: Boolean(import.meta.env.VITE_UPI_ID),
  upiId: import.meta.env.VITE_UPI_ID || "",
  upiName: import.meta.env.VITE_UPI_NAME || "$1 Only",
  upiAmountInr: import.meta.env.VITE_UPI_AMOUNT_INR || "",
  demoEnabled: import.meta.env.VITE_ENABLE_DEMO === "true",
};

export function usePublicConfig(): PublicConfig {
  const [config, setConfig] = useState<PublicConfig>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    api
      .config()
      .then((next) => {
        if (!cancelled) setConfig(next);
      })
      .catch(() => {
        /* keep fallback so the sacred copy still renders offline */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}
