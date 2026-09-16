import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState } from "react";
import { COUNTRIES } from "../data/countries";
import { api } from "../lib/api";
import { formatMoney } from "../lib/format";
import type { PublicConfig, SoulReceipt } from "../types";
import { FeeNote } from "./FeeNote";

type View = "home" | "upi";

type Props = {
  open: boolean;
  config: PublicConfig;
  onClose: () => void;
  onReceipt: (receipt: SoulReceipt) => void;
};

function upiUri(config: PublicConfig): string {
  const params = new URLSearchParams({
    pa: config.upiId,
    pn: config.upiName || "$1 Only",
    cu: "INR",
    tn: "$1 Only",
  });
  if (config.upiAmountInr) params.set("am", config.upiAmountInr);
  return `upi://pay?${params.toString()}`;
}

export function PaymentLayer({ open, config, onClose, onReceipt }: Props) {
  const [view, setView] = useState<View>("home");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState("IN");

  const payLabel = formatMoney(config.payAmount, config.currency);
  const qrValue = useMemo(() => (config.upiId ? upiUri(config) : ""), [config]);

  const startStripe = async () => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await api.checkout();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout is not ready yet.");
      setBusy(false);
    }
  };

  const confirmUpi = async () => {
    setBusy(true);
    setError(null);
    try {
      const receipt = await api.confirmUpi(country);
      onReceipt(receipt);
      setView("home");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record this $1 Only.");
    } finally {
      setBusy(false);
    }
  };

  const witnessDemo = async () => {
    setBusy(true);
    setError(null);
    try {
      const receipt = await api.demo(country);
      onReceipt(receipt);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo is disabled.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pay-title"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0 }}
            onClick={(event) => event.stopPropagation()}
            className="panel-holo w-full max-w-md rounded-3xl px-6 py-8"
          >
            <p className="text-center font-display text-5xl font-semibold holo-text dollar-glow">$1</p>
            <h2 id="pay-title" className="wordmark mt-4">
              <span className="wordmark-one !text-[1.7rem]">$1</span>
              <span className="wordmark-only !text-[1.45rem]"> Only</span>
            </h2>

            {view === "home" && (
              <>
                <FeeNote text={config.feeNote} className="mt-5" />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void startStripe()}
                  className="mt-8 w-full rounded-full bg-holo py-3.5 font-display text-sm font-semibold tracking-wide text-black shadow-holocore disabled:opacity-60"
                >
                  Continue with {payLabel}
                </button>
                <p className="mt-2 text-center text-[12px] text-white/40">
                  You pay {payLabel} → about ${config.netAmount} arrives after fees. Pure $1 Only.
                </p>

                {config.upiEnabled && (
                  <button
                    type="button"
                    onClick={() => setView("upi")}
                    className="mt-4 w-full rounded-full border border-cyan-glow/25 py-3 text-sm text-white/80 hover:border-cyan-glow/50"
                  >
                    Pay with UPI (India)
                  </button>
                )}

                {config.demoEnabled && (
                  <div className="mt-6 border-t border-white/5 pt-4">
                    <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-white/30">
                      Witness country (demo)
                    </label>
                    <select
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      className="mb-3 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
                    >
                      {COUNTRIES.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void witnessDemo()}
                      className="w-full text-xs uppercase tracking-[0.18em] text-white/35 hover:text-white/70"
                    >
                      Witness the globe (demo)
                    </button>
                  </div>
                )}
              </>
            )}

            {view === "upi" && (
              <div className="mt-4">
                <p className="text-center text-sm text-white/55">
                  Scan the $1 Only UPI mark. Amount is not editable here.
                </p>
                <div className="mx-auto mt-5 flex h-56 w-56 items-center justify-center rounded-2xl bg-white p-3">
                  {qrValue ? (
                    <QRCodeSVG value={qrValue} size={200} includeMargin={false} />
                  ) : (
                    <p className="text-center text-xs text-black/60">Add VITE_UPI_ID to enable the QR.</p>
                  )}
                </div>
                <p className="mt-4 text-center font-display text-sm tracking-wide text-white/80">
                  {config.upiId}
                </p>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(config.upiId)}
                  className="mx-auto mt-2 block text-[11px] uppercase tracking-[0.18em] text-white/35"
                >
                  Copy UPI ID
                </button>
                <label className="mt-5 block text-[11px] uppercase tracking-[0.18em] text-white/30">
                  Country for the globe
                </label>
                <select
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
                >
                  {COUNTRIES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void confirmUpi()}
                  className="mt-4 w-full rounded-full bg-holo py-3 font-display text-sm font-semibold text-black"
                >
                  I paid — awaken the globe
                </button>
                <button
                  type="button"
                  onClick={() => setView("home")}
                  className="mt-3 w-full text-xs uppercase tracking-[0.18em] text-white/35"
                >
                  Back
                </button>
              </div>
            )}

            {error && <p className="mt-4 text-center text-xs text-magenta-glow">{error}</p>}

            <button
              type="button"
              onClick={() => {
                setView("home");
                onClose();
              }}
              className="mt-6 w-full text-[11px] uppercase tracking-[0.2em] text-white/30"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
