import * as THREE from "three";

/**
 * Bikin environment map (IBL) dari mesh langit yang sudah ada.
 * Direbuild berkala karena warna langit berubah (siang-malam, badai).
 */
export function createSkyLighting({
  renderer,
  scene,
  sky,
  intensity = 0.5,
  interval = 4,
}) {
  const pmrem = new THREE.PMREMGenerator(renderer);

  // Mesh proxy: pakai geometry & material yang SAMA dengan langit asli,
  // jadi warnanya ikut berubah tanpa nyentuh langit di scene utama.
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(sky.geometry, sky.material));

  let target = null;
  let lastBuild = 0;

  function rebuild() {
    // far = 1000 WAJIB: bola langit radiusnya 300, default far=100 bakal motong semuanya
    const next = pmrem.fromScene(envScene, 0, 0.1, 1000);
    scene.environment = next.texture;
    target?.dispose();
    target = next;
  }

  scene.environmentIntensity = intensity;
  rebuild();

  function update(elapsed) {
    if (elapsed - lastBuild < interval) return;
    lastBuild = elapsed;
    rebuild();
  }

  function dispose() {
    scene.environment = null;
    target?.dispose();
    pmrem.dispose();
  }

  return { update, dispose };
}
