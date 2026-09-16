import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { WHY_BODY } from "../data/philosophy";

export function WhySection() {
  const [open, setOpen] = useState(false);

  return (
    <section className="relative z-[2] mx-auto max-w-2xl px-6 pb-20">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between border-y border-white/10 py-4 text-left"
      >
        <span className="font-display text-sm font-medium tracking-[0.08em] text-white/70">Why $1 Only?</span>
        <span className="holo-text font-display text-lg">{open ? "−" : "+"}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 py-6 text-sm leading-relaxed text-white/55">
              {WHY_BODY.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
