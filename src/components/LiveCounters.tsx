import { motion } from "framer-motion";
import { formatCount } from "../lib/format";

type Props = {
  total: number;
  countries: number;
};

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[132px] text-center">
      <motion.p
        key={value}
        initial={{ opacity: 0.4, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-[2rem] font-semibold tracking-[-0.04em] holo-text dollar-glow sm:text-[2.4rem]"
      >
        {formatCount(value)}
      </motion.p>
      <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">{label}</p>
    </div>
  );
}

export function LiveCounters({ total, countries }: Props) {
  return (
    <div className="mt-10 flex flex-wrap items-start justify-center gap-8 sm:gap-12">
      <Cell label="Participations" value={total} />
      <div className="hidden h-11 w-px bg-gradient-to-b from-transparent via-cyan-glow/35 to-transparent sm:block" />
      <Cell label="Countries awakened" value={countries} />
    </div>
  );
}
