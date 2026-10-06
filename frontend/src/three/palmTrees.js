import * as THREE from "three";

// --- MEMBUAT DAUN MENYIRIP (FEATHER FROND) REALISTIS ---
function createFeatherFrondMesh(length, material) {
  const positions = [];
  const indices = [];
  const steps = 24; // Jumlah pasang anak daun sepanjang pelepah
  let idx = 0;

  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const nextT = (i + 1) / steps;

    // Jalur kelengkungan pelepah daun (melengkung parabola ke bawah)
    const x1 = t * length;
    const y1 = Math.sin(t * Math.PI * 0.75) * (length * 0.2) - (t * t * length * 0.38);
    const x2 = nextT * length;
    const y2 = Math.sin(nextT * Math.PI * 0.75) * (length * 0.2) - (nextT * nextT * length * 0.38);

    // Lebar anak daun (paling lebar di tengah, mengecil di ujung)
    const leafletLen = Math.sin(t * Math.PI) * (length * 0.25);
    const droop = Math.pow(t, 1.4) * 0.15; // Efek terkulai karena gravitasi

    // Anak daun kiri
    positions.push(
      x1, y1, 0,
      x2, y2, 0,
      x1 + (x2 - x1) * 0.5, y1 - droop, leafletLen
    );

    // Anak daun kanan
    positions.push(
      x1, y1, 0,
      x2, y2, 0,
      x1 + (x2 - x1) * 0.5, y1 - droop, -leafletLen
    );

    // Geometri dua sisi (tampak dari atas & bawah)
    indices.push(idx, idx + 1, idx + 2, idx + 2, idx + 1, idx);
    indices.push(idx + 3, idx + 4, idx + 5, idx + 5, idx + 4, idx + 3);
    idx += 6;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return new THREE.Mesh(geom, material);
}

// --- MEMBUAT POHON PALEM UTUH ---
function createPalmMesh(height) {
  const group = new THREE.Group();

  // 1. BATANG BERLapis & BERCINCIN (ORGANIK)
  const ringCount = 22;
  const segHeight = height / ringCount;
  
  const trunkMat1 = new THREE.MeshStandardMaterial({ color: 0x6e5847, roughness: 0.95 });
  const trunkMat2 = new THREE.MeshStandardMaterial({ color: 0x4a3b2f, roughness: 0.90 });

  let crownPos = new THREE.Vector3();
  const bendDirection = (Math.random() - 0.5) * 0.4; // Arah lekukan pohon

  for (let i = 0; i < ringCount; i++) {
    const progress = i / ringCount;
    // Pangkal lebih tebal (flared base) & makin ke atas makin ramping
    const baseFlare = Math.exp(-progress * 6) * 0.08;
    const rBottom = 0.15 * (1 - progress * 0.45) + baseFlare;
    const rTop = 0.15 * (1 - (progress + 1 / ringCount) * 0.45);

    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop, rBottom * 1.04, segHeight, 14),
      i % 2 === 0 ? trunkMat1 : trunkMat2
    );

    // Efek lekukan alami seperti pohon kelapa pantai
    const curveX = Math.sin(progress * Math.PI * 0.6) * 0.45 + (progress * bendDirection);
    
    seg.position.set(curveX, i * segHeight + segHeight / 2, 0);
    seg.rotation.z = -Math.cos(progress * Math.PI * 0.6) * 0.18;
    group.add(seg);

    if (i === ringCount - 1) {
      crownPos.set(curveX, (i + 1) * segHeight, 0);
    }
  }

  // 2. BUAH KELAPA DI PANGKAL MAHKOTA
  const coconutMat = new THREE.MeshStandardMaterial({ color: 0x685536, roughness: 0.8 });
  const coconutGeo = new THREE.SphereGeometry(0.08, 8, 8);
  coconutGeo.scale(1, 1.25, 1);

  for (let c = 0; c < 5; c++) {
    const coconut = new THREE.Mesh(coconutGeo, coconutMat);
    const cAngle = (c / 5) * Math.PI * 2;
    coconut.position.set(
      crownPos.x + Math.cos(cAngle) * 0.12,
      crownPos.y - 0.06,
      crownPos.z + Math.sin(cAngle) * 0.12
    );
    group.add(coconut);
  }

  // 3. DAUN PALEM BERLAPIS (LAYER MAHKOTA)
  const fronds = [];
  const layers = [
    { count: 4, pitch: 0.25, scale: 0.85, color: 0x4aa336 },  // Daun muda atas (hijau terang, tegak)
    { count: 7, pitch: -0.15, scale: 1.05, color: 0x2b6e28 }, // Daun dewasa tengah (hijau tua, melebar)
    { count: 5, pitch: -0.60, scale: 0.90, color: 0x616e28 }  // Daun tua bawah (agak kekuningan, terkulai)
  ];

  layers.forEach((layer) => {
    const mat = new THREE.MeshStandardMaterial({
      color: layer.color,
      side: THREE.DoubleSide,
      roughness: 0.55,
    });

    for (let i = 0; i < layer.count; i++) {
      const frond = createFeatherFrondMesh(height * 0.55 * layer.scale, mat);
      const angle = (i / layer.count) * Math.PI * 2 + Math.random() * 0.2;

      frond.position.copy(crownPos);
      frond.rotation.y = angle;
      frond.rotation.z = layer.pitch + (Math.random() - 0.5) * 0.1;

      group.add(frond);
      fronds.push({ mesh: frond, baseZ: frond.rotation.z, speed: 1.5 + Math.random() });
    }
  });

  group.userData.fronds = fronds;
  group.userData.swaySeed = Math.random() * Math.PI * 2;
  return group;
}

// --- Hutan / GROVE MANAGER ---
export function createPalmGrove(
  count,
  { heightSampler, isValidSpot, area = 44 },
) {
  const group = new THREE.Group();
  const trees = [];

  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < count * 25) {
    attempts++;
    const x = (Math.random() - 0.5) * area;
    const z = (Math.random() - 0.5) * area;
    const dist = Math.sqrt(x * x + z * z);
    if (!isValidSpot(x, z, dist)) continue;

    const height = 2.8 + Math.random() * 1.5;
    const tree = createPalmMesh(height);
    tree.position.set(x, heightSampler(x, z), z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    group.add(tree);
    trees.push(tree);
    placed++;
  }

  function update(elapsed, windStrength = 1) {
    trees.forEach((t) => {
      // Ayunan lembut batang
      t.rotation.z = Math.sin(elapsed * 0.8 + t.userData.swaySeed) * 0.03 * windStrength;

      // Melambaikan setiap helai daun secara individual
      t.userData.fronds.forEach((f, idx) => {
        const wave = Math.sin(elapsed * f.speed + t.userData.swaySeed + idx) * 0.035 * windStrength;
        f.mesh.rotation.z = f.baseZ + wave;
      });
    });
  }

  function dispose() {
    trees.forEach((t) => {
      t.traverse((child) => {
        child.geometry?.dispose();
        child.material?.dispose();
      });
    });
  }

  return { group, update, dispose };
}