import * as THREE from "three";

function createRockMesh(size) {
  let geometry = new THREE.IcosahedronGeometry(size, 1);
  geometry = geometry.toNonIndexed(); // wajib sebelum deformasi manual, biar flat-shading rapi

  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = (Math.sin(x * 3 + y * 2) + Math.sin(y * 4 - z * 3) + Math.sin(z * 3 + x * 1.5)) * 0.08;
    const scale = 1 + n;
    pos.setXYZ(i, x * scale, y * scale, z * scale);
  }
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.08, 0.12, 0.3 + Math.random() * 0.1),
    flatShading: true,
    roughness: 1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  return mesh;
}

export function createRockFormations(count, { heightSampler, isValidSpot, area = 48 }) {
  const group = new THREE.Group();

  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < count * 25) {
    attempts++;
    const x = (Math.random() - 0.5) * area;
    const z = (Math.random() - 0.5) * area;
    const dist = Math.sqrt(x * x + z * z);
    if (!isValidSpot(x, z, dist)) continue;

    const size = 0.5 + Math.random() * 1.1;
    const rock = createRockMesh(size);
    rock.position.set(x, heightSampler(x, z) + size * 0.3, z); // sedikit "tertanam", bukan ngambang
    group.add(rock);
    placed++;
  }

  function dispose() {
    group.traverse((child) => {
      child.geometry?.dispose();
      child.material?.dispose();
    });
  }

  return { group, dispose };
}