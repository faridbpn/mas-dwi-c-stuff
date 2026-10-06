import * as THREE from "three";

const CALM = "calm";
const BUILDING = "building";
const STORMING = "storming";
const CLEARING = "clearing";

const rand = (min, max) => min + Math.random() * (max - min);
const easeInOut = (t) => t * t * (3 - 2 * t);

/**
 * Siklus cuaca: tenang <-> badai, dengan hujan + petir + penggelapan dinamis.
 *
 * @param {THREE.Scene} scene
 * @param {THREE.HemisphereLight} hemi
 * @param {THREE.DirectionalLight} sun
 * @param {THREE.ShaderMaterial} sandMaterial
 * @param {THREE.ShaderMaterial} oceanMaterial
 * @param {THREE.Mesh} sky
 * @param {Object} clouds -- hasil dari createClouds(), harus punya setStormIntensity(t)
 * @param {number} waterLevel
 * @param {Object} calm   -- { fogColor, fogDensity, skyTop, skyBottom, hemiColor, hemiGround, hemiIntensity, sunColor, sunIntensity }
 * @param {Object} storm  -- bentuk sama persis, versi gelap/badai
 * @param {function} onEvent -- (name) => void, name: 'thunder' | 'storm-start' | 'storm-end'
 */
export function createWeatherSystem({
  scene,
  hemi,
  sun,
  sandMaterial,
  oceanMaterial,
  sky,
  clouds,
  waterLevel = 0,
  calm,
  storm,
  calmRange = [25, 50],
  stormRange = [18, 35],
  transitionDuration = 6,
  onEvent = null,
} = {}) {
  const group = new THREE.Group();

  // ---------- Hujan ----------
  const RAIN_COUNT = 700;
  const AREA = 70;
  const rainGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.5, 3);
  const rainMat = new THREE.MeshBasicMaterial({
    color: 0xaad4ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const rainMesh = new THREE.InstancedMesh(rainGeo, rainMat, RAIN_COUNT);
  rainMesh.frustumCulled = false; // area hujan luas, jangan sampai kepotong pas kamera deket
  group.add(rainMesh);

  const rainDrops = [];
  for (let i = 0; i < RAIN_COUNT; i++) {
    rainDrops.push({
      x: (Math.random() - 0.5) * AREA,
      y: rand(0, 30),
      z: (Math.random() - 0.5) * AREA,
      speed: rand(14, 22),
    });
  }
  const dummy = new THREE.Object3D();

  function updateRain(delta, intensity) {
    rainMat.opacity = intensity * 0.5;
    if (intensity <= 0.01) return;

    for (let i = 0; i < RAIN_COUNT; i++) {
      const d = rainDrops[i];
      d.y -= d.speed * delta;
      d.x += delta * 2.2; // tetesan hanyut sedikit, kesan ketiup angin
      if (d.y < waterLevel) {
        d.y = rand(20, 30);
        d.x = (Math.random() - 0.5) * AREA;
        d.z = (Math.random() - 0.5) * AREA;
      }
      dummy.position.set(d.x, d.y, d.z);
      dummy.rotation.z = -0.25; // miring konsisten, arah angin
      dummy.scale.set(1, 0.4 + intensity * 1.3, 1); // makin badai, tetesan makin "memanjang"
      dummy.updateMatrix();
      rainMesh.setMatrixAt(i, dummy.matrix);
    }
    rainMesh.instanceMatrix.needsUpdate = true;
  }

  // ---------- Petir ----------
  let flashTimer = 0;
  let nextFlashIn = rand(4, 10);
  let flashIntensity = 0;

  function updateLightning(delta, intensity) {
    if (intensity < 0.3) {
      flashIntensity = Math.max(0, flashIntensity - delta * 3.5);
      return;
    }
    flashTimer += delta;
    if (flashTimer >= nextFlashIn) {
      flashTimer = 0;
      nextFlashIn = rand(3, 9) / Math.max(intensity, 0.3); // makin badai, makin sering nyamber
      flashIntensity = 1;
      onEvent?.("thunder");
    } else {
      flashIntensity = Math.max(0, flashIntensity - delta * 3.5); // decay cepat, kesan kilat sesaat
    }
  }

  // ---------- State machine cuaca ----------
  let state = CALM;
  let stateTime = 0;
  let stateDuration = rand(...calmRange);

  function enter(next) {
    state = next;
    stateTime = 0;
    if (next === CALM) stateDuration = rand(...calmRange);
    else if (next === BUILDING) {
      stateDuration = transitionDuration;
      onEvent?.("storm-start");
    } else if (next === STORMING) stateDuration = rand(...stormRange);
    else if (next === CLEARING) {
      stateDuration = transitionDuration;
      onEvent?.("storm-end");
    }
  }

  const tmpFog = new THREE.Color();
  const tmpSun = new THREE.Color();

  function applyIntensity(t) {
    tmpFog.copy(calm.fogColor).lerp(storm.fogColor, t);
    if (scene.fog) {
      scene.fog.color.copy(tmpFog);
      scene.fog.density = THREE.MathUtils.lerp(calm.fogDensity, storm.fogDensity, t);
    }
    if (scene.background?.copy) scene.background.copy(tmpFog);

    if (sky) {
      sky.material.uniforms.topColor.value.copy(calm.skyTop).lerp(storm.skyTop, t);
      sky.material.uniforms.bottomColor.value.copy(calm.skyBottom).lerp(storm.skyBottom, t);
    }

    hemi.color.copy(calm.hemiColor).lerp(storm.hemiColor, t);
    hemi.groundColor.copy(calm.hemiGround).lerp(storm.hemiGround, t);
    hemi.intensity = THREE.MathUtils.lerp(calm.hemiIntensity, storm.hemiIntensity, t);

    tmpSun.copy(calm.sunColor).lerp(storm.sunColor, t);
    sun.color.copy(tmpSun);
    const baseSunIntensity = THREE.MathUtils.lerp(calm.sunIntensity, storm.sunIntensity, t);
    sun.intensity = baseSunIntensity + flashIntensity * 2.5; // kilat numpuk di atas intensitas dasar

    if (sandMaterial) {
      sandMaterial.uniforms.uFogColor.value.copy(tmpFog);
      sandMaterial.uniforms.uFogDensity.value = scene.fog?.density ?? calm.fogDensity;
      sandMaterial.uniforms.uSunColor.value.copy(tmpSun);
      if (sandMaterial.uniforms.uStorm) sandMaterial.uniforms.uStorm.value = t;
    }
    if (oceanMaterial) {
      oceanMaterial.uniforms.uFogColor.value.copy(tmpFog);
      oceanMaterial.uniforms.uFogDensity.value = scene.fog?.density ?? calm.fogDensity;
      oceanMaterial.uniforms.uSunColor.value.copy(tmpSun);
      oceanMaterial.uniforms.uStorm.value = t;
    }
  }

  function update(elapsed, delta) {
    stateTime += delta;
    const t = Math.min(stateTime / stateDuration, 1);
    let targetIntensity;

    switch (state) {
      case CALM:
        targetIntensity = 0;
        if (t >= 1) enter(BUILDING);
        break;
      case BUILDING:
        targetIntensity = easeInOut(t);
        if (t >= 1) enter(STORMING);
        break;
      case STORMING:
        targetIntensity = 1;
        if (t >= 1) enter(CLEARING);
        break;
      case CLEARING:
        targetIntensity = 1 - easeInOut(t);
        if (t >= 1) enter(CALM);
        break;
    }

    updateLightning(delta, targetIntensity);
    applyIntensity(targetIntensity);
    updateRain(delta, targetIntensity);
    clouds?.setStormIntensity?.(targetIntensity); // BARU: nyambungin ke awan

    return { intensity: targetIntensity, isStorming: state !== CALM, flashIntensity };
  }

  function dispose() {
    rainGeo.dispose();
    rainMat.dispose();
  }

  return { group, update, dispose };
}