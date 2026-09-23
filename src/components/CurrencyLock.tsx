import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

const CURRENCIES = [
  { mark: "₹", place: "India" },
  { mark: "€", place: "Europe" },
  { mark: "£", place: "Britain" },
  { mark: "¥", place: "Japan" },
  { mark: "₩", place: "Korea" },
  { mark: "₦", place: "Nigeria" },
  { mark: "R$", place: "Brazil" },
  { mark: "₺", place: "Türkiye" },
  { mark: "฿", place: "Thailand" },
  { mark: "₽", place: "Russia" },
  { mark: "د.إ", place: "Emirates" },
  { mark: "$", place: "Everywhere" },
] as const;

/** The 1 never moves. Currencies dash in, strike, and leave. */
export function CurrencyLock() {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const current = CURRENCIES[reduced ? CURRENCIES.length - 1 : index];

  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % CURRENCIES.length);
    }, 1180);
    return () => window.clearInterval(timer);
  }, [reduced]);

  return (
    <section className="relative z-[2] flex min-h-[100svh] flex-col items-center justify-center px-6 pb-16 pt-24">
      <p className="mb-10 text-[11px] font-medium uppercase tracking-[0.38em] text-cyan-glow/70">
        A global experiment
      </p>

      <div className="currency-lock" aria-hidden={reduced ? undefined : true}>
        <div className="currency-slot">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={current.mark}
              className="currency-mark"
              initial={reduced ? false : { x: -92, skewX: -26, opacity: 0, filter: "blur(10px)" }}
              animate={{ x: 0, skewX: 0, opacity: 1, filter: "blur(0px)" }}
              exit={reduced ? undefined : { x: 78, skewX: 20, opacity: 0, filter: "blur(8px)" }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="currency-mark-ink">{current.mark}</span>
            </motion.span>
          </AnimatePresence>
          <span className="currency-streak" />
        </div>

        <span className="currency-dash" key={reduced ? "still" : current.mark} />

        <span className="currency-one">1</span>
      </div>

      <div className="mt-6 h-6 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={current.place}
            initial={reduced ? false : { y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? undefined : { y: -14, opacity: 0 }}
            transition={{ duration: 0.32 }}
            className="text-[11px] font-medium uppercase tracking-[0.42em] text-white/45"
          >
            {current.place}
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="sr-only">Currencies from around the world resolve to the same 1.</p>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.9 }}
        className="mt-10 max-w-md text-center font-display text-[1.35rem] font-medium leading-snug tracking-[-0.03em] text-white/88 sm:text-[1.7rem]"
      >
        Different currencies.
        <span className="currency-line"> The same 1.</span>
      </motion.p>

      <a href="#idea" className="idea-cue">
        The idea
      </a>
    </section>
  );
}
