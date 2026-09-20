import * as THREE from "three";

// ---- tanah yang melandai kayak bukit, area tengah (tempat rak berdiri) tetap RATA ----
function hillHeight(x, y) {
  const dist = Math.sqrt(x * x + y * y);
  const flatRadius = 9; // area ini rata total, tempat rak/sampah/papan berdiri

  if (dist <= flatRadius) return 0;

  const t = dist - flatRadius;
  // gelombang sinus buat gundukan alami, murah secara komputasi (gak perlu library noise)
  const bump =
    Math.sin(x * 0.35) * Math.cos(y * 0.3) * 0.3 +
    Math.sin(x * 0.12 + y * 0.18) * 0.5;
  return -t * 0.4 + bump; // makin jauh dari pusat, makin turun (lereng bukit)
}

export function createTerrain() {
  const geometry = new THREE.PlaneGeometry(80, 80, 80, 80);
  const pos = geometry.attributes.position;
  const colors = [];
  const low = new THREE.Color(0x577a3b);
  const high = new THREE.Color(0x8fae63);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const h = hillHeight(x, y);
    pos.setZ(i, h);

    const t = THREE.MathUtils.clamp((h + 3) / 4, 0, 1);
    const c = low.clone().lerp(high, t); // warna rumput bervariasi sesuai ketinggian
    colors.push(c.r, c.g, c.b);
  }

  geometry.computeVertexNormals();
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

// ---- langit: bola raksasa dengan tekstur gradient biru->putih, dilihat dari dalam ----
export function createSky() {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#6ea8ff");   // biru langit
  gradient.addColorStop(0.7, "#bcdcff"); // biru muda dekat horizon
  gradient.addColorStop(1, "#eef0f3");   // nyambung mulus ke warna kabut
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 512);

  const texture = new THREE.CanvasTexture(canvas);
  const geometry = new THREE.SphereGeometry(300, 32, 16);
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, fog: false });
  return new THREE.Mesh(geometry, material);
}

// ---- siluet gunung jauh, disebar melingkar, warna pudar (kesan atmosfer/jarak) ----
export function createMountains() {
  const group = new THREE.Group();
  const count = 14;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
    const radius = 55 + Math.random() * 25;
    const height = 12 + Math.random() * 18;

    const geometry = new THREE.ConeGeometry(10 + Math.random() * 8, height, 5); // 5 sisi = low-poly
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.62 + Math.random() * 0.05, 0.25, 0.55),
      flatShading: true,
    });

    const mountain = new THREE.Mesh(geometry, material);
    mountain.position.set(Math.cos(angle) * radius, height / 2 - 3, Math.sin(angle) * radius);
    group.add(mountain);
  }
  return group;
}

// ---- pencahayaan ala outdoor: hemisphere (pantulan langit+tanah) + matahari ----
export function setupOutdoorLighting(scene, renderer) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene.add(new THREE.HemisphereLight(0xbcdcff, 0x6b8f4e, 0.7));

  const sun = new THREE.DirectionalLight(0xfff1d6, 1.1);
  sun.position.set(15, 20, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  scene.add(sun);
}