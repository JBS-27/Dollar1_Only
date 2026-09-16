import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COUNTRY_BY_CODE } from "../data/countries";
import { api } from "../lib/api";
import { getSupabase } from "../lib/supabase";
import type { CountryStat, LatestAwakening, SoulReceipt, StatsPayload } from "../types";

export type LiveModel = {
  total: number;
  countriesAwakened: number;
  countries: CountryStat[];
  recent: { code: string; at: string }[];
  latest: LatestAwakening | null;
  ready: boolean;
  ingest: (receipt: SoulReceipt) => void;
  refresh: (spotlight?: SoulReceipt) => Promise<void>;
};

function applyReceipt(prev: StatsPayload | null, receipt: SoulReceipt): StatsPayload {
  const current = prev ?? { total: 0, countriesAwakened: 0, byCountry: {}, recent: [] };
  const existing = current.byCountry[receipt.countryCode];
  return {
    total: current.total + 1,
    countriesAwakened: existing ? current.countriesAwakened : current.countriesAwakened + 1,
    byCountry: {
      ...current.byCountry,
      [receipt.countryCode]: { count: (existing?.count ?? 0) + 1, lastAt: receipt.createdAt },
    },
    recent: [{ countryCode: receipt.countryCode, createdAt: receipt.createdAt }, ...current.recent].slice(0, 16),
  };
}

function toModel(stats: StatsPayload, latest: LatestAwakening | null): Omit<LiveModel, "ingest" | "refresh"> {
  const countries = Object.entries(stats.byCountry)
    .map(([code, row]) => {
      const meta = COUNTRY_BY_CODE[code];
      return {
        code,
        name: meta?.name ?? code,
        lat: meta?.lat ?? 0,
        lng: meta?.lng ?? 0,
        count: row.count,
        lastAt: row.lastAt,
      };
    })
    .filter((row) => row.lat !== 0 || row.lng !== 0 || COUNTRY_BY_CODE[row.code]);

  return {
    total: stats.total,
    countriesAwakened: stats.countriesAwakened,
    countries,
    recent: stats.recent.map((item) => ({ code: item.countryCode, at: item.createdAt })),
    latest,
    ready: true,
  };
}

export function useLiveSignals(): LiveModel {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [latest, setLatest] = useState<LatestAwakening | null>(null);
  const known = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const hydrate = async (announce = false) => {
      try {
        const next = await api.stats();
        if (cancelled) return;
        setStats((prev) => {
          if (announce && prev) {
            const newcomers = Object.entries(next.byCountry).filter(([code, row]) => {
              const before = prev.byCountry[code]?.count ?? 0;
              return row.count > before;
            });
            if (newcomers.length > 0) {
              const [code, row] = newcomers.sort((a, b) => b[1].lastAt.localeCompare(a[1].lastAt))[0];
              setLatest({
                code,
                at: row.lastAt,
                first: !known.current.has(code),
              });
            }
          }
          Object.keys(next.byCountry).forEach((code) => known.current.add(code));
          return next;
        });
      } catch {
        if (!cancelled) {
          setStats({ total: 0, countriesAwakened: 0, byCountry: {}, recent: [] });
        }
      }
    };

    void hydrate(false);
    const poll = window.setInterval(() => void hydrate(true), 15000);

    const supabase = getSupabase();
    const channel = supabase
      ? supabase
          .channel("live_signals")
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "live_signals" },
            (payload) => {
              const row = payload.new as {
                country_code?: string;
                created_at?: string;
                receipt_hash?: string;
              };
              if (!row.country_code || !row.created_at) return;
              const first = !known.current.has(row.country_code);
              known.current.add(row.country_code);
              setLatest({
                code: row.country_code,
                at: row.created_at,
                first,
                receiptHash: row.receipt_hash,
              });
              setStats((prev) => {
                const current = prev ?? { total: 0, countriesAwakened: 0, byCountry: {}, recent: [] };
                const existing = current.byCountry[row.country_code!];
                return {
                  total: current.total + 1,
                  countriesAwakened: existing ? current.countriesAwakened : current.countriesAwakened + 1,
                  byCountry: {
                    ...current.byCountry,
                    [row.country_code!]: { count: (existing?.count ?? 0) + 1, lastAt: row.created_at! },
                  },
                  recent: [
                    { countryCode: row.country_code!, createdAt: row.created_at! },
                    ...current.recent,
                  ].slice(0, 16),
                };
              });
            },
          )
          .subscribe()
      : null;

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, []);

  const seenHashes = useRef<Set<string>>(new Set());

  const ingest = useCallback((receipt: SoulReceipt) => {
    if (seenHashes.current.has(receipt.receiptHash)) return;
    seenHashes.current.add(receipt.receiptHash);
    const first = !known.current.has(receipt.countryCode);
    known.current.add(receipt.countryCode);
    setLatest({
      code: receipt.countryCode,
      at: receipt.createdAt,
      first,
      receiptHash: receipt.receiptHash,
    });
    setStats((prev) => applyReceipt(prev, receipt));
  }, []);

  const refresh = useCallback(async (spotlight?: SoulReceipt) => {
    const next = await api.stats();
    Object.keys(next.byCountry).forEach((code) => known.current.add(code));
    setStats(next);
    if (spotlight) {
      setLatest({
        code: spotlight.countryCode,
        at: spotlight.createdAt,
        first: (next.byCountry[spotlight.countryCode]?.count ?? 1) === 1,
        receiptHash: spotlight.receiptHash,
      });
    }
  }, []);

  const fallback = toModel({ total: 0, countriesAwakened: 0, byCountry: {}, recent: [] }, latest);

  return useMemo(
    () => ({
      ...(stats ? toModel(stats, latest) : { ...fallback, ready: false }),
      ingest,
      refresh,
    }),
    [stats, latest, ingest, refresh],
  );
}
