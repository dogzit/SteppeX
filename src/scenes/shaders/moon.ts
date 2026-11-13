export const moonVert = /* glsl */ `
varying vec3 vNormal; varying vec2 vUv; varying vec3 vWorldPos;
void main() {
  vUv = uv; vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0); vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

export const moonFrag = /* glsl */ `
uniform sampler2D uColor; uniform sampler2D uNormal;
uniform vec3 uSunDir; uniform vec3 uEarthDir; uniform float uEarthPhase;
uniform float uGrid; uniform float uNormalStrength; uniform float uExposure;
varying vec3 vNormal; varying vec2 vUv; varying vec3 vWorldPos;

float gridLine(float coord, float stepDeg) {
  float d = coord / stepDeg; float f = abs(fract(d - 0.5) - 0.5) / fwidth(d);
  return 1.0 - smoothstep(0.0, 1.2, f);
}
void main() {
  vec3 albedo = texture2D(uColor, vUv).rgb;
  vec3 N = normalize(vNormal);
  vec3 T = normalize(cross(vec3(0.0, 1.0, 0.0), N)); vec3 B = cross(N, T);
  vec3 nm = texture2D(uNormal, vUv).xyz * 2.0 - 1.0; nm.xy *= uNormalStrength;
  vec3 n = normalize(T * nm.x + B * nm.y + N * nm.z);

  // Geometric day/night with a soft (~1°) terminator: the Sun is a 0.53° disc.
  float macro = smoothstep(-0.012, 0.012, dot(N, uSunDir));
  float diffuse = max(dot(n, uSunDir), 0.0);
  // Lunar-like backscatter: brighten toward full phase (viewer near Sun direction).
  vec3 V = normalize(cameraPosition - vWorldPos);
  float back = 0.85 + 0.35 * pow(max(dot(V, uSunDir), 0.0), 3.0);
  vec3 sun = albedo * diffuse * macro * back * 1.35;

  // Earthshine (very faint, blue-ish) and a floor so the night side stays legible.
  float es = max(dot(N, uEarthDir), 0.0) * uEarthPhase;
  vec3 night = albedo * (0.028 + 0.05 * es) * vec3(0.55, 0.68, 0.9) * max(dot(n, N), 0.0);

  vec3 col = (sun + night) * uExposure;
  // Thin selenographic grid every 15°, amber-tinted at the equator and prime meridian.
  if (uGrid > 0.5) {
    float lon = vUv.x * 360.0 - 180.0, lat = vUv.y * 180.0 - 90.0;
    float g = max(gridLine(lon, 15.0), gridLine(lat, 15.0)) * 0.22;
    float major = max(gridLine(lon, 180.0), gridLine(lat, 180.0)) * 0.35;
    col += vec3(0.75, 0.82, 0.95) * g + vec3(1.0, 0.7, 0.3) * major;
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const rimVert = /* glsl */ `
varying vec3 vNormal; varying vec3 vWorldPos;
void main() { vNormal = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vWorldPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
export const rimFrag = /* glsl */ `
uniform vec3 uSunDir; varying vec3 vNormal; varying vec3 vWorldPos;
void main() {
  vec3 V = normalize(cameraPosition - vWorldPos); vec3 N = normalize(vNormal);
  float rim = pow(1.0 - max(dot(V, N), 0.0), 3.5);
  float lit = smoothstep(-0.3, 0.6, dot(N, uSunDir));
  vec3 c = mix(vec3(0.35, 0.55, 0.9), vec3(1.0, 0.78, 0.45), lit);
  gl_FragColor = vec4(c, rim * (0.05 + 0.17 * lit));
  #include <colorspace_fragment>
}`;

export const starsVert = /* glsl */ `varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
export const starsFrag = /* glsl */ `
varying vec3 vDir;
float hash(vec3 p) { p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec3 d = normalize(vDir);
  vec3 col = vec3(0.0);
  // Three star layers at different cell densities; star only if hash passes a threshold.
  for (int i = 0; i < 3; i++) {
    float scale = 90.0 + 70.0 * float(i);
    vec3 cell = floor(d * scale); vec3 f = fract(d * scale) - 0.5;
    float h = hash(cell);
    if (h > 0.985 - 0.004 * float(i)) {
      vec3 off = vec3(hash(cell + 1.7), hash(cell + 3.1), hash(cell + 5.3)) - 0.5;
      float r = length(f - off * 0.6);
      float mag = hash(cell + 9.0);
      float star = smoothstep(0.08 + 0.1 * mag, 0.0, r) * (0.35 + 1.6 * mag * mag);
      vec3 tint = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.9, 0.75), hash(cell + 11.0));
      col += tint * star;
    }
  }
  // Faint galactic band (decorative, not a star catalogue).
  float band = exp(-pow(d.y * 0.65 + d.x * 0.35, 2.0) * 22.0) * 0.045;
  col += vec3(0.6, 0.7, 0.9) * band;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
