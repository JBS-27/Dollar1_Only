import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

type Star = {
  x: number;
  y: number;
  r: number;
  s: number;
  a: number;
  tw: number;
  cyan: boolean;
};

/** Slow cosmic field behind the whole installation — not a game HUD. */
export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduced) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let stars: Star[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      const count = Math.round((canvas.offsetWidth * canvas.offsetHeight) / 14000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        r: 0.35 + Math.random() * 1.35,
        s: 0.016 + Math.random() * 0.05,
        a: 0.12 + Math.random() * 0.5,
        tw: Math.random() * Math.PI * 2,
        cyan: Math.random() > 0.38,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      for (const star of stars) {
        star.y -= star.s;
        star.tw += 0.012;
        if (star.y < -4) {
          star.y = canvas.offsetHeight + 4;
          star.x = Math.random() * canvas.offsetWidth;
        }
        const flicker = star.a * (0.55 + Math.sin(star.tw) * 0.45);
        ctx.beginPath();
        ctx.fillStyle = star.cyan
          ? `rgba(110, 246, 255, ${flicker})`
          : `rgba(255, 106, 213, ${flicker * 0.85})`;
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reduced]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[1] h-full w-full"
      aria-hidden="true"
    />
  );
}
