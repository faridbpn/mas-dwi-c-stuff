import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const rand = (a, b) => a + Math.random() * (b - a);

// 0..1: tinggi di area rimbun, rendah di area lapang
function clump(x, z) {
  const v = Math.sin(x * 0.13 + 1.7) * Math.cos(z * 0.11 - 0.6) + Math.sin((x + z) * 0.07);
  return THREE.MathUtils.clamp(0.55 + v * 0.35, 0.1, 1);
}

function pickSpots(count, { heightSampler, isValidSpot, area, minSpacing }) {
  const spots = [];
  let attempts = 0;
  while (spots.length < count && attempts < count * 80) {
    attempts++;
    const x = (Math.random() - 0.5) * area;
    const z = (Math.random() - 0.5) * area;
    if (!isValidSpot(x, z, Math.hypot(x, z))) continue;
    if (Math.random() > clump(x, z)) continue;
    if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < minSpacing)) continue;
    spots.push({
      x, z, y: heightSampler(x, z),
      rotY: rand(0, Math.PI * 2),
      scale: rand(0.8, 1.25),
    });
  }
  return spots;
}

/**
 * @param {string[]} modelUrls     satu atau beberapa model pohon (jenis berbeda)
 * @param {number} count           total pohon
 * @param {number} targetHeight    tinggi rata-rata pohon (world unit)
 * @param {function} heightSampler (x, z) => tinggi tanah
 * @param {function} isValidSpot   (x, z, dist) => boolean
 */
export function createTreeSystem({
  modelUrls,
  count = 90,
  targetHeight = 5,
  heightSampler,
  isValidSpot,
  area = 110,
  minSpacing = 3.2,
}) {
  const group = new THREE.Group();
  const loader = new GLTFLoader();
  const loadedScenes = [];
  let disposed = false;

  const spots = pickSpots(count, { heightSampler, isValidSpot, area, minSpacing });

  modelUrls.forEach((url, modelIndex) => {
    loader.load(
      url,
      (gltf) => {
        if (disposed) return;
        const root = gltf.scene;
        loadedScenes.push(root);
        root.updateMatrixWorld(true);

        // spot dibagi rata antar jenis pohon
        const mine = spots.filter((_, i) => i % modelUrls.length === modelIndex);
        if (!mine.length) return;

        // normalisasi: pusat XZ ke 0, dasar ke y=0, skala ke targetHeight
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const s = targetHeight / (size.y || 1);
        const norm = new THREE.Matrix4()
          .makeScale(s, s, s)
          .multiply(new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));

        let tris = 0;
        let meshCount = 0;
        const spotM = new THREE.Matrix4();
        const quat = new THREE.Quaternion();
        const up = new THREE.Vector3(0, 1, 0);

        root.traverse((mesh) => {
          if (!mesh.isMesh) return;
          if (mesh.isSkinnedMesh) {
            console.warn("🌳 Mesh ber-skeleton dilewati:", mesh.name);
            return;
          }
          meshCount++;
          const g = mesh.geometry;
          tris += (g.index ? g.index.count : g.attributes.position.count) / 3;

          const inst = new THREE.InstancedMesh(g, mesh.material, mine.length);
          const base = norm.clone().multiply(mesh.matrixWorld);

          mine.forEach((spot, i) => {
            quat.setFromAxisAngle(up, spot.rotY);
            spotM.compose(
              new THREE.Vector3(spot.x, spot.y, spot.z),
              quat,
              new THREE.Vector3(spot.scale, spot.scale, spot.scale),
            );
            inst.setMatrixAt(i, spotM.clone().multiply(base));
          });
          inst.instanceMatrix.needsUpdate = true;
          inst.castShadow = true;
          inst.receiveShadow = true;
          inst.frustumCulled = false; // bounding sphere instance gak selalu akurat
          group.add(inst);
        });

        console.info(
          `🌳 ${url}: ${meshCount} mesh, ${Math.round(tris)} segitiga/pohon x ${mine.length} pohon ` +
          `= ${Math.round(tris * mine.length)} segitiga`,
        );
      },
      undefined,
      (err) => console.warn("Gagal memuat model pohon:", url, err),
    );
  });

  function dispose() {
    disposed = true;
    loadedScenes.forEach((root) =>
      root.traverse((c) => {
        c.geometry?.dispose();
        const mats = Array.isArray(c.material) ? c.material : c.material ? [c.material] : [];
        mats.forEach((m) => {
          for (const k in m) if (m[k]?.isTexture) m[k].dispose();
          m.dispose();
        });
      }),
    );
  }

  return { group, dispose };
}