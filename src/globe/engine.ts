import * as THREE from "three";
import type { CountryStat } from "../types";
import { COUNTRY_BY_CODE } from "../data/countries";
import { createDarkEarthTextures } from "./landTexture";
import { arcPoints, EARTH_RADIUS, fitGlobeCamera, latLngToVector, lifeFromTotal } from "./math";
import { atmosphereFragment, atmosphereVertex, earthFragment, earthVertex } from "./shaders";

export type GlobeEngine = {
  setCountries: (countries: CountryStat[]) => void;
  setTotal: (total: number) => void;
  setNamed: (codes: Set<string>) => void;
  pulse: (code: string) => void;
  destroy: () => void;
};

type Options = {
  onSelect: (code: string) => void;
  onHover: (code: string | null) => void;
};

type PinNode = {
  code: string;
  button: HTMLButtonElement;
  mark: HTMLSpanElement;
  nameEl: HTMLSpanElement;
  sparkle: HTMLSpanElement;
  position: THREE.Vector3;
  count: number;
};

type Thread = {
  line: THREE.Line;
  born: number;
};

const HIT = 28;
const THREAD_MS = 9000;

export function createGlobeEngine(host: HTMLElement, options: Options): GlobeEngine {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  renderer.domElement.className = "holo-globe-canvas";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  renderer.domElement.style.cursor = "grab";
  renderer.domElement.style.touchAction = "none";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 24);

  scene.add(new THREE.HemisphereLight(0x8ceeff, 0x06080c, 0.72));
  const key = new THREE.DirectionalLight(0xe7fbff, 1.85);
  key.position.set(2.6, 1.7, 2.4);
  scene.add(key);
  const rimLight = new THREE.DirectionalLight(0xff6ad5, 0.58);
  rimLight.position.set(-2.4, -0.2, 0.8);
  scene.add(rimLight);
  const fill = new THREE.DirectionalLight(0x6aa8c8, 0.28);
  fill.position.set(-1.1, 0.55, -2.1);
  scene.add(fill);

  const root = new THREE.Group();
  root.rotation.y = 0.7;
  root.rotation.x = 0.18;
  scene.add(root);

  const placeholder = new THREE.CanvasTexture(document.createElement("canvas"));
  const earthUniforms = {
    uTime: { value: 0 },
    uLife: { value: 0 },
    uRipple: { value: 0 },
    uRippleOrigin: { value: new THREE.Vector3(1, 0, 0) },
    uLand: { value: placeholder },
  };

  const globeGeo = new THREE.SphereGeometry(EARTH_RADIUS, 96, 72);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x8ea4b8,
    metalness: 0.22,
    roughness: 0.72,
    emissive: 0x071018,
    emissiveIntensity: 0.18,
  });
  const core = new THREE.Mesh(globeGeo, coreMat);
  root.add(core);

  void createDarkEarthTextures().then(({ color, bump }) => {
    coreMat.map = color;
    coreMat.bumpMap = bump;
    coreMat.bumpScale = 0.055;
    coreMat.color.set(0xffffff);
    coreMat.needsUpdate = true;
    earthUniforms.uLand.value = color;
  });

  const veil = new THREE.Mesh(
    globeGeo,
    new THREE.ShaderMaterial({
      uniforms: earthUniforms,
      vertexShader: earthVertex,
      fragmentShader: earthFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  veil.scale.setScalar(1.004);
  root.add(veil);

  const atmoUniforms = {
    uLife: { value: 0 },
    uBoost: { value: 0 },
  };
  const atmoMat = new THREE.ShaderMaterial({
    uniforms: atmoUniforms,
    vertexShader: atmosphereVertex,
    fragmentShader: atmosphereFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  });
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), atmoMat);
  atmosphere.scale.setScalar(1.07);
  root.add(atmosphere);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 36),
    new THREE.ShaderMaterial({
      uniforms: atmoUniforms,
      vertexShader: atmosphereVertex,
      fragmentShader: atmosphereFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    }),
  );
  halo.scale.setScalar(1.025);
  root.add(halo);

  const pinLayer = document.createElement("div");
  pinLayer.className = "holo-pin-layer";
  host.appendChild(pinLayer);

  const pins = new Map<string, PinNode>();
  const named = new Set<string>();
  let countries: CountryStat[] = [];
  let pulsing: string | null = null;
  let pulseUntil = 0;
  let hoverCode: string | null = null;

  const threads: Thread[] = [];
  const threadGroup = new THREE.Group();
  root.add(threadGroup);

  const sparkleGeo = new THREE.BufferGeometry();
  const sparkleMat = new THREE.PointsMaterial({
    color: 0x6ef6ff,
    size: 0.018,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
  root.add(sparkles);

  const drag = {
    active: false,
    lastX: 0,
    lastY: 0,
    velX: 0,
    velY: 0,
    moved: false,
  };

  const clock = new THREE.Clock();
  let raf = 0;
  let destroyed = false;

  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w < 2 || h < 2) return;
    fitGlobeCamera(camera, w / h);
    renderer.setSize(w, h, false);
  };

  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  const projected = new THREE.Vector3();

  function projectPin(position: THREE.Vector3): { x: number; y: number; visible: boolean } {
    projected.copy(position);
    root.localToWorld(projected);
    const camDir = camera.position.clone().normalize();
    const worldN = projected.clone().normalize();
    const facing = worldN.dot(camDir);
    projected.project(camera);
    const x = (projected.x * 0.5 + 0.5) * host.clientWidth;
    const y = (-projected.y * 0.5 + 0.5) * host.clientHeight;
    return { x, y, visible: facing > 0.05 && projected.z < 1 };
  }

  function ensurePin(country: CountryStat): PinNode {
    const existing = pins.get(country.code);
    if (existing) {
      existing.count = country.count;
      existing.position.copy(latLngToVector(country.lat, country.lng, 1.028));
      return existing;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dollar-pin";
    button.dataset.code = country.code;
    const aura = document.createElement("span");
    aura.className = "dollar-pin-aura";
    const mark = document.createElement("span");
    mark.className = "dollar-pin-mark";
    mark.textContent = "$1";
    const sparkle = document.createElement("span");
    sparkle.className = "dollar-pin-sparkle";
    const nameEl = document.createElement("span");
    nameEl.className = "dollar-pin-name";
    nameEl.textContent = country.name;
    button.append(aura, sparkle, mark, nameEl);
    pinLayer.appendChild(button);
    const node: PinNode = {
      code: country.code,
      button,
      mark,
      nameEl,
      sparkle,
      position: latLngToVector(country.lat, country.lng, 1.028),
      count: country.count,
    };
    pins.set(country.code, node);
    requestAnimationFrame(() => button.classList.add("is-born"));
    return node;
  }

  function rebuildSparkles(list: CountryStat[]) {
    const hot = list.filter((row) => row.count > 1);
    const count = hot.reduce((sum, row) => sum + Math.min(14, 4 + row.count), 0);
    const positions = new Float32Array(Math.max(count, 1) * 3);
    let i = 0;
    for (const row of hot) {
      const center = latLngToVector(row.lat, row.lng, 1.04);
      const n = Math.min(14, 4 + row.count);
      for (let s = 0; s < n; s += 1) {
        const jitter = new THREE.Vector3(
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.08,
        );
        const p = center.clone().add(jitter).normalize().multiplyScalar(1.04 + Math.random() * 0.03);
        positions[i] = p.x;
        positions[i + 1] = p.y;
        positions[i + 2] = p.z;
        i += 3;
      }
    }
    sparkleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    sparkleMat.opacity = hot.length ? 0.55 : 0;
  }

  function setCountries(next: CountryStat[]) {
    countries = next;
    const live = new Set(next.map((row) => row.code));
    for (const [code, pin] of pins) {
      if (!live.has(code)) {
        pin.button.remove();
        pins.delete(code);
      }
    }
    for (const country of next) ensurePin(country);
    rebuildSparkles(next);
  }

  function setTotal(total: number) {
    const life = lifeFromTotal(total);
    earthUniforms.uLife.value = life;
    atmoUniforms.uLife.value = life;
    atmosphere.scale.setScalar(1.07 + life * 0.055);
    halo.scale.setScalar(1.025 + life * 0.02);
  }

  function setNamed(codes: Set<string>) {
    named.clear();
    codes.forEach((code) => named.add(code));
  }

  function addThread(fromCode: string, toCode: string) {
    if (fromCode === toCode) return;
    const a = COUNTRY_BY_CODE[fromCode];
    const b = COUNTRY_BY_CODE[toCode];
    if (!a || !b) return;
    const curve = new THREE.BufferGeometry().setFromPoints(
      arcPoints(latLngToVector(a.lat, a.lng), latLngToVector(b.lat, b.lng)),
    );
    const line = new THREE.Line(
      curve,
      new THREE.LineBasicMaterial({
        color: 0x6ef6ff,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    threadGroup.add(line);
    threads.push({ line, born: performance.now() });
  }

  let lastPulseCode: string | null = null;

  function pulse(code: string) {
    const meta = COUNTRY_BY_CODE[code];
    if (meta) {
      earthUniforms.uRippleOrigin.value.copy(latLngToVector(meta.lat, meta.lng).normalize());
    }
    earthUniforms.uRipple.value = 0.001;
    atmoUniforms.uBoost.value = 1.35;
    pulsing = code;
    pulseUntil = performance.now() + 2200;
    if (lastPulseCode && lastPulseCode !== code) addThread(lastPulseCode, code);
    lastPulseCode = code;
  }

  function layoutPins() {
    const now = performance.now();
    for (const pin of pins.values()) {
      const { x, y, visible } = projectPin(pin.position);
      pin.button.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      pin.button.style.opacity = visible ? "1" : "0";
      pin.button.style.pointerEvents = "none";
      const hot = pin.count > 1;
      pin.button.classList.toggle("is-hot", hot);
      pin.button.classList.toggle("is-named", named.has(pin.code) || pin.count === 1);
      pin.button.classList.toggle("is-pulse", pulsing === pin.code && now < pulseUntil);
      pin.nameEl.style.display = visible ? "block" : "none";
    }
  }

  function tickThreads(now: number) {
    for (let i = threads.length - 1; i >= 0; i -= 1) {
      const thread = threads[i];
      const age = now - thread.born;
      const mat = thread.line.material as THREE.LineBasicMaterial;
      mat.opacity = Math.max(0, 0.42 * (1 - age / THREAD_MS));
      if (age > THREAD_MS) {
        threadGroup.remove(thread.line);
        thread.line.geometry.dispose();
        mat.dispose();
        threads.splice(i, 1);
      }
    }
  }

  function pinAt(clientX: number, clientY: number): string | null {
    const box = host.getBoundingClientRect();
    const x = clientX - box.left;
    const y = clientY - box.top;
    let best: { code: string; d: number } | null = null;
    for (const pin of pins.values()) {
      const p = projectPin(pin.position);
      if (!p.visible) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < HIT && (!best || d < best.d)) best = { code: pin.code, d };
    }
    return best?.code ?? null;
  }

  const frame = () => {
    if (destroyed) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    earthUniforms.uTime.value = t;

    if (earthUniforms.uRipple.value > 0) {
      earthUniforms.uRipple.value = Math.min(1, earthUniforms.uRipple.value + dt * 0.2);
      if (earthUniforms.uRipple.value >= 1) earthUniforms.uRipple.value = 0;
    }
    atmoUniforms.uBoost.value *= 0.96;

    if (!drag.active) {
      if (Math.abs(drag.velX) > 0.00025 || Math.abs(drag.velY) > 0.00025) {
        root.rotation.y += drag.velX;
        root.rotation.x = THREE.MathUtils.clamp(root.rotation.x + drag.velY, -0.9, 0.9);
        drag.velX *= 0.94;
        drag.velY *= 0.94;
      } else if (!reduced) {
        root.rotation.y += dt * 0.12;
      }
    }

    sparkleMat.opacity = countries.some((row) => row.count > 1)
      ? 0.35 + Math.sin(t * 3.2) * 0.12
      : 0;

    layoutPins();
    tickThreads(performance.now());
    renderer.render(scene, camera);
    raf = window.requestAnimationFrame(frame);
  };
  raf = window.requestAnimationFrame(frame);

  const onDown = (event: PointerEvent) => {
    drag.active = true;
    drag.moved = false;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.velX = 0;
    drag.velY = 0;
    renderer.domElement.style.cursor = "grabbing";
    renderer.domElement.setPointerCapture(event.pointerId);
  };

  const onMove = (event: PointerEvent) => {
    if (drag.active) {
      const dx = event.clientX - drag.lastX;
      const dy = event.clientY - drag.lastY;
      if (Math.hypot(dx, dy) > 3) drag.moved = true;
      const vx = dx * 0.005;
      const vy = dy * 0.0035;
      root.rotation.y += vx;
      root.rotation.x = THREE.MathUtils.clamp(root.rotation.x + vy, -0.9, 0.9);
      drag.velX = vx;
      drag.velY = vy;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      return;
    }
    const code = pinAt(event.clientX, event.clientY);
    if (code !== hoverCode) {
      hoverCode = code;
      options.onHover(code);
    }
  };

  const onUp = (event: PointerEvent) => {
    drag.active = false;
    renderer.domElement.style.cursor = "grab";
    if (!drag.moved) {
      const code = pinAt(event.clientX, event.clientY);
      if (code) options.onSelect(code);
    }
  };

  const onLeave = () => {
    if (!drag.active && hoverCode) {
      hoverCode = null;
      options.onHover(null);
    }
  };

  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointermove", onMove);
  renderer.domElement.addEventListener("pointerup", onUp);
  renderer.domElement.addEventListener("pointercancel", onUp);
  renderer.domElement.addEventListener("pointerleave", onLeave);

  return {
    setCountries,
    setTotal,
    setNamed,
    pulse,
    destroy() {
      destroyed = true;
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointercancel", onUp);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
      pins.forEach((pin) => pin.button.remove());
      pins.clear();
      pinLayer.remove();
      globeGeo.dispose();
      placeholder.dispose();
      coreMat.map?.dispose();
      if (coreMat.bumpMap && coreMat.bumpMap !== coreMat.map) coreMat.bumpMap.dispose();
      coreMat.dispose();
      (veil.material as THREE.Material).dispose();
      atmosphere.geometry.dispose();
      atmoMat.dispose();
      halo.geometry.dispose();
      (halo.material as THREE.Material).dispose();
      sparkleGeo.dispose();
      sparkleMat.dispose();
      threads.forEach((thread) => {
        thread.line.geometry.dispose();
        (thread.line.material as THREE.Material).dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
