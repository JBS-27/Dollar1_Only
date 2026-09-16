import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { cn } from "../lib/cn";

type Burst = {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  cyan: boolean;
  size: number;
};

type Props = {
  onOpen: () => void;
  className?: string;
};

export function GlowingOne({ onOpen, className }: Props) {
  const reduced = usePrefersReducedMotion();
  const controls = useAnimationControls();
  const [hovered, setHovered] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstId = useRef(0);

  const fracture = (count: number) => {
    if (reduced) return;
    const next: Burst[] = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 52 + Math.random() * 110;
      return {
        id: (burstId.current += 1),
        x: 0,
        y: 0,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        cyan: Math.random() > 0.4,
        size: 3 + Math.random() * 5,
      };
    });
    setBursts(next);
    window.setTimeout(() => setBursts([]), 980);
  };

  useEffect(() => {
    if (hovered) fracture(48);
  }, [hovered]);

  const open = () => {
    fracture(64);
    onOpen();
    if (!reduced) {
      void controls.start({
        scale: [1, 1.12, 1],
        transition: { duration: 0.48, times: [0, 0.38, 1] },
      });
    }
  };

  return (
    <button
      type="button"
      aria-label="Open $1 Only payment"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={() => void open()}
      className={cn(
        "group relative isolate flex h-[46vw] max-h-[300px] min-h-[196px] w-[46vw] min-w-[196px] max-w-[300px] items-center justify-center",
        "rounded-full outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow/50",
        className,
      )}
    >
      <span className="orb-pulse pointer-events-none absolute inset-[-22%] rounded-full bg-[radial-gradient(circle,rgba(110,246,255,0.28),rgba(255,106,213,0.12)_46%,transparent_72%)]" />
      <span className="orb-pulse-slow pointer-events-none absolute inset-[-8%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.16),rgba(110,246,255,0.1)_40%,transparent_70%)] blur-2xl" />

      {bursts.map((burst) => (
        <motion.span
          key={burst.id}
          className="pointer-events-none absolute rounded-full"
          style={{
            width: burst.size,
            height: burst.size,
            background: burst.cyan ? "#6ef6ff" : "#ff6ad5",
            boxShadow: `0 0 14px ${burst.cyan ? "#6ef6ff" : "#ff6ad5"}`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: burst.tx, y: burst.ty, opacity: 0, scale: 0.15 }}
          transition={{ duration: 0.88, ease: "easeOut" }}
        />
      ))}

      <motion.span
        animate={controls}
        whileHover={reduced ? undefined : { scale: 1.08 }}
        className="relative z-10 select-none font-display text-[24vw] font-semibold leading-none tracking-[-0.07em] dollar-glow sm:text-[9rem]"
        style={{
          backgroundImage: "linear-gradient(120deg, #6ef6ff 0%, #f7ffff 44%, #ff6ad5 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        $1
      </motion.span>
    </button>
  );
}
