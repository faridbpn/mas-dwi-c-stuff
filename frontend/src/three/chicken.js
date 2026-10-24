import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtilsNS from "three/examples/jsm/utils/SkeletonUtils.js";

// kompatibel dengan versi three lama (SkeletonUtils.clone) dan baru (clone langsung)
const cloneSkinned = SkeletonUtilsNS.clone ?? SkeletonUtilsNS.SkeletonUtils?.clone;

const IDLE = "idle";
const WALK = "walk";

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = THREE.MathUtils.clamp;
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

const AXES = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};
const LEG_RE = /leg|thigh|femur|foot|paw|toe|kaki|tarsus|drum/i;
const HEAD_RE = /head|kepala/i;
const NECK_RE = /neck|leher/i;

function pickClip(clips, keyword) {
  if (!clips.length) return null;
  return clips.find((c) => c.name.toLowerCase().includes(keyword)) ?? clips[0];
}

// objek non-mesh yang namanya cocok, dan TIDAK punya leluhur yang juga cocok (rantai tulang: ambil pangkalnya)
function topmostMatching(model, regex) {
  const set = new Set();
  model.traverse((o) => {
    if (o.isMesh || o.isLight || o.isCamera) return;
    if (o.name && regex.test(o.name)) set.add(o);
  });
  return [...set].filter((o) => {
    for (let p = o.parent; p; p = p.parent) if (set.has(p)) return false;
    return true;
  });
}

/**
 * @param {string} modelUrl
 * @param {function} heightSampler  (x, z) => tinggi tanah
 * @param {function} isValidSpot    (x, z) => boolean, area yang boleh diinjak ayam
 * @param {number} facingOffset     koreksi arah hadap model (radian), kalau jalannya miring/mundur
 * @param {string} swingAxis        sumbu lokal tulang buat ayunan kaki: 'x' | 'y' | 'z'
 */
export function createChickens({
  modelUrl,
  count = 6,
  flocks = 2,
  targetHeight = 0.55,
  heightSampler,
  isValidSpot,
  walkSpeed = 0.9,
  turnSpeed = 5,
  wanderRadius = 8,
  idleRange = [2.5, 6],
  stepRate = 12,
  legSwing = 0.75,
  headNod = 0.2,
  bobAmount = 0.035,
  waddle = 0.08,
  swingAxis = "x",
  facingOffset = 0,
  idleKeyword = "idle",
}) {
  const group = new THREE.Group();
  const chickens = [];
  const axis = AXES[swingAxis] ?? AXES.x;
  const tmpQ = new THREE.Quaternion();
  const procQ = new THREE.Quaternion();
  const tmpV = new THREE.Vector3();

  let base = null;
  let mixerRoots = [];
  let ready = false;
  let disposed = false;

  const hasHeadroom = () => !disposed;

  function pickFlockCenters(n) {
    const centers = [];
    for (let i = 0; i < n; i++) {
      for (let t = 0; t < 300; t++) {
        // kelompok pertama dibiaskan ke area yang kelihatan dari kamera awal (belakang rak)
        const ang = i === 0 ? -Math.PI / 2 + rand(-0.9, 0.9) : rand(0, Math.PI * 2);
        const dist = rand(13, 32);
        const x = Math.cos(ang) * dist;
        const z = Math.sin(ang) * dist;
        if (!isValidSpot(x, z)) continue;
        if (centers.some((c) => Math.hypot(c.x - x, c.z - z) < 12)) continue;
        centers.push({ x, z });
        break;
      }
    }
    return centers;
  }

  function randomSpotNear(center, radius) {
    for (let t = 0; t < 30; t++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      const x = center.x + Math.cos(a) * r;
      const z = center.z + Math.sin(a) * r;
      if (isValidSpot(x, z)) return { x, z };
    }
    return null;
  }

  function buildChicken(flock, norm) {
    const model = cloneSkinned(base.scene);
    model.scale.setScalar(norm.scale);
    model.position.set(-norm.cx * norm.scale, -norm.minY * norm.scale, -norm.cz * norm.scale);

    // root (posisi + arah jalan) -> body (bob & goyang) -> orient (koreksi hadap) -> model
    const root = new THREE.Group();
    const body = new THREE.Group();
    const orient = new THREE.Group();
    orient.rotation.y = facingOffset;
    orient.add(model);
    body.add(orient);
    root.add(body);

    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    root.updateMatrixWorld(true);

    // --- kaki: tentukan sisi kiri/kanan lewat sumbu yang paling lebar sebarannya ---
    const legBones = topmostMatching(model, LEG_RE);
    const pos = legBones.map((b) => b.getWorldPosition(new THREE.Vector3()));
    const xs = pos.map((p) => p.x);
    const zs = pos.map((p) => p.z);
    const spreadX = Math.max(...xs, 0) - Math.min(...xs, 0);
    const spreadZ = Math.max(...zs, 0) - Math.min(...zs, 0);
    const key = spreadX >= spreadZ ? "x" : "z";
    const mean = pos.length ? pos.reduce((s, p) => s + p[key], 0) / pos.length : 0;
    const legs = legBones.map((bone, i) => ({
      bone,
      rest: bone.quaternion.clone(),
      side: pos[i][key] >= mean ? 1 : -1,
    }));

    // --- kepala ---
    const headBone = topmostMatching(model, HEAD_RE)[0] ?? topmostMatching(model, NECK_RE)[0] ?? null;
    const head = headBone ? { bone: headBone, rest: headBone.quaternion.clone() } : null;

    // --- animasi idle ---
    let mixer = null;
    let idleAction = null;
    if (base.idleClip) {
      mixer = new THREE.AnimationMixer(model);
      idleAction = mixer.clipAction(base.idleClip);
      idleAction.play();
    }

    const spot = randomSpotNear(flock, 3) ?? flock;
    root.position.set(spot.x, heightSampler(spot.x, spot.z), spot.z);
    root.rotation.y = Math.random() * Math.PI * 2;
    group.add(root);

    const c = {
      root, body, model, mixer, idleAction, legs, head, flock,
      heading: root.rotation.y,
      state: IDLE,
      stateTime: 0,
      stateDuration: rand(...idleRange),
      target: null,
      phase: Math.random() * 6.28,
      walkBlend: 0,
      baseSpeed: walkSpeed * rand(0.85, 1.15),
    };
    enterState(c, IDLE);
    chickens.push(c);
  }

  function enterState(c, state) {
    c.state = state;
    c.stateTime = 0;
    if (state === IDLE) {
      c.stateDuration = rand(...idleRange);
      const a = c.idleAction;
      if (a) {
        a.enabled = true;
        a.reset();
        a.time = rand(0, a.getClip().duration); // tiap ayam mulai di titik animasi berbeda
        a.fadeIn(0.25).play();
      }
    } else {
      c.idleAction?.fadeOut(0.2);
    }
  }

  function updateChicken(c, delta, night) {
    c.stateTime += delta;

    if (c.state === IDLE) {
      c.walkBlend = Math.max(0, c.walkBlend - delta / 0.2);
      if (c.stateTime >= c.stateDuration) {
        if (night > 0.85) {
          c.stateTime = 0; // malam penuh: ayam tidur, tetap diam
          c.stateDuration = rand(4, 8);
        } else {
          c.target = randomSpotNear(c.flock, wanderRadius);
          if (c.target) enterState(c, WALK);
          else c.stateTime = 0;
        }
      }
    } else {
      const p = c.root.position;
      const dx = c.target.x - p.x;
      const dz = c.target.z - p.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.25 || c.stateTime > 16) {
        enterState(c, IDLE);
      } else {
        const desired = Math.atan2(dx, dz);
        const diff = angleDiff(desired, c.heading);
        const maxTurn = turnSpeed * delta;
        c.heading += clamp(diff, -maxTurn, maxTurn);
        c.root.rotation.y = c.heading;

        // belok dulu, baru maju (selaras arah = kecepatan penuh)
        const remaining = Math.abs(angleDiff(desired, c.heading));
        const speedFactor = clamp(1 - remaining / 1.0, 0, 1);

        const step = c.baseSpeed * speedFactor * delta;
        const nx = p.x + Math.sin(c.heading) * step;
        const nz = p.z + Math.cos(c.heading) * step;

        if (step > 0 && !isValidSpot(nx, nz)) {
          enterState(c, IDLE); // mentok tepi area, berhenti dan cari tujuan lain
        } else {
          p.x = nx;
          p.z = nz;
          p.y = heightSampler(nx, nz);
          c.phase += delta * stepRate * (0.35 + 0.65 * speedFactor);
          c.walkBlend = Math.min(1, c.walkBlend + delta / 0.15);
        }
      }
    }

    // ---- pose: reset tulang -> mixer (idle) -> timpa dengan gerak jalan prosedural ----
    for (const l of c.legs) l.bone.quaternion.copy(l.rest);
    if (c.head) c.head.bone.quaternion.copy(c.head.rest);
    c.mixer?.update(delta);

    const w = c.walkBlend;
    if (w > 0.001) {
      const k = Math.min(1, w * 2);
      for (const l of c.legs) {
        const ang = Math.sin(c.phase + (l.side > 0 ? 0 : Math.PI)) * legSwing * w;
        tmpQ.setFromAxisAngle(axis, ang);
        procQ.copy(l.rest).multiply(tmpQ);
        l.bone.quaternion.slerp(procQ, k);
      }
      if (c.head) {
        tmpQ.setFromAxisAngle(axis, Math.sin(c.phase * 2) * headNod * w);
        procQ.copy(c.head.rest).multiply(tmpQ);
        c.head.bone.quaternion.slerp(procQ, k);
      }
    }
    c.body.position.y = Math.abs(Math.sin(c.phase)) * bobAmount * w;
    c.body.rotation.z = Math.sin(c.phase) * waddle * w;
  }

  new GLTFLoader().load(
    modelUrl,
    (gltf) => {
      if (disposed) return;
      base = { scene: gltf.scene, idleClip: pickClip(gltf.animations, idleKeyword) };

      // ---- info buat debugging ----
      const boneNames = [];
      gltf.scene.traverse((o) => {
        if (o.isBone) boneNames.push(o.name);
      });
      console.info(
        "🐔 clip:", gltf.animations.map((c) => `"${c.name}" (${c.duration.toFixed(2)}s)`),
        "| dipakai buat idle:", base.idleClip?.name ?? "(tidak ada)",
      );
      console.info("🐔 tulang:", boneNames);

      // normalisasi ukuran: tinggi = targetHeight, dasar di y=0, pusat XZ di 0
      gltf.scene.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = box.getSize(tmpV);
      const ctr = box.getCenter(new THREE.Vector3());
      const norm = { scale: targetHeight / (size.y || 1), cx: ctr.x, cz: ctr.z, minY: box.min.y };

      const centers = pickFlockCenters(flocks);
      if (!centers.length) {
        console.warn("🐔 Gak ada titik valid buat ayam, cek isValidSpot.");
        return;
      }
      for (let i = 0; i < count; i++) buildChicken(centers[i % centers.length], norm);

      const sample = chickens[0];
      console.info(
        `🐔 kaki terdeteksi: ${sample.legs.map((l) => l.bone.name).join(", ") || "(tidak ada)"}` +
        ` | kepala: ${sample.head?.bone.name ?? "(tidak ada)"}`,
      );
      if (!sample.legs.length) {
        console.warn("🐔 Tulang kaki gak ketemu lewat nama -> ayam cuma bob & goyang badan.");
      }
      ready = true;
    },
    undefined,
    (err) => console.warn("Gagal memuat model ayam:", err),
  );

  /** night: 0 (siang) .. 1 (malam penuh) */
  function update(elapsed, delta, night = 0) {
    if (!ready) return;
    const dt = Math.min(delta, 0.1);
    for (const c of chickens) updateChicken(c, dt, night);
  }

  function dispose() {
    disposed = true;
    chickens.forEach((c) => c.mixer?.stopAllAction());
    // klon berbagi geometri & material dengan model dasar, jadi dispose sekali saja
    base?.scene.traverse((o) => {
      o.geometry?.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      mats.forEach((m) => {
        for (const k in m) if (m[k]?.isTexture) m[k].dispose();
        m.dispose();
      });
    });
  }

  return { group, update, dispose };
}