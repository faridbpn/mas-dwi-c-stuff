import * as THREE from "three";

export const PLAZA_RADIUS = 9;
export const RIVER_BED_Y = -1.6;
export const WATER_Y = -0.75;
export const FAR_GRASS = new THREE.Color(0x5a9a42);

const BLEND_RADIUS = 17; // plaza -> bukit
const EDGE_START = 32; // di luar ini tanah turun ke dataran rendah
const EDGE_END = 46;
const CLIFF_EDGE = 1.6; // makin kecil makin tegak tebingnya
const MAX_WALK_SLOPE = 0.9;
const MAX_WALK_RADIUS = 34;

const MESAS = [
  { x: 30, z: 6, r: 6, top: 6.5, seed: 1, ramp: true, rampLen: 12 }, // bisa didaki
  { x: -36, z: 6, r: 8, top: 8, seed: 2 },
  { x: 14, z: 38, r: 7, top: 6.5, seed: 3 },
  { x: -8, z: -46, r: 8, top: 9, seed: 4 }, // di seberang sungai
].map((m) => ({
  ...m,
  toPlaza: Math.atan2(-m.z, -m.x),
  reach: m.r * 1.4 + Math.max(CLIFF_EDGE, m.rampLen ?? 0),
}));

const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

// noise
function hash2(ix, iz) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function noise2(x, z) {
  const ix = Math.floor(x),
    iz = Math.floor(z);
  const fx = x - ix,
    fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz),
    b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1),
    d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm(x, z, octaves = 4) {
  let v = 0,
    amp = 0.5,
    f = 1,
    norm = 0;
  for (let i = 0; i < octaves; i++) {
    v += amp * noise2(x * f + i * 17.3, z * f - i * 9.1);
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return v / norm;
}

// sungai
function riverCenterZ(x) {
  return -23 + 4.5 * Math.sin(x * 0.11 + 0.8) + 2.0 * Math.sin(x * 0.27 + 2.0);
}

// jarak tegak lurus ke garis tengah sungai
export function riverDistanceWorld(x, z) {
  const s =
    4.5 * 0.11 * Math.cos(x * 0.11 + 0.8) +
    2.0 * 0.27 * Math.cos(x * 0.27 + 2.0);
  return Math.abs(z - riverCenterZ(x)) / Math.sqrt(1 + s * s);
}

// tinggi tanah
export function heightAtWorld(x, z) {
  const dist = Math.hypot(x, z);

  // bukit bergelombang
  let h = (fbm(x * 0.045 + 11, z * 0.045 - 7, 4) - 0.5) * 2 * 5.5;
  h += (fbm(x * 0.16, z * 0.16, 3) - 0.5) * 0.9;
  const rise = smoothstep(PLAZA_RADIUS + 2, 30, dist);
  h = h * (0.4 + 0.6 * rise) + rise * 2.2;
  if (h < -0.3) h = -0.3 + (h + 0.3) * 0.25; // cekungan dangkal, yang dalam cuma sungai
  h = lerp(h, 0, smoothstep(EDGE_START, EDGE_END, dist)); // dataran rendah di tepi

  // mesa (dataran tinggi bertebing)
  for (const m of MESAS) {
    const dx = x - m.x,
      dz = z - m.z;
    const md = Math.hypot(dx, dz);
    if (md > m.reach) continue;

    const ang = Math.atan2(dz, dx);
    const wobble = fbm(
      Math.cos(ang) * 1.3 + m.seed * 11.7,
      Math.sin(ang) * 1.3 + m.seed * 5.3,
      3,
    );
    const R = m.r * (1 + (wobble - 0.5) * 0.7);

    let edge = CLIFF_EDGE;
    if (m.ramp) {
      const diff = Math.atan2(
        Math.sin(ang - m.toPlaza),
        Math.cos(ang - m.toPlaza),
      );
      edge = lerp(CLIFF_EDGE, m.rampLen, smoothstep(1.0, 0, Math.abs(diff)));
    }

    const fall = smoothstep(R + edge, R, md);
    if (fall <= 0) continue;
    const top = m.top + (fbm(x * 0.16 + m.seed * 9, z * 0.16, 3) - 0.5) * 0.9;
    h += (top - h) * fall;
  }

  // lembah sungai
  const bank =
    (1 - smoothstep(2.0, 9.0, riverDistanceWorld(x, z))) *
    (1 - smoothstep(36, 50, dist));
  if (bank > 0) h += (Math.min(h, RIVER_BED_Y) - h) * bank;

  return h * smoothstep(PLAZA_RADIUS, BLEND_RADIUS, dist);
}

export function slopeAtWorld(x, z, e = 0.6) {
  const dx = heightAtWorld(x + e, z) - heightAtWorld(x - e, z);
  const dz = heightAtWorld(x, z + e) - heightAtWorld(x, z - e);
  return Math.hypot(dx, dz) / (2 * e);
}

export function isWalkableWorld(x, z) {
  if (Math.hypot(x, z) > MAX_WALK_RADIUS) return false;
  return slopeAtWorld(x, z) < MAX_WALK_RADIUS;
}

// mesh
const GRASS_LOW = new THREE.Color(0x4a8f3c);
const GRASS_HIGH = new THREE.Color(0x9ccc52);
const ROCK_LIGHT = new THREE.Color(0x9a8f80);
const ROCK_DARK = new THREE.Color(0x6b6258);
const SAND = new THREE.Color(0xd9c690);

export function createForestTerrain({ size = 120, segments = 150 } = {}) {
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  const pos = geometry.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, heightAtWorld(pos.getX(i), -pos.getY(i)));
  }
  geometry.computeVertexNormals();

  const normals = geometry.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const rock = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const wz = -pos.getY(i);
    const h = pos.getZ(i);
    const slope = 1 - normals.getZ(i); // 0 = rata, makin besar makin curam

    const t = clamp((h + 0.5) / 7, 0, 1);
    const patch = fbm(x * 0.11 + 30, wz * 0.11 - 20, 3);
    c.copy(GRASS_LOW).lerp(
      GRASS_HIGH,
      clamp(t * 0.7 + (patch - 0.5) * 1.4, 0, 1),
    );

    const rockAmt = smoothstep(0.08, 0.3, slope);
    rock.copy(ROCK_DARK).lerp(ROCK_LIGHT, fbm(x * 0.4, wz * 0.4, 2));
    c.lerp(rock, rockAmt);

    const sandAmt = smoothstep(-0.2, -1.2, h);
    c.lerp(SAND, sandAmt * (1 - rockAmt * 0.6));

    const edge = Math.max(Math.abs(x), Math.abs(wz)); // terrain-nya persegi
    c.lerp(FAR_GRASS, smoothstep(40, 58, edge));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

export function createFarGround() {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(56, 320, 64),
    new THREE.MeshStandardMaterial({ color: FAR_GRASS, roughness: 1 }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.06;
  return mesh;
}
