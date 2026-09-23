import { useEffect, useState } from "react";
import { AmbientToggle } from "./components/AmbientToggle";
import { Footer } from "./components/Footer";
import { CurrencyLock } from "./components/CurrencyLock";
import { Hero } from "./components/Hero";
import { IdeaStrip } from "./components/IdeaStrip";
import { ParticleField } from "./components/ParticleField";
import LivingGlobe from "./components/LivingGlobe";
import { LoadingExperience } from "./components/LoadingExperience";
import { PaymentLayer } from "./components/PaymentLayer";
import { SoulReceipt } from "./components/SoulReceipt";
import { WhySection } from "./components/WhySection";
import { useAmbientSound } from "./hooks/useAmbientSound";
import { useLiveSignals } from "./hooks/useLiveSignals";
import { usePublicConfig } from "./hooks/usePublicConfig";
import { api } from "./lib/api";
import type { SoulReceipt as Receipt } from "./types";

export default function App() {
  const live = useLiveSignals();
  const config = usePublicConfig();
  const sound = useAmbientSound(live.latest?.at ?? null);
  const [booting, setBooting] = useState(() => {
    if (typeof window === "undefined") return true;
    return new URLSearchParams(window.location.search).get("boot") !== "0";
  });
  const [payOpen, setPayOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const takeReceipt = (next: Receipt) => {
    live.ingest(next);
    setReceipt(next);
  };

  useEffect(() => {
    const wantsEarth =
      window.location.hash === "#earth" ||
      new URLSearchParams(window.location.search).get("section") === "earth";
    if (!wantsEarth) return;
    const jump = () => {
      const node = document.getElementById("earth");
      if (!node) return false;
      const top = node.getBoundingClientRect().top;
      if (Math.abs(top) > 24) {
        window.scrollTo({ top: window.scrollY + top, behavior: "auto" });
      }
      return Math.abs(node.getBoundingClientRect().top) <= 24;
    };
    const timer = window.setInterval(() => {
      if (jump()) window.clearInterval(timer);
    }, 80);
    return () => window.clearInterval(timer);
  }, [live.ready]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPayOpen(false);
      setReceipt(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("soul");
    const hash = params.get("r");
    if (!sessionId && !hash) return;

    void api
      .receipt({ sessionId: sessionId ?? undefined, hash: hash ?? undefined })
      .then((next) => {
        setReceipt(next);
        void live.refresh(next);
        const clean = new URL(window.location.href);
        clean.searchParams.delete("soul");
        clean.searchParams.delete("cancelled");
        clean.searchParams.set("r", next.receiptHash);
        window.history.replaceState({}, "", clean);
      })
      .catch(() => {
        /* Stripe return without a recorded signal yet — webhook may still be in flight */
      });
  }, []);

  return (
    <div className="relative min-h-screen bg-black">
      <ParticleField />
      <LoadingExperience show={booting} onDone={() => setBooting(false)} />
      <CurrencyLock />
      <IdeaStrip />
      <Hero
        total={live.total}
        countries={live.countriesAwakened}
        onOpenPayment={() => setPayOpen(true)}
      />
      <LivingGlobe countries={live.countries} latest={live.latest} total={live.total} />
      <WhySection />
      <Footer />
      <AmbientToggle muted={sound.muted} onToggle={sound.toggle} />
      <PaymentLayer
        open={payOpen}
        config={config}
        onClose={() => setPayOpen(false)}
        onReceipt={takeReceipt}
      />
      <SoulReceipt receipt={receipt} config={config} onClose={() => setReceipt(null)} />
    </div>
  );
}
