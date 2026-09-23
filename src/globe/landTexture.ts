import * as THREE from "three";

const WIDTH = 2048;
const HEIGHT = 1024;
const TOPOLOGY = "/earth-topology.png";

/** Equirectangular blobs so continents still read if the topology image never loads. */
const FALLBACK_LAND: Array<{ x: number; y: number; rx: number; ry: number }> = [
  { x: 0.24, y: 0.32, rx: 0.16, ry: 0.14 }, // North America
  { x: 0.3, y: 0.62, rx: 0.08, ry: 0.16 }, // South America
  { x: 0.52, y: 0.48, rx: 0.1, ry: 0.18 }, // Africa
  { x: 0.62, y: 0.3, rx: 0.22, ry: 0.12 }, // Eurasia
  { x: 0.72, y: 0.42, rx: 0.08, ry: 0.08 }, // India / SE Asia
  { x: 0.82, y: 0.68, rx: 0.07, ry: 0.06 }, // Australia
  { x: 0.5, y: 0.92, rx: 0.42, ry: 0.08 }, // Antarctica
  { x: 0.38, y: 0.18, rx: 0.05, ry: 0.06 }, // Greenland
];

function paintFallback(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "#05070c";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#1a2a3c";
  for (const land of FALLBACK_LAND) {
    ctx.beginPath();
    ctx.ellipse(land.x * WIDTH, land.y * HEIGHT, land.rx * WIDTH, land.ry * HEIGHT, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintFromTopology(source: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.drawImage(source, 0, 0, WIDTH, HEIGHT);
  const image = ctx.getImageData(0, 0, WIDTH, HEIGHT);
  const { data } = image;

  for (let i = 0; i < data.length; i += 4) {
    const height = data[i];
    const land = height > 28;
    if (!land) {
      data[i] = 4;
      data[i + 1] = 6;
      data[i + 2] = 10;
      continue;
    }
    const lift = Math.min(1, (height - 28) / 180);
    data[i] = Math.round(58 + lift * 46);
    data[i + 1] = Math.round(86 + lift * 58);
    data[i + 2] = Math.round(112 + lift * 62);
  }

  // Thicker luminous coasts so continents stay readable at globe scale.
  const copy = new Uint8ClampedArray(data);
  const isLand = (x: number, y: number) => copy[(y * WIDTH + ((x + WIDTH) % WIDTH)) * 4 + 2] > 40;
  for (let y = 3; y < HEIGHT - 3; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (!isLand(x, y)) continue;
      const inland =
        isLand(x - 3, y) && isLand(x + 3, y) && isLand(x, y - 3) && isLand(x, y + 3);
      if (inland) continue;
      const i = (y * WIDTH + x) * 4;
      data[i] = 150;
      data[i + 1] = 232;
      data[i + 2] = 246;
    }
  }

  ctx.putImageData(image, 0, 0);
  return canvas;
}

export async function createDarkEarthTextures(): Promise<{
  color: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
}> {
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = WIDTH;
  colorCanvas.height = HEIGHT;
  const ctx = colorCanvas.getContext("2d");
  if (ctx) paintFallback(ctx);

  try {
    const image = await loadImage(TOPOLOGY);
    const painted = paintFromTopology(image);
    const dest = colorCanvas.getContext("2d");
    dest?.drawImage(painted, 0, 0);
  } catch {
    /* fallback continents already painted */
  }

  const color = new THREE.CanvasTexture(colorCanvas);
  color.colorSpace = THREE.SRGBColorSpace;
  color.anisotropy = 8;
  color.needsUpdate = true;

  const bump = color.clone();
  bump.colorSpace = THREE.NoColorSpace;
  return { color, bump };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("land texture failed"));
    image.src = src;
  });
}
