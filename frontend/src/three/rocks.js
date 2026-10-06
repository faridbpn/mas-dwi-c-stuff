import * as THREE from "three";

// --- MEMBUAT SATU BATU REALISTIS (PROSEDURAL) ---
function createRealisticRockMesh(size = 1, wetness = 0.3) {
  const geometry = new THREE.DodecahedronGeometry(size, 2);
  const pos = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  // Distorsi posisi vertex untuk bentuk erosi batu pantai
  for (let i = 0; i < pos.count; i++) {
    vertex.fromBufferAttribute(pos, i);

    const noise =
      Math.sin(vertex.x * 2.8) * 0.12 +
      Math.cos(vertex.y * 3.2) * 0.12 +
      Math.sin(vertex.z * 2.5) * 0.12;

    vertex.addScaledVector(vertex.clone().normalize(), noise);

    // Pipihkan bagian bawah batu
    if (vertex.y < 0) {
      vertex.y *= 0.65;
    }

    pos.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  geometry.computeVertexNormals();

  // Efek kebasahan batu dekat air pantai
  const dryColor = new THREE.Color(0x6e6b66);
  const wetColor = new THREE.Color(0x222528);
  const finalColor = dryColor.clone().lerp(wetColor, wetness);

  const material = new THREE.MeshStandardMaterial({
    color: finalColor,
    roughness: THREE.MathUtils.lerp(0.88, 0.15, wetness),
    metalness: 0.05,
  });

  const rock = new THREE.Mesh(geometry, material);

  rock.scale.set(
    1 + (Math.random() - 0.5) * 0.4,
    0.6 + Math.random() * 0.5,
    1 + (Math.random() - 0.5) * 0.4
  );

  rock.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );

  rock.castShadow = true;
  rock.receiveShadow = true;

  return rock;
}

// --- EXPORT SESUAI NAMA PADA MAIN FILE KAMU ---
export function createRockFormations(
  count,
  { heightSampler, isValidSpot, area = 48, waterlineY = 0 }
) {
  const group = new THREE.Group();
  const rocks = [];

  let placed = 0;
  let attempts = 0;

  while (placed < count && attempts < count * 30) {
    attempts++;
    const x = (Math.random() - 0.5) * area;
    const z = (Math.random() - 0.5) * area;
    const dist = Math.sqrt(x * x + z * z);

    if (!isValidSpot(x, z, dist)) continue;

    const terrainY = heightSampler(x, z);

    // Hitung seberapa basah batu berdasarkan ketinggian dari air
    const heightFromWater = Math.max(0, terrainY - waterlineY);
    const wetness = THREE.MathUtils.clamp(1.0 - heightFromWater * 1.5, 0.1, 0.95);

    const isLargeRock = Math.random() < 0.2;
    const size = isLargeRock
      ? 0.7 + Math.random() * 0.8
      : 0.2 + Math.random() * 0.35;

    const rock = createRealisticRockMesh(size, wetness);
    rock.position.set(x, terrainY - size * 0.25, z);

    group.add(rock);
    rocks.push(rock);
    placed++;

    // Gugusan batu kecil di sekitar batu besar
    if (isLargeRock && placed < count) {
      const clusterCount = 1 + Math.floor(Math.random() * 3);
      for (let c = 0; c < clusterCount; c++) {
        const offsetX = (Math.random() - 0.5) * (size * 1.8);
        const offsetZ = (Math.random() - 0.5) * (size * 1.8);
        const cx = x + offsetX;
        const cz = z + offsetZ;
        const cy = heightSampler(cx, cz);

        const smallSize = 0.12 + Math.random() * 0.2;
        const smallRock = createRealisticRockMesh(smallSize, wetness);
        smallRock.position.set(cx, cy - smallSize * 0.2, cz);

        group.add(smallRock);
        rocks.push(smallRock);
        placed++;
      }
    }
  }

  function dispose() {
    group.traverse((child) => {
      child.geometry?.dispose();
      child.material?.dispose();
    });
  }

  return { group, dispose };
}