import * as THREE from "three";

const EYE_HEIGHT = 1.6;
const PLAYER_RADIUS = 0.35;
const WALK_SPEED = 3.2;
const RUN_SPEED = 6.0;
const JUMP_SPEED = 6.0;
const GRAVITY = 18;
const LOOK_SENSITIVITY = 0.0028;
const TURN_SPEED = 1.8; // rad/detik, buat panah kiri/kanan
const MAX_PITCH = Math.PI / 2 - 0.05;
const SPAWN = { x: 0, z: 3.8, yaw: 0, pitch: -0.08 }; // berdiri di depan rak, ngadep ke rak

const MOVE_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "Space", "ShiftLeft", "ShiftRight",
]);

function isTyping(target) {
  const tag = target?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable;
}

/**
 * Kontrol first-person: WASD + lompat, menoleh dengan drag di area kosong.
 *
 * @param {THREE.Camera} camera
 * @param {OrbitControls} controls
 * @param {function} getEnvironment      () => environment aktif (butuh getGroundHeight & isWalkable, opsional)
 * @param {function} getObstacleObjects  () => Object3D[] yang gak boleh ditembus (rak, sampah, papan, dll)
 */
export function createFirstPersonController({ camera, controls, getEnvironment, getObstacleObjects }) {
  let enabled = false;
  let inputLocked = false;
  let looking = false;
  let lastLook = { x: 0, y: 0 };
  let yaw = 0;
  let pitch = 0;
  let onGround = true;
  let bobTime = 0;

  const pos = new THREE.Vector3(); // posisi KAKI
  const vel = new THREE.Vector3();
  const keys = new Set();
  let saved = null;
  let obstacleBoxes = [];

  const groundAt = (x, z) => getEnvironment()?.getGroundHeight?.(x, z) ?? 0;
  const isWalkable = (x, z) => {
    const env = getEnvironment();
    return env?.isWalkable ? env.isWalkable(x, z) : Math.hypot(x, z) < 28;
  };

  function applyCamera(bob = 0) {
    camera.position.set(pos.x, pos.y + EYE_HEIGHT + bob, pos.z);
    camera.rotation.set(pitch, yaw, 0);
  }

  // Lingkaran (pemain) vs kotak (rak dll) di bidang XZ, dorong pemain keluar kalau nabrak
  function resolveCollisions() {
    const R = PLAYER_RADIUS;
    for (const b of obstacleBoxes) {
      const cx = THREE.MathUtils.clamp(pos.x, b.min.x, b.max.x);
      const cz = THREE.MathUtils.clamp(pos.z, b.min.z, b.max.z);
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const distSq = dx * dx + dz * dz;
      if (distSq >= R * R) continue;

      if (distSq > 1e-8) {
        const d = Math.sqrt(distSq);
        const push = R - d;
        pos.x += (dx / d) * push;
        pos.z += (dz / d) * push;
      } else {
        // pusat pemain persis di dalam kotak -> dorong lewat sisi terdekat
        const toMinX = pos.x - b.min.x;
        const toMaxX = b.max.x - pos.x;
        const toMinZ = pos.z - b.min.z;
        const toMaxZ = b.max.z - pos.z;
        const m = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);
        if (m === toMinX) pos.x = b.min.x - R;
        else if (m === toMaxX) pos.x = b.max.x + R;
        else if (m === toMinZ) pos.z = b.min.z - R;
        else pos.z = b.max.z + R;
      }
    }
  }

  // ---------- keyboard ----------
  function onKeyDown(e) {
    if (!enabled || inputLocked || isTyping(e.target)) return;
    if (MOVE_KEYS.has(e.code)) {
      keys.add(e.code);
      e.preventDefault(); // cegah Spasi nge-scroll / nge-klik tombol yang lagi fokus
    }
  }
  function onKeyUp(e) {
    if (!MOVE_KEYS.has(e.code)) return;
    keys.delete(e.code);
    if (enabled && !inputLocked && !isTyping(e.target)) e.preventDefault();
  }
  function onBlur() {
    keys.clear();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  // ---------- look (drag di area kosong) ----------
  function beginLook(event) {
    looking = true;
    lastLook = { x: event.clientX, y: event.clientY };
  }
  function look(event) {
    const dx = event.clientX - lastLook.x;
    const dy = event.clientY - lastLook.y;
    lastLook = { x: event.clientX, y: event.clientY };
    yaw -= dx * LOOK_SENSITIVITY;
    pitch = THREE.MathUtils.clamp(pitch - dy * LOOK_SENSITIVITY, -MAX_PITCH, MAX_PITCH);
  }
  function endLook() {
    looking = false;
  }

  // ---------- enable / disable ----------
  function respawn() {
    yaw = SPAWN.yaw;
    pitch = SPAWN.pitch;
    pos.set(SPAWN.x, groundAt(SPAWN.x, SPAWN.z), SPAWN.z);
    vel.set(0, 0, 0);
    onGround = true;
    applyCamera();
  }

  function enable() {
    if (enabled) return;
    saved = { position: camera.position.clone(), target: controls.target.clone() };

    obstacleBoxes = getObstacleObjects()
      .filter(Boolean)
      .map((o) => {
        o.updateMatrixWorld(true);
        return new THREE.Box3().setFromObject(o);
      });

    camera.rotation.order = "YXZ"; // yaw dulu, baru pitch -> gak ada efek "miring" pas menoleh
    controls.enabled = false;
    enabled = true;
    respawn();
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    looking = false;
    keys.clear();
    camera.rotation.order = "XYZ";
    if (saved) {
      camera.position.copy(saved.position);
      controls.target.copy(saved.target);
    }
    controls.enabled = true;
    controls.update();
  }

  function setInputLocked(v) {
    inputLocked = v;
    if (v) {
      keys.clear();
      looking = false;
    }
  }

  // ---------- per frame ----------
  function update(delta) {
    if (!enabled) return;
    const dt = Math.min(delta, 0.05);

    let forward = 0, strafe = 0, turn = 0;
    let wantsJump = false, running = false;
    if (!inputLocked) {
      if (keys.has("KeyW") || keys.has("ArrowUp")) forward += 1;
      if (keys.has("KeyS") || keys.has("ArrowDown")) forward -= 1;
      if (keys.has("KeyD")) strafe += 1;
      if (keys.has("KeyA")) strafe -= 1;
      if (keys.has("ArrowLeft")) turn += 1;
      if (keys.has("ArrowRight")) turn -= 1;
      wantsJump = keys.has("Space");
      running = keys.has("ShiftLeft") || keys.has("ShiftRight");
    }

    yaw += turn * TURN_SPEED * dt;

    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    let wx = -sin * forward + cos * strafe;
    let wz = -cos * forward - sin * strafe;
    const len = Math.hypot(wx, wz);
    if (len > 0) { wx /= len; wz /= len; }

    // percepatan halus: lebih "licin" di udara, lebih responsif di tanah
    const speed = running ? RUN_SPEED : WALK_SPEED;
    const k = Math.min(1, (onGround ? 14 : 4) * dt);
    vel.x += (wx * speed - vel.x) * k;
    vel.z += (wz * speed - vel.z) * k;

    if (wantsJump && onGround) {
      vel.y = JUMP_SPEED;
      onGround = false;
    }

    // gerak horizontal, geser di tepi area jalan (gak nabrak mentok)
    const nx = pos.x + vel.x * dt;
    const nz = pos.z + vel.z * dt;
    if (isWalkable(nx, nz)) {
      pos.x = nx; pos.z = nz;
    } else if (isWalkable(nx, pos.z)) {
      pos.x = nx; vel.z = 0;
    } else if (isWalkable(pos.x, nz)) {
      pos.z = nz; vel.x = 0;
    } else {
      vel.x = 0; vel.z = 0;
    }
    resolveCollisions();

    // vertikal
    const ground = groundAt(pos.x, pos.z);
    if (onGround) {
      pos.y = ground; // nempel ke kontur tanah (naik-turun bukit/pasir)
    } else {
      vel.y -= GRAVITY * dt;
      pos.y += vel.y * dt;
      if (pos.y <= ground && vel.y <= 0) {
        pos.y = ground;
        vel.y = 0;
        onGround = true;
      }
    }

    // head bob tipis pas jalan di tanah
    const horizSpeed = Math.hypot(vel.x, vel.z);
    if (onGround && horizSpeed > 0.2) bobTime += dt * horizSpeed * 2.6;
    const bob = onGround ? Math.sin(bobTime) * 0.035 * Math.min(1, horizSpeed / WALK_SPEED) : 0;

    applyCamera(bob);
  }

  function dispose() {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
  }

  return {
    enable, disable, respawn, update, dispose, setInputLocked,
    beginLook, look, endLook,
    isEnabled: () => enabled,
    isLooking: () => looking,
  };
}