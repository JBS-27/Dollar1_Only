import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { downloadCanvas, paintSoulReceipt } from "../lib/receiptArt";
import { formatMoney, formatWhen } from "../lib/format";
import type { PublicConfig, SoulReceipt as Receipt } from "../types";

type Props = {
  receipt: Receipt | null;
  config: PublicConfig;
  onClose: () => void;
};

export function SoulReceipt({ receipt, config, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!receipt || !canvasRef.current) return;
    paintSoulReceipt(canvasRef.current, {
      receiptHash: receipt.receiptHash,
      countryName: receipt.countryName,
      createdAt: formatWhen(receipt.createdAt),
      payLabel: `Paid ${formatMoney(config.payAmount, config.currency)} · ~$${config.netAmount} received`,
    });
  }, [receipt, config]);

  return (
    <AnimatePresence>
      {receipt && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            onClick={(event) => event.stopPropagation()}
            className="panel-holo max-h-[92vh] w-full max-w-lg overflow-auto rounded-3xl p-5"
          >
            <p className="text-center text-[11px] uppercase tracking-[0.28em] text-white/40">
              $1 Only Soul Receipt
            </p>
            <canvas ref={canvasRef} className="mt-4 w-full rounded-2xl" />
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  if (canvasRef.current && receipt) {
                    downloadCanvas(canvasRef.current, `one-dollar-only-${receipt.receiptHash}.png`);
                  }
                }}
                className="flex-1 rounded-full bg-holo py-3 font-display text-sm font-semibold text-black"
              >
                Keep this $1
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-white/15 py-3 text-sm text-white/70"
              >
                Return to the globe
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
