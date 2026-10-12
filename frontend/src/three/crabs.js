import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

const PAUSED = "paused";
const WALKING = "walking";
const BURROWING = "burrowing";
const HIDDEN = "hidden";
const EMERGING = "emerging";

const rand = (a, b) => a + Math.random() * (b - a);
const easeInCubic = (t) => t * t * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function disposeObject(obj) {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => {
        for (const key in m) if (m[key]?.isTexture) m[key].dispose();
        m.dispose();
      });
    }
  });
}

// BARU: cari clip yang namanya mengandung kata kunci tertentu, fallback ke clip pertama
function pickAnimationClip(clips, keyword) {
  if (!clips.length) return null;
  const match = clips.find((c) => c.name.toLowerCase().includes(keyword.toLowerCase()));
  return match ?? clips[0];
}

/**
 * @param {string} modelUrl
 * @param {number} count
 * @param {number} targetSize
 * @param {function} heightSampler
 * @param {function} isValidSpot
 * @param {number} area
 * @param {number} walkSpeed
 * @param {number[]} pauseRange
 * @param {number} burrowDuration
 * @param {number[]} hiddenRange
 * @param {string} walkAnimationKeyword  kata kunci buat nyari clip jalan (default: "walk")
 * @param {number} facingOffset          koreksi arah hadap model (radian), kalau geraknya nyamping
 */
export function createCrabSystem({
  modelUrl,
  count = 6,
  targetSize = 0.35,
  heightSampler,
  isValidSpot,
  area = 40,
  walkSpeed = 0.5,
  pauseRange = [1.5, 4],
  burrowDuration = 0.8,
  hiddenRange = [3, 9],
  walkAnimationKeyword = "walk",
  facingOffset = 0,
}) {
  const group = new THREE.Group();
  const loader = new GLTFLoader();
  const crabs = [];
  const dustParticles = [];

  let baseModel = null;
  let walkClip = null;
  let modelHeight = 1;
  let ready = false;

  function randomSpot() {
    for (let attempt = 0; attempt < 40; attempt++) {
      const x = (Math.random() - 0.5) * area;
      const z = (Math.random() - 0.5) * area;
      const dist = Math.sqrt(x * x + z * z);
      if (isValidSpot(x, z, dist)) return { x, z };
    }
    return { x: 0, z: 0 };
  }

  function spawnDustPuff(position) {
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 5, 5),
        new THREE.MeshBasicMaterial({
          color: 0xc9b48a,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
        })
      );
      mesh.position.copy(position);
      mesh.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.7,
        rand(0.3, 0.8),
        (Math.random() - 0.5) * 0.7
      );
      mesh.userData.life = 0.5;
      group.add(mesh);
      dustParticles.push(mesh);
    }
  }

  function updateDust(delta) {
    for (let i = dustParticles.length - 1; i >= 0; i--) {
      const p = dustParticles[i];
      p.userData.velocity.y -= 1.2 * delta;
      p.position.addScaledVector(p.userData.velocity, delta);
      p.userData.life -= delta;
      p.material.opacity = Math.max(0, (p.userData.life / 0.5) * 0.7);
      if (p.userData.life <= 0) {
        group.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        dustParticles.splice(i, 1);
      }
    }
  }

  function spawnCrabInstance() {
    const root = SkeletonUtils.clone(baseModel);
    root.scale.setScalar(targetSize / modelHeight);
    root.userData.isCrabRoot = true;

    let mixer = null;
    let action = null;
    if (walkClip) {
      mixer = new THREE.AnimationMixer(root);
      action = mixer.clipAction(walkClip);
      action.play();
      action.timeScale = rand(0.85, 1.15); // tiap kepiting jalannya beda tempo dikit, gak kompak
    }

    const spot = randomSpot();
    root.position.set(spot.x, heightSampler(spot.x, spot.z), spot.z);

    const crab = {
      root,
      mixer,
      action,
      state: PAUSED,
      stateTime: 0,
      stateDuration: rand(...pauseRange),
      target: { ...spot },
      baseY: root.position.y,
      baseScale: targetSize / modelHeight,
      burrowSeed: Math.random() * Math.PI * 2,
    };
    group.add(root);
    crabs.push(crab);
  }

  function enterState(crab, state) {
    crab.state = state;
    crab.stateTime = 0;

    if (state === PAUSED) {
      crab.stateDuration = rand(...pauseRange);
      crab.action?.setEffectiveTimeScale(0); // berhenti gerak kaki pas diem
    } else if (state === WALKING) {
      crab.target = randomSpot();
      crab.stateDuration = 999;
      crab.action?.setEffectiveTimeScale(1);
    } else if (state === BURROWING) {
      crab.stateDuration = burrowDuration;
      crab.baseY = crab.root.position.y;
      crab.burrowSeed = Math.random() * Math.PI * 2;
      spawnDustPuff(crab.root.position);
      crab.action?.setEffectiveTimeScale(2.5); // kaki "ngegeliat cepat" pas mulai ngubur, kesan panik/gali
    } else if (state === HIDDEN) {
      crab.stateDuration = rand(...hiddenRange);
    } else if (state === EMERGING) {
      const spot = randomSpot();
      crab.baseY = heightSampler(spot.x, spot.z);
      crab.root.position.set(spot.x, crab.baseY - targetSize, spot.z);
      crab.root.visible = true;
      crab.stateDuration = burrowDuration;
    }
  }

  function updateCrab(crab, delta) {
    crab.mixer?.update(delta);
    crab.stateTime += delta;
    const t = Math.min(crab.stateTime / crab.stateDuration, 1);

    switch (crab.state) {
      case PAUSED:
        if (t >= 1) enterState(crab, WALKING);
        break;

      case WALKING: {
        const dx = crab.target.x - crab.root.position.x;
        const dz = crab.target.z - crab.root.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.15) {
          enterState(crab, PAUSED);
          break;
        }
        const nx = dx / dist;
        const nz = dz / dist;
        crab.root.position.x += nx * walkSpeed * delta;
        crab.root.position.z += nz * walkSpeed * delta;
        crab.root.position.y = heightSampler(crab.root.position.x, crab.root.position.z);

        const targetAngle = Math.atan2(nx, nz) + facingOffset;
        crab.root.rotation.y = THREE.MathUtils.lerp(crab.root.rotation.y, targetAngle, 0.12);

        // BARU: kalau gak ada animasi GLTF sama sekali, kasih bob naik-turun
        // manual biar gak keliatan "meluncur kaku" kayak puck hoki
        if (!crab.action) {
          crab.root.position.y += Math.abs(Math.sin(crab.stateTime * 9)) * 0.015;
          crab.root.rotation.z = Math.sin(crab.stateTime * 9) * 0.05;
        }
        break;
      }

      case BURROWING: {
        // BARU: goyang muter + squash, kesan "menggali", bukan cuma turun lurus
        const wobble = Math.sin(t * Math.PI * 5 + crab.burrowSeed) * (1 - t) * 0.35;
        crab.root.rotation.z = wobble;
        crab.root.rotation.x = wobble * 0.5;
        crab.root.rotation.y += delta * 4 * (1 - t); // puter cepet di awal, melambat

        // 2 fase: squash dulu (0-35%), baru bener2 tenggelam (35-100%)
        const sinkT = Math.max(0, (t - 0.25) / 0.75);
        crab.root.position.y = THREE.MathUtils.lerp(
          crab.baseY, crab.baseY - targetSize * 1.6, easeInCubic(sinkT)
        );
        const squash = t < 0.25 ? 1 - (t / 0.25) * 0.3 : 0.7 - easeInCubic(sinkT) * 0.6;
        crab.root.scale.setScalar(Math.max(0.05, crab.baseScale * squash));

        if (t >= 1) {
          crab.root.visible = false;
          crab.root.rotation.set(0, crab.root.rotation.y, 0);
          enterState(crab, HIDDEN);
        }
        break;
      }

      case HIDDEN:
        if (t >= 1) enterState(crab, EMERGING);
        break;

      case EMERGING: {
        const wobble = Math.sin(t * Math.PI * 4) * (1 - t) * 0.25;
        crab.root.rotation.z = wobble;
        crab.root.scale.setScalar(crab.baseScale * (0.15 + t * 0.85));
        crab.root.position.y = THREE.MathUtils.lerp(
          crab.baseY - targetSize * 1.6, crab.baseY, easeOutCubic(t)
        );
        if (t >= 1) {
          crab.root.scale.setScalar(crab.baseScale);
          crab.root.rotation.set(0, crab.root.rotation.y, 0);
          enterState(crab, PAUSED);
        }
        break;
      }
    }
  }

  loader.load(
    modelUrl,
    (gltf) => {
      baseModel = gltf.scene;

      // BARU: log semua nama clip yang ketemu -- CEK INI DI CONSOLE buat mastiin
      // nama/jumlah clip animasi yang beneran ada di file kamu
      console.info(
        "🦀 Clip animasi kepiting ditemukan:",
        gltf.animations.map((c) => `"${c.name}" (${c.duration.toFixed(2)}s)`)
      );

      walkClip = pickAnimationClip(gltf.animations, walkAnimationKeyword);
      if (!walkClip) {
        console.warn("🦀 Gak ada animasi ditemukan sama sekali di file GLTF ini -- fallback ke bob manual.");
      }

      const box = new THREE.Box3().setFromObject(baseModel);
      modelHeight = box.max.y - box.min.y || 1;
      baseModel.position.y -= box.min.y;

      for (let i = 0; i < count; i++) spawnCrabInstance();
      ready = true;
    },
    undefined,
    (err) => console.warn("Gagal memuat model kepiting:", err)
  );

  function update(elapsed, delta) {
    if (!ready) return;
    crabs.forEach((c) => updateCrab(c, delta));
    updateDust(delta);
  }

  function getClickTargets() {
    return crabs.filter((c) => c.state !== HIDDEN).map((c) => c.root);
  }

  function handleClick(hitObject) {
    let obj = hitObject;
    while (obj && !obj.userData.isCrabRoot) obj = obj.parent;
    if (!obj) return false;

    const crab = crabs.find((c) => c.root === obj);
    if (crab && (crab.state === WALKING || crab.state === PAUSED)) {
      enterState(crab, BURROWING);
      return true;
    }
    return false;
  }

  function dispose() {
    crabs.forEach((c) => {
      c.mixer?.stopAllAction();
      disposeObject(c.root);
    });
    dustParticles.forEach((p) => {
      p.geometry.dispose();
      p.material.dispose();
    });
  }

  return { group, update, getClickTargets, handleClick, dispose };
}