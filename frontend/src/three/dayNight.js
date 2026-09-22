import * as THREE from "three";

// keyframe warna & posisi matahari sepanjang 1 siklus (t = 0..1, ibaratnya 0 = tengah malam)
const KEYFRAMES = [
  { t: 0.00, sky: { top: 0x0b1026, bottom: 0x1b2550 }, fog: 0x1b2550,
    sun: { color: 0x33406b, intensity: 0.05 },
    hemi: { sky: 0x1b2550, ground: 0x0b0f1c, intensity: 0.25 }, elevation: -60 },

  { t: 0.22, sky: { top: 0xff9d6c, bottom: 0xffe3c2 }, fog: 0xffd7ad,
    sun: { color: 0xffdcae, intensity: 0.9 },
    hemi: { sky: 0xffd7ad, ground: 0x6b8f4e, intensity: 0.5 }, elevation: 5 }, // fajar

  { t: 0.50, sky: { top: 0x6ea8ff, bottom: 0xeef0f3 }, fog: 0xbcdcff,
    sun: { color: 0xfff1d6, intensity: 1.1 },
    hemi: { sky: 0xbcdcff, ground: 0x6b8f4e, intensity: 0.7 }, elevation: 75 }, // siang bolong

  { t: 0.78, sky: { top: 0xff7e5f, bottom: 0xffd3a5 }, fog: 0xffb98a,
    sun: { color: 0xff9d6c, intensity: 0.7 },
    hemi: { sky: 0xffb98a, ground: 0x6b4a33, intensity: 0.45 }, elevation: 5 }, // senja

  { t: 1.00, sky: { top: 0x0b1026, bottom: 0x1b2550 }, fog: 0x1b2550,
    sun: { color: 0x33406b, intensity: 0.05 },
    hemi: { sky: 0x1b2550, ground: 0x0b0f1c, intensity: 0.25 }, elevation: -60 },
];

function lerpColor(hexA, hexB, t) {
  return new THREE.Color(hexA).lerp(new THREE.Color(hexB), t);
}

function sampleKeyframes(t) {
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const a = KEYFRAMES[i];
    const b = KEYFRAMES[i + 1];
    if (t >= a.t && t <= b.t) {
      return { a, b, localT: (t - a.t) / (b.t - a.t) };
    }
  }
  return { a: KEYFRAMES[0], b: KEYFRAMES[0], localT: 0 };
}

export function createDayNightCycle({ scene, sky, sun, hemi, cycleDurationSeconds = 180 }) {
  const sunDistance = 60;

  function update(elapsed) {
    const t = (elapsed % cycleDurationSeconds) / cycleDurationSeconds;
    const { a, b, localT } = sampleKeyframes(t);

    // langit
    sky.material.uniforms.topColor.value.copy(lerpColor(a.sky.top, b.sky.top, localT));
    sky.material.uniforms.bottomColor.value.copy(lerpColor(a.sky.bottom, b.sky.bottom, localT));

    // kabut & background, nyamain warna sama horizon langit
    const fogColor = lerpColor(a.fog, b.fog, localT);
    if (scene.fog) scene.fog.color.copy(fogColor);
    scene.background.copy(fogColor);

    // matahari: warna, intensitas, DAN posisi (jalan melengkung ala matahari beneran)
    sun.color.copy(lerpColor(a.sun.color, b.sun.color, localT));
    sun.intensity = THREE.MathUtils.lerp(a.sun.intensity, b.sun.intensity, localT);

    const elevationDeg = THREE.MathUtils.lerp(a.elevation, b.elevation, localT);
    const elevationRad = THREE.MathUtils.degToRad(elevationDeg);
    const azimuthRad = t * Math.PI * 2;
    sun.position.set(
      Math.cos(elevationRad) * Math.cos(azimuthRad) * sunDistance,
      Math.sin(elevationRad) * sunDistance,
      Math.cos(elevationRad) * Math.sin(azimuthRad) * sunDistance
    );

    // cahaya ambient (hemisphere)
    hemi.color.copy(lerpColor(a.hemi.sky, b.hemi.sky, localT));
    hemi.groundColor.copy(lerpColor(a.hemi.ground, b.hemi.ground, localT));
    hemi.intensity = THREE.MathUtils.lerp(a.hemi.intensity, b.hemi.intensity, localT);

    return { t, isNight: elevationDeg < 0 }; // `isNight` disiapin buat fitur kunang-kunang nanti
  }

  return { update };
}