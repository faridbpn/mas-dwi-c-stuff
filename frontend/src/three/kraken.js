;import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MODEL_URL = '/models/kraken/scene.gltf';
const loader = new GLTFLoader();

const HIDDEN = 'hidden';
const TELEGRAPH = 'telegraph'; // BARU: gelembung muncul dulu, bikin tegang sebelum nongol
const RISING = 'rising';
const LURKING = 'lurking';
const DIVING = 'diving';

const rand = (min, max) => min + Math.random() * (max - min);
const randRange = ([min, max]) => rand(min, max);
const easeInCubic = (t) => t * t * t;

// BARU: overshoot -> naiknya "kelewatan dikit" lalu settle balik,
// ngasih kesan momentum/beban, bukan gerak robotik rata
function easeOutBack(t) {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * Kraken yang muncul acak lalu menyelam lagi.
 *
 * @param {Object} opts (lihat opsi lama di versi sebelumnya, ditambah:)
 * @param {number} opts.telegraphDuration  Lama fase "gelembung tanda-tanda" sebelum nyembul (detik)
 * @param {number} opts.bubbleCount        Jumlah gelembung pas telegraph
 * @param {number} opts.splashCount        Jumlah percikan pas nembus permukaan
 * @param {function} opts.onEvent          Callback(eventName) -> 'telegraph' | 'emerge' | 'dive'
 *                                         Buat nyambungin sound effect / camera shake dari luar
 */
export function createKraken({
  waterY = 0,
  targetSize = 7,
  center = [0, 0],
  radiusRange = [25, 40],
  angleRange = [0, Math.PI * 2],
  hiddenRange = [8, 20],
  lurkRange = [4, 8],
  riseDuration = 3,
  diveDuration = 2.5,
  surfaceSubmerge = 0.55, // DIUBAH dari 0.45 -> lebih banyak badan tetep kerendem, kesannya lebih "mengintai"
  facingOffset = 0,
  telegraphDuration = 1.8, // BARU
  bubbleCount = 10,        // BARU
  splashCount = 22,        // BARU
  onEvent = null,          // BARU
} = {}) {
  const group = new THREE.Group();
  const pivot = new THREE.Group();
  pivot.visible = false;
  group.add(pivot);

  // ---------- Riak air (DIPERBESAR, skalanya sekarang ikut targetSize) ----------
  const rippleGeo = new THREE.RingGeometry(0.8, 1.0, 48);
  const rippleMat = new THREE.MeshBasicMaterial({
    color: 0x9fd8c8, // BARU: kehijauan keruh, kesan air "terganggu", bukan putih bersih
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false, // FIX: typo lama "deepWrite" -> "depthWrite" (properti itu sebelumnya gak kebaca sama Three.js)
  });
  const ripple = new THREE.Mesh(rippleGeo, rippleMat);
  ripple.rotation.x = -Math.PI / 2;
  ripple.position.y = waterY + 0.08;
  ripple.visible = false;
  group.add(ripple);

  let rippleT = 1;
  const RIPPLE_DURATION = 2.5;
  function triggerRipple(strength = 1) {
    rippleT = 0;
    ripple.visible = true;
    ripple.userData.strength = strength; // BARU: ripple pas RISING lebih gede dari pas telegraph
  }

  // ---------- BARU: pool gelembung (telegraph) ----------
  const bubbleGeo = new THREE.SphereGeometry(1, 8, 8);
  const bubbleMat = new THREE.MeshBasicMaterial({
    color: 0xdfffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const bubbles = [];
  for (let i = 0; i < bubbleCount; i++) {
    const mesh = new THREE.Mesh(bubbleGeo, bubbleMat.clone());
    mesh.visible = false;
    group.add(mesh);
    bubbles.push({
      mesh,
      active: false,
      life: 0,
      duration: 0,
      offsetX: 0,
      offsetZ: 0,
      size: 0.1,
    });
  }

  function spawnBubbles() {
    bubbles.forEach((b, i) => {
      b.active = true;
      b.life = 0;
      b.duration = rand(0.8, telegraphDuration);
      b.offsetX = rand(-1.2, 1.2);
      b.offsetZ = rand(-1.2, 1.2);
      b.size = rand(0.08, 0.22) * (targetSize / 7); // skala ngikut ukuran kraken
      b.mesh.visible = true;
      b.mesh.material.opacity = 0;
    });
  }

  function updateBubbles(delta) {
    bubbles.forEach((b) => {
      if (!b.active) return;
      b.life += delta;
      const t = Math.min(b.life / b.duration, 1);
      b.mesh.position.set(
        b.offsetX,
        THREE.MathUtils.lerp(waterY - 0.3, waterY + 0.05, t),
        b.offsetZ
      );
      b.mesh.scale.setScalar(b.size * (0.6 + t * 0.4));
      b.mesh.material.opacity = Math.sin(t * Math.PI) * 0.55; // naik lalu pecah/fade pas nyampe atas
      if (t >= 1) {
        b.active = false;
        b.mesh.visible = false;
      }
    });
  }

  // ---------- BARU: pool percikan air (splash, pas nembus permukaan) ----------
  const splashGeo = new THREE.SphereGeometry(1, 6, 6);
  const splashMat = new THREE.MeshBasicMaterial({
    color: 0xeefcff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const splashes = [];
  for (let i = 0; i < splashCount; i++) {
    const mesh = new THREE.Mesh(splashGeo, splashMat.clone());
    mesh.visible = false;
    group.add(mesh);
    splashes.push({ mesh, active: false, life: 0, velocity: new THREE.Vector3() });
  }

  function triggerSplash() {
    const scaleFactor = targetSize / 7;
    splashes.forEach((s) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(1.5, 4) * scaleFactor;
      s.active = true;
      s.life = 0;
      s.mesh.visible = true;
      s.mesh.position.set(0, waterY, 0);
      s.mesh.scale.setScalar(rand(0.08, 0.2) * scaleFactor);
      s.velocity.set(
        Math.cos(angle) * speed * 0.5,
        rand(2, 4) * scaleFactor, // dorongan ke atas, kesan "meledak keluar"
        Math.sin(angle) * speed * 0.5
      );
    });
  }

  function updateSplashes(delta) {
    splashes.forEach((s) => {
      if (!s.active) return;
      s.life += delta;
      s.velocity.y -= 6 * delta; // gravitasi narik balik ke air
      s.mesh.position.addScaledVector(s.velocity, delta);
      s.mesh.material.opacity = Math.max(0, 0.9 - s.life * 1.3);
      if (s.life > 0.7 || s.mesh.position.y < waterY - 0.5) {
        s.active = false;
        s.mesh.visible = false;
      }
    });
  }

  // ---------- State machine ----------
  let loaded = false;
  let disposed = false;
  let mixer = null;
  let modelHeight = 0;

  let state = HIDDEN;
  let stateTime = 0;
  let stateDuration = rand(3, 6);
  let lastElapsed = null;

  const hiddenY = () => waterY - modelHeight - 0.5;
  const surfacedY = () => waterY - modelHeight * surfaceSubmerge;

  function pickNewSpot() {
    const angle = randRange(angleRange);
    const radius = randRange(radiusRange);
    const x = center[0] + Math.cos(angle) * radius;
    const z = center[1] + Math.sin(angle) * radius;
    group.position.set(x, 0, z);
    const toCenter = Math.atan2(center[0] - x, center[1] - z);
    group.rotation.y = toCenter + facingOffset + rand(-0.4, 0.4);
  }

  function enter(next) {
    state = next;
    stateTime = 0;

    if (next === HIDDEN) {
      pivot.visible = false;
      stateDuration = randRange(hiddenRange);
    } else if (next === TELEGRAPH) {
      // BARU: posisi ditentuin SEKARANG (bukan pas RISING), biar gelembungnya
      // muncul di titik yang sama persis sama tempat kraken bakal nongol
      pickNewSpot();
      stateDuration = telegraphDuration;
      spawnBubbles();
      triggerRipple(0.3); // riak kecil dulu, bukan yang gede
      onEvent?.('telegraph');
    } else if (next === RISING) {
      pivot.position.y = hiddenY();
      pivot.visible = true;
      stateDuration = riseDuration;
      triggerRipple(1); // riak BESAR pas beneran nongol
      triggerSplash();  // BARU
      onEvent?.('emerge');
    } else if (next === LURKING) {
      stateDuration = randRange(lurkRange);
    } else if (next === DIVING) {
      stateDuration = diveDuration;
      triggerRipple(0.7);
      onEvent?.('dive');
    }
  }

  loader.load(
    MODEL_URL,
    (gltf) => {
      if (disposed) {
        disposeObject(gltf.scene);
        return;
      }
      const model = gltf.scene;

      const rawBox = new THREE.Box3().setFromObject(model);
      const rawHeight = rawBox.max.y - rawBox.min.y || 1;
      const scale = targetSize / rawHeight; // FIX dari bug sebelumnya: scaling yang ketinggalan
      model.scale.setScalar(scale);

      const box = new THREE.Box3().setFromObject(model);
      const center3 = box.getCenter(new THREE.Vector3());
      model.position.x -= center3.x;
      model.position.z -= center3.z;
      model.position.y -= box.min.y;
      modelHeight = box.max.y - box.min.y;

      pivot.add(model);

      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(gltf.animations[0]).play();
      }
      loaded = true;
    },
    undefined,
    (err) => console.error('Failed to load kraken model', err)
  );

  function update(elapsed) {
    if (lastElapsed === null) lastElapsed = elapsed;
    const delta = Math.min(elapsed - lastElapsed, 0.1);
    lastElapsed = elapsed;

    if (rippleT < 1) {
      rippleT = Math.min(rippleT + delta / RIPPLE_DURATION, 1);
      const strength = ripple.userData.strength ?? 1;
      const sc = (1 + rippleT * 6) * strength;
      ripple.scale.set(sc, sc, sc);
      rippleMat.opacity = (1 - rippleT) * 0.5 * strength;
      if (rippleT >= 1) ripple.visible = false;
    }

    updateBubbles(delta);   // BARU: jalan terus independen dari state model (biar gak nunggu `loaded`)
    updateSplashes(delta);  // BARU

    // State HIDDEN & TELEGRAPH tetep jalan walau model BELUM selesai di-load
    // (biar gelembung/riak tetep bisa nongol duluan sambil nunggu GLTF selesai fetch)
    stateTime += delta;
    const t = Math.min(stateTime / stateDuration, 1);

    if (state === HIDDEN) {
      if (t >= 1) enter(loaded ? TELEGRAPH : HIDDEN); // nunggu model ready sebelum lanjut ke telegraph
      return;
    }
    if (state === TELEGRAPH) {
      if (t >= 1) enter(RISING);
      return;
    }

    if (!loaded) return;
    if (mixer) mixer.update(delta);

    switch (state) {
      case RISING:
        // BARU: easeOutBack -> nongolnya kayak ada "dorongan", bukan gerak rata linear
        pivot.position.y = THREE.MathUtils.lerp(hiddenY(), surfacedY(), easeOutBack(t));
        // BARU: goyangan liar pas lagi naik, bukan cuma pas lurking
        pivot.rotation.z = Math.sin(elapsed * 6) * 0.05 * (1 - t);
        if (t >= 1) enter(LURKING);
        break;

      case LURKING:
        pivot.position.y = surfacedY() + Math.sin(elapsed * 1.2) * 0.15;
        pivot.rotation.z = Math.sin(elapsed * 0.8) * 0.04;
        pivot.rotation.y = Math.sin(elapsed * 0.3) * 0.15;
        if (t >= 1) enter(DIVING);
        break;

      case DIVING:
        pivot.position.y = THREE.MathUtils.lerp(surfacedY(), hiddenY(), easeInCubic(t));
        if (t >= 1) {
          pivot.rotation.set(0, 0, 0);
          enter(HIDDEN);
        }
        break;
    }
  }

  function dispose() {
    disposed = true;
    disposeObject(pivot);
    mixer?.stopAllAction();
    rippleGeo.dispose();
    rippleMat.dispose();
    bubbleGeo.dispose();
    bubbleMat.dispose();
    splashGeo.dispose();
    splashMat.dispose();
  }

  return { group, update, dispose };
}

function disposeObject(obj) {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => {
        for (const key in m) {
          if (m[key] && m[key].isTexture) m[key].dispose();
        }
        m.dispose();
      });
    }
  });
}