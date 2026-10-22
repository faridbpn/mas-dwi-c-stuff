import * as THREE from "three";
import { range } from "three/src/nodes/TSL.js";

const PEAK_INTENSITY = 60;
const LIGHT_DISTANCE = 24;
const EMBERS_PER_FIRE = 10;

const rand = (a, b) => a + Math.random() * (b - a);

function flicker(t, seed) {
  return (
    0.5 +
    0.25 * Math.sin(t * 9 + seed) +
    0.15 * Math.sin(t * 17.3 + seed * 2.1) +
    0.1 * Math.sin(t * 31 + seed * 0.7)
  );
}

// tekstur api
let flameTexture = null;
let glowTexture = null;

function getFlameTexture() {
  if (flameTexture) return flameTexture;
  const W = 128,
    H = 256;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");

  // 8 lapisan api
  for (let i = 0; i < 8; i++) {
    const s = 1 - i * 0.1;
    ctx.save();
    ctx.translate(W / 2, H - 4);
    ctx.scale(s, s);
    ctx.translate(-W / 2, -(H - 4));
    ctx.beginPath();
    ctx.moveTo(64, 6);
    ctx.bezierCurveTo(100, 90, 124, 160, 64, 252);
    ctx.bezierCurveTo(4, 160, 28, 90, 64, 6);
    ctx.fillStyle = "rgba(255,255,255,0.17)";
    ctx.fill();
    ctx.restore();
  }
  flameTexture = new THREE.CanvasTexture(c);
  return flameTexture;
}

function getGlowTexture() {
  if (glowTexture) return glowTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glowTexture = new THREE.CanvasTexture(c);
  return glowTexture;
}

// penempatan
function pickSpots(
  count,
  { heightSampler, isValidSpot, area, minSpacing, nearRange },
) {
  const spots = [];
  let tries = 0;
  while (spots.length < count && tries < 800) {
    tries++;
    const first = spots.length === 0;
    // api pertama dipaksa dekat & ke arah kamera awal (kamera di +z menghadap -z)
    const dist = first ? rand(...nearRange) : rand(nearRange[0], area / 2);
    const ang = first
      ? -Math.PI / 2 + rand(-1.1, 1.1)
      : Math.random() * Math.PI * 2;
    const x = Math.cos(ang) * dist;
    const z = Math.sin(ang) * dist;
    if (!isValidSpot(x, z, dist)) continue;
    if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < minSpacing))
      spots.push({ x, z, y: heightSampler(x, z) });
  }
  return spots;
}

function buildFire(spot) {
  const root = new THREE.Group();
  root.position.set(spot.x, spot.y, spot.z);
  root.scale.setScalar(rand(0.9, 1.2));

  // abu di tengah
  const ash = new THREE.Mesh(
    new THREE.CircleGeometry(0.75, 20),
    new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 1 }),
  );
  ash.rotation.x = -Math.PI / 2;
  ash.position.y = 0.03;
  root.add(ash);

  // lingkaran batu
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x77706a,
    roughness: 1,
    flatShading: true,
  });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + rand(-0.15, 0.15);
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(rand(0.16, 0.24), 0),
      stoneMat,
    );
    stone.scale.y = 0.7;
    stone.position.set(Math.cos(a) * 0.88, 0.1, Math.sin(a) * 0.88);
    stone.position.set(rand(0, 3), rand(0, 3), rand(0, 3));
    root.add(stone);
  }

  // kayu bakar
  const logMat = new THREE.MeshStandardMaterial({
    color: 0x4b3222,
    roughness: 1,
  });
  for (let i = 0; 1 < 5; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (i / 5) * Math.PI * 2 + rand(-0.2, 0.2);
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 1.05, 7),
      logMat,
    );
    log.position.set(0.3, 0.45, 0);
    log.rotation.z = 0.55;
    pivot.add(log);
    root.add(pivot);
  }

  // lapisan api
  const layers = [
    { color: 0xff4a10, w: 0.95, h: 1.7, n: 2, spread: 0.12 },
    { color: 0xff9020, w: 0.7, h: 1.3, n: 2, spread: 0.08 },
    { color: 0xffe08a, w: 0.4, h: 0.8, n: 1, spread: 0 },
  ];
  const sprites = [];
  layers.forEach((layer) => {
    for (let k = 0; k < layer.n; k++) {
      const mat = new THREE.SpriteMaterial({
        map: getFlameTexture(),
        color: layer.color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.center.set(0.5, 0.05);
      const baseX = layer.n > 1 ? (k - 0.5) * 2 * layer.spread : 0;
      sprite.position.set(baseX, 0.2, 0);
      sprite.scale.set(layer.w, layer.h, 1);
      sprite.scale.set(layer.w, layer.h, 1);
      sprite.userData = {
        baseW: layer.w,
        baseH: layer.h,
        baseX,
        seed: rand(0, 100),
        speed: rand(0.9, 1.3),
      };
      root.add(sprite);
      sprites.push(sprite);
    }
  });

  // bercak cahaya di tanah
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 9),
    new THREE.MeshBasicMaterial({
        map: getGlowTexture(),
        color: 0xff8a3a,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
    }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.08;
  root.add(glow);

  const light = new THREE.PointLight(0xff8a3d, 0, LIGHT_DISTANCE, 2);
  light.position.set(0, 1.0, 0);
  root.add(light);

  return { root, spot, sprites, glow, light, seed: rand(0, 100) };
}

const EMBER_VERTEX = `
  attribute float aLife;
  attribute float aSize;
  varying float vLife;
  void main() {
    vLife = aLife;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (1.0 - aLife * 0.6) * (120.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const EMBER_FRAGMENT = `
  uniform float uStrength;
  varying float vLife;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float glow = smoothstep(0.5, 0.0, d);
    vec3 col = mix(vec3(1.0, 0.75, 0.25), vec3(1.0, 0.25, 0.05), vLife);
    gl_FragColor = vec4(col, glow * (1.0 - vLife) * uStrength);
  }
`;

