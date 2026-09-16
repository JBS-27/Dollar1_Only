/** Additive holographic veil: fresnel, faint grid, coast light, traveling ripple. */

export const earthVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vObject;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vObject = normalize(position);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = cameraPosition - world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const earthFragment = /* glsl */ `
  uniform float uLife;
  uniform float uRipple;
  uniform vec3 uRippleOrigin;
  uniform sampler2D uLand;

  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vObject;
  varying vec2 vUv;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 view = normalize(vView);
    vec3 pos = normalize(vObject);

    float ndotv = clamp(dot(n, view), 0.0, 1.0);
    float fresnel = pow(1.0 - ndotv, 2.15);

    float lat = asin(clamp(pos.y, -1.0, 1.0));
    float lon = atan(pos.x, pos.z);
    float latLine = smoothstep(0.018, 0.003, abs(sin(lat * 6.0)));
    float lonLine = smoothstep(0.018, 0.003, abs(sin(lon * 6.0)));
    float grid = max(latLine, lonLine) * (0.07 + fresnel * 0.12);

    vec3 landSample = texture2D(uLand, vUv).rgb;
    float coast = smoothstep(0.28, 0.55, landSample.b) * step(0.22, landSample.g);
    float land = step(0.09, landSample.g);

    vec3 cyan = vec3(0.43, 0.965, 1.0);
    vec3 magenta = vec3(1.0, 0.416, 0.835);

    float ring = 0.0;
    float ring2 = 0.0;
    float wash = 0.0;
    if (uRipple > 0.001 && uRipple < 1.0) {
      float ang = acos(clamp(dot(pos, normalize(uRippleOrigin)), -1.0, 1.0));
      float wave = uRipple * 3.1416;
      ring = smoothstep(0.22, 0.0, abs(ang - wave)) * (1.0 - uRipple);
      ring2 = smoothstep(0.14, 0.0, abs(ang - wave * 0.78)) * (1.0 - uRipple);
      wash = smoothstep(wave + 0.18, wave - 0.05, ang) * (1.0 - uRipple) * 0.22;
    }

    vec3 color = fresnel * mix(cyan, magenta, fresnel * 0.5);
    color += grid * cyan * 0.55;
    color += coast * cyan * 0.42;
    color += land * cyan * 0.07;
    color += ring * cyan * 1.35;
    color += ring2 * magenta * 0.85;
    color += wash * cyan;
    color += uLife * 0.1 * cyan;

    float alpha = clamp(
      fresnel * 0.58 + grid * 0.45 + coast * 0.32 + ring * 1.0 + ring2 * 0.65 + wash,
      0.0,
      0.92
    );
    gl_FragColor = vec4(color, alpha);
  }
`;

export const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = cameraPosition - world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const atmosphereFragment = /* glsl */ `
  uniform float uLife;
  uniform float uBoost;
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 view = normalize(vView);
    float f = pow(1.0 - abs(dot(n, view)), 1.85);
    vec3 cyan = vec3(0.43, 0.965, 1.0);
    vec3 magenta = vec3(1.0, 0.416, 0.835);
    vec3 tone = mix(cyan, magenta, f * 0.38);
    float alpha = f * (0.38 + uLife * 0.52 + uBoost * 0.28);
    gl_FragColor = vec4(tone, alpha);
  }
`;
