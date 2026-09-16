/** Deterministic constellation from a soul hash — the receipt is the $1, rewritten. */

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromHash(hash: string): number {
  return Number.parseInt(hash.replace(/[^0-9a-f]/gi, "").slice(0, 8) || "1", 16);
}

export function paintSoulReceipt(
  canvas: HTMLCanvasElement,
  opts: {
    receiptHash: string;
    countryName: string;
    createdAt: string;
    payLabel: string;
  },
): void {
  const width = 1080;
  const height = 1350;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const rng = mulberry32(seedFromHash(opts.receiptHash));

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  const radial = ctx.createRadialGradient(width * 0.5, height * 0.42, 20, width * 0.5, height * 0.42, 520);
  radial.addColorStop(0, "rgba(110, 246, 255, 0.22)");
  radial.addColorStop(0.45, "rgba(255, 106, 213, 0.1)");
  radial.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, width, height);

  const stars = Array.from({ length: 90 + Math.floor(rng() * 40) }, () => ({
    x: rng() * width,
    y: rng() * height,
    r: 0.4 + rng() * 1.8,
    a: 0.15 + rng() * 0.7,
    cyan: rng() > 0.45,
  }));

  for (const star of stars) {
    ctx.beginPath();
    ctx.fillStyle = star.cyan
      ? `rgba(110, 246, 255, ${star.a})`
      : `rgba(255, 106, 213, ${star.a})`;
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const nodes = stars.slice(0, 18);
  ctx.lineWidth = 0.7;
  for (let i = 0; i < nodes.length; i += 1) {
    const a = nodes[i];
    const b = nodes[(i + 3) % nodes.length];
    ctx.strokeStyle = i % 2 === 0 ? "rgba(110, 246, 255, 0.18)" : "rgba(255, 106, 213, 0.16)";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  for (let i = 0; i < 4; i += 1) {
    const radius = 150 + i * 70 + rng() * 12;
    ctx.beginPath();
    ctx.strokeStyle = i % 2 === 0 ? "rgba(110, 246, 255, 0.16)" : "rgba(255, 106, 213, 0.12)";
    ctx.lineWidth = 1;
    ctx.arc(width / 2, height * 0.42, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#f4feff";
  ctx.shadowColor = "rgba(110, 246, 255, 0.8)";
  ctx.shadowBlur = 28;
  ctx.font = "600 220px Sora, sans-serif";
  ctx.fillText("$1", width / 2, height * 0.46);
  ctx.shadowBlur = 0;

  ctx.font = "600 42px Sora, sans-serif";
  ctx.fillStyle = "rgba(244, 254, 255, 0.92)";
  ctx.fillText("$1 Only", width / 2, height * 0.56);

  ctx.font = "500 26px Manrope, sans-serif";
  ctx.fillStyle = "rgba(232, 238, 242, 0.7)";
  ctx.fillText("Soul Receipt", width / 2, height * 0.61);

  ctx.font = "500 22px Manrope, sans-serif";
  ctx.fillStyle = "rgba(232, 238, 242, 0.62)";
  ctx.fillText(opts.countryName, width / 2, height * 0.72);
  ctx.fillText(opts.createdAt, width / 2, height * 0.755);
  ctx.fillText(opts.payLabel, width / 2, height * 0.79);

  ctx.font = "500 18px Manrope, sans-serif";
  ctx.fillStyle = "rgba(110, 246, 255, 0.7)";
  ctx.fillText(opts.receiptHash, width / 2, height * 0.88);

  ctx.font = "500 18px Manrope, sans-serif";
  ctx.fillStyle = "rgba(232, 238, 242, 0.4)";
  ctx.fillText("The smallest equal act. Nothing more.", width / 2, height * 0.93);
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
}
