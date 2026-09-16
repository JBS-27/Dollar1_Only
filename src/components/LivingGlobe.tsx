import { useEffect, useRef, useState } from "react";
import { createGlobeEngine, type GlobeEngine } from "../globe/engine";
import type { CountryStat, LatestAwakening } from "../types";
import { PinCard } from "./PinCard";

type Props = {
  countries: CountryStat[];
  latest: LatestAwakening | null;
  total: number;
};

export default function LivingGlobe({ countries, latest, total }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GlobeEngine | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [named, setNamed] = useState<Set<string>>(new Set());
  const latestKey = latest ? `${latest.code}:${latest.at}` : "";

  const activeCode = selectedCode ?? hoveredCode;
  const active = countries.find((country) => country.code === activeCode) ?? null;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const engine = createGlobeEngine(host, {
      onSelect: (code) => setSelectedCode((current) => (current === code ? null : code)),
      onHover: (code) => setHoveredCode(code),
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setCountries(countries);
  }, [countries]);

  useEffect(() => {
    engineRef.current?.setTotal(total);
  }, [total]);

  useEffect(() => {
    engineRef.current?.setNamed(named);
  }, [named]);

  useEffect(() => {
    if (!latest) return;
    engineRef.current?.pulse(latest.code);
    if (latest.first) {
      setNamed((prev) => new Set(prev).add(latest.code));
      const clear = window.setTimeout(() => {
        setNamed((prev) => {
          const next = new Set(prev);
          next.delete(latest.code);
          return next;
        });
      }, 8000);
      return () => window.clearTimeout(clear);
    }
    return undefined;
  }, [latestKey]);

  return (
    <section id="earth" className="relative z-[2] mx-auto w-full max-w-5xl px-4 pb-28 pt-4">
      <div className="mb-6 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-cyan-glow/60">The living globe</p>
        <h2 className="mt-3 font-display text-[1.35rem] font-medium tracking-[-0.03em] text-white/88 sm:text-[1.65rem]">
          Dark countries have not yet given $1
        </h2>
        <p className="mt-2 text-[13px] text-white/40">Drag to turn the Earth. Touch a $1 to read its souls.</p>
      </div>
      <div className="relative mx-auto aspect-square w-full max-h-[min(88svh,760px)] max-w-[760px]">
        <div ref={hostRef} className="holo-globe-host absolute inset-0 overflow-visible" />
        {active && (
          <div className="pointer-events-auto absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
            <PinCard
              countryCode={active.code}
              countryName={active.name}
              count={active.count}
              onClose={() => {
                setSelectedCode(null);
                setHoveredCode(null);
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
