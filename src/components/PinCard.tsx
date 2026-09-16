import { AnimatePresence, motion } from "framer-motion";
import { lineForCountry } from "../data/philosophy";
import { formatCount } from "../lib/format";

type Props = {
  countryName: string;
  countryCode: string;
  count: number;
  onClose: () => void;
};

export function PinCard({ countryName, countryCode, count, onClose }: Props) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className="panel-holo w-[min(92vw,360px)] rounded-2xl px-6 py-5 text-center"
      >
        <p className="font-display text-2xl font-semibold holo-text">$1</p>
        <p className="mt-3 text-sm leading-relaxed text-white/80">
          <span className="holo-text font-display font-semibold">{formatCount(count)}</span>
          {count === 1 ? " soul from " : " souls from "}
          <span className="text-white">{countryName}</span>
          {" chose $1 Only"}
        </p>
        <p className="mt-3 text-xs italic text-white/40">{lineForCountry(countryCode)}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 text-[11px] uppercase tracking-[0.2em] text-white/35 hover:text-white/70"
        >
          Close
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
