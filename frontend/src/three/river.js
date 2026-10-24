import * as THREE from "three";
import { WATER_Y, riverCenterZ, riverDistanceWorld } from "./forestTerrain";

const VERTEX = `
  uniform float uTime;
  attribute float aDepth;
  attribute vec2 aFlow;
  varying vec3 vWorld;
  varying float vDepth;
  varying vec2 vFlow;
  #include <fog_pars_vertex>

  void main() {
    vDepth = aDepth;
    vFlow = aFlow;
    vec3 pos = position;
    // gelombang kecil di bagian dalam, mati di tepi supaya garis air stabil
    float amp = smoothstep(0.0, 0.3, aDepth);
    pos.y += sin(dot(position.xz, vec2(1.3, 0.9)) - uTime * 1.6) * 0.012 * amp;
    vWorld = pos; // mesh di origin, posisi lokal = posisi dunia
    vec4 mvPosition = viewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const FRAGMENT = `
  uniform float uTime;
  uniform float uDaylight;
  uniform float uSunStrength;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uSkyTop;
  uniform vec3 uSkyHorizon;
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  varying vec3 vWorld;
  varying float vDepth;
  varying vec2 vFlow;
  #include <fog_pars_fragment>

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float hfun(vec2 q) {
    return vnoise(q) * 0.55 + vnoise(q * 2.1 + 7.3) * 0.3 + vnoise(q * 4.3 - 3.1) * 0.15;
  }

  // gradien riak untuk 1 fase; pola dipanjangkan searah arus
  vec2 layerGrad(float a, float b, float ph, float spd) {
    vec2 q = vec2((a - ph * 3.0 * spd) * 0.6, b * 1.5);
    float e = 0.07;
    float gx = hfun(q + vec2(e, 0.0)) - hfun(q - vec2(e, 0.0));
    float gy = hfun(q + vec2(0.0, e)) - hfun(q - vec2(0.0, e));
    return vec2(gx * 0.6, gy * 1.5) / (2.0 * e);
  }

  vec3 waterNormal(vec2 p, vec2 flow) {
    float spd = length(flow);
    vec2 d = flow / max(spd, 1e-4);
    vec2 pd = vec2(-d.y, d.x);
    float a = dot(p, d), b = dot(p, pd);
    // flow-map: 2 fase bergeser setengah siklus, saling memudar saat salah satunya "reset"
    float r0 = fract(uTime * 0.35);
    float r1 = fract(uTime * 0.35 + 0.5);
    float w0 = 1.0 - abs(2.0 * r0 - 1.0);
    vec2 g = w0 * layerGrad(a, b, r0, spd) + (1.0 - w0) * layerGrad(a, b, r1, spd);
    vec2 gw = g.x * d + g.y * pd;
    return normalize(vec3(-gw.x * 0.35, 1.0, -gw.y * 0.35));
  }

  float foamPattern(vec2 p, vec2 flow) {
    float spd = length(flow);
    vec2 d = flow / max(spd, 1e-4);
    vec2 pd = vec2(-d.y, d.x);
    float a = dot(p, d), b = dot(p, pd);
    float r0 = fract(uTime * 0.35);
    float r1 = fract(uTime * 0.35 + 0.5);
    float w0 = 1.0 - abs(2.0 * r0 - 1.0);
    float n0 = vnoise(vec2((a - r0 * 3.0 * spd) * 1.3, b * 3.2));
    float n1 = vnoise(vec2((a - r1 * 3.0 * spd) * 1.3, b * 3.2));
    return mix(n1, n0, w0);
  }

  void main() {
    vec3 V = normalize(cameraPosition - vWorld);
    vec3 L = normalize(uSunDir);
    float dist = length(cameraPosition - vWorld);

    vec3 N = waterNormal(vWorld.xz, vFlow);
    N = normalize(mix(N, vec3(0.0, 1.0, 0.0), smoothstep(40.0, 120.0, dist))); // jauh: halus, anti-aliasing

    float depth = vDepth;
    float clarity = exp(-depth * 2.2); // 1 = dangkal & bening

    vec3 col = mix(uDeep, uShallow, clarity);
    col *= 0.9 + 0.2 * hfun(vWorld.xz * 0.2); // variasi warna skala besar
    float light = mix(0.14, 1.0, uDaylight);
    col *= light * mix(vec3(0.55, 0.65, 1.0), vec3(1.0), uDaylight);

    float NdotV = max(dot(N, V), 0.0);
    float fres = 0.02 + 0.98 * pow(1.0 - NdotV, 5.0);
    vec3 R = reflect(-V, N);
    vec3 sky = mix(uSkyHorizon, uSkyTop, pow(clamp(R.y, 0.0, 1.0), 0.5));
    col = mix(col, sky, clamp(fres * 0.9 + 0.04, 0.0, 1.0));

    vec3 H = normalize(L + V);
    float NdotH = max(dot(N, H), 0.0);
    col += uSunColor * (pow(NdotH, 220.0) * 1.6 + pow(NdotH, 40.0) * 0.12) * uSunStrength;

    // buih di tepian
    float shore = 1.0 - smoothstep(0.0, 0.2, depth);
    float fp = foamPattern(vWorld.xz, vFlow);
    float foam = clamp(shore * smoothstep(0.35, 0.75, fp) * 1.4 + shore * 0.15, 0.0, 1.0);
    col = mix(col, vec3(0.95, 0.98, 1.0) * mix(0.2, 1.0, uDaylight), foam);

    float alpha = mix(0.5, 0.95, 1.0 - clarity);
    alpha = clamp(alpha + fres * 0.25, 0.0, 1.0);
    alpha = max(alpha, foam);
    alpha *= smoothstep(0.0, 0.06, depth); // tepi menyatu halus dengan tanah

    gl_FragColor = vec4(col, alpha);
    #include <fog_fragment>
  }
`;

/**
 * @param {function} heightSampler (x, z) => tinggi tanah dunia
 */
export function createRiver({
  heightSampler,
  length = 120,
  halfWidth = 11,
  alongSeg = 240,
  acrossSeg = 36,
}) {
  const vertCount = (alongSeg + 1) * (acrossSeg + 1);
  const positions = new Float32Array(vertCount * 3);
  const depths = new Float32Array(vertCount);
  const flows = new Float32Array(vertCount * 2);
  const smooth = THREE.MathUtils.smoothstep;

  let n = 0;
  for (let i = 0; i <= alongSeg; i++) {
    const x = -length / 2 + (length * i) / alongSeg;
    const zc = riverCenterZ(x);
    const slope = (riverCenterZ(x + 0.1) - riverCenterZ(x - 0.1)) / 0.2;
    const inv = 1 / Math.sqrt(1 + slope * slope);
    const tx = inv, tz = slope * inv;   // arah aliran (searah +x)
    const px = -tz, pz = tx;            // tegak lurus aliran

    for (let j = 0; j <= acrossSeg; j++) {
      const v = (j / acrossSeg) * 2 - 1;
      const wx = x + px * v * halfWidth;
      const wz = zc + pz * v * halfWidth;

      const h = heightSampler(wx, wz);
      const mask = 1 - smooth(riverDistanceWorld(wx, wz), 6.5, 9); // cegah genangan di luar koridor
      const depth = Math.max(0, WATER_Y - h) * mask;

      const speed = (0.3 + 0.7 * (1 - v * v)) * (0.5 + 0.5 * Math.min(1, depth / 0.8));

      positions.set([wx, WATER_Y, wz], n * 3);
      depths[n] = depth;
      flows[n * 2] = tx * speed;
      flows[n * 2 + 1] = tz * speed;
      n++;
    }
  }

  const indices = [];
  const row = acrossSeg + 1;
  for (let i = 0; i < alongSeg; i++) {
    for (let j = 0; j < acrossSeg; j++) {
      const a = i * row + j, b = (i + 1) * row + j;
      const c = a + 1, d = b + 1;
      indices.push(a, c, b, b, c, d); // menghadap ke atas
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aDepth", new THREE.BufferAttribute(depths, 1));
  geometry.setAttribute("aFlow", new THREE.BufferAttribute(flows, 2));
  geometry.setIndex(indices);

  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTime: { value: 0 },
      uDaylight: { value: 1 },
      uSunStrength: { value: 1 },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color(0xfff1d6) },
      uSkyTop: { value: new THREE.Color(0x6ea8ff) },
      uSkyHorizon: { value: new THREE.Color(0xeef0f3) },
      uShallow: { value: new THREE.Color(0x7fd6c8) },
      uDeep: { value: new THREE.Color(0x1f7f86) },
    },
  ]);

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    fog: true,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = -1; // digambar sebelum sprite api/awan, biar gak nimpa mereka
  mesh.frustumCulled = false;

  function update(elapsed, { sun, sky, daylight }) {
    uniforms.uTime.value = elapsed;
    uniforms.uSunDir.value.copy(sun.position).normalize();
    uniforms.uSunColor.value.copy(sun.color);
    uniforms.uSkyTop.value.copy(sky.material.uniforms.topColor.value);
    uniforms.uSkyHorizon.value.copy(sky.material.uniforms.bottomColor.value);
    uniforms.uDaylight.value = daylight;
    uniforms.uSunStrength.value = THREE.MathUtils.smoothstep(uniforms.uSunDir.value.y, 0, 0.25);
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
  }

  return { mesh, update, dispose };
}