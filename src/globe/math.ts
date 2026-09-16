import * as THREE from "three";

const EARTH_RADIUS = 1;

export function latLngToVector(lat: number, lng: number, radius = EARTH_RADIUS): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export function lifeFromTotal(total: number): number {
  return Math.min(1, total / 400);
}

/** Keep the full sphere + atmosphere inside the viewport with breathing room. */
export function fitGlobeCamera(camera: THREE.PerspectiveCamera, aspect: number, radius = 1.22): void {
  camera.aspect = aspect;
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const byHeight = radius / Math.tan(vFov / 2);
  const byWidth = radius / (Math.tan(vFov / 2) * Math.max(aspect, 0.55));
  camera.position.set(0, 0.02, Math.max(byHeight, byWidth) * 1.14);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

export function arcPoints(from: THREE.Vector3, to: THREE.Vector3, lift = 0.18, segments = 40): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const p = from.clone().lerp(to, t).normalize();
    const height = 1 + Math.sin(t * Math.PI) * lift;
    points.push(p.multiplyScalar(height));
  }
  return points;
}

export { EARTH_RADIUS };
