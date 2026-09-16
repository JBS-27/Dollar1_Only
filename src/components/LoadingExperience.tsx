import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

type Props = {
  show: boolean;
  onDone: () => void;
};

export function LoadingExperience({ show, onDone }: Props) {
  useEffect(() => {
    if (!show) return;
    const timer = window.setTimeout(onDone, 2200);
    return () => window.clearTimeout(timer);
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.72, filter: "blur(16px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <p className="font-display text-[22vw] font-semibold leading-none tracking-[-0.07em] dollar-glow sm:text-[7rem] holo-text">
              $1
            </p>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="wordmark mt-4"
            >
              <span className="wordmark-one !text-2xl">$1</span>
              <span className="wordmark-only !text-[1.35rem]"> Only</span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
