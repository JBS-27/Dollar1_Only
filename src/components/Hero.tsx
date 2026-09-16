import { motion } from "framer-motion";
import { GlowingOne } from "./GlowingOne";
import { LiveCounters } from "./LiveCounters";

type Props = {
  total: number;
  countries: number;
  onOpenPayment: () => void;
};

export function Hero({ total, countries, onOpenPayment }: Props) {
  return (
    <section className="relative z-[2] flex min-h-[100svh] flex-col items-center justify-center px-6 py-24 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.15, delay: 0.15 }}
        className="relative z-10 flex w-full max-w-xl flex-col items-center text-center"
      >
        <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.34em] text-cyan-glow/70">
          A global $1 experiment
        </p>
        <GlowingOne onOpen={onOpenPayment} />
        <h1 className="wordmark mt-7" aria-label="$1 Only">
          <span className="wordmark-one">$1</span>
          <span className="wordmark-only"> Only</span>
        </h1>
        <p className="mt-6 max-w-[34rem] text-[17px] font-medium leading-snug tracking-[-0.02em] text-white/88 sm:text-[19px]">
          People from every country give exactly the same $1 — a pure equal signal of belief.
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-white/48 sm:text-[15px]">
          The Earth stays dark until a country chooses it.
        </p>
        <LiveCounters total={total} countries={countries} />
        <div className="fee-chip mt-10">
          <span>You pay $1.50</span>
          <span className="fee-chip-rule" aria-hidden="true" />
          <span>~$1 arrives after fees</span>
        </div>
        <p className="mt-3 max-w-sm text-[12px] leading-relaxed text-white/38">
          No tips. No higher amounts. The extra only covers processing so the dollar stays pure.
        </p>
      </motion.div>
    </section>
  );
}
