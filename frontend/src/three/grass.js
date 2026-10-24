import * as THREE from "three";
import { heightAtWorld, slopeAtWorld } from "./forestTerrain";

const VERTEX_SHADER = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Angin berdasarkan posisi instance matrix
    float phase = uTime * 1.8 + instanceMatrix[3][0] * 0.7 + instanceMatrix[3][2] * 0.5;
    
    // Efek melengkung ke samping (angin) bertingkat dari akar ke ujung (uv.y)
    float wind = sin(phase) * 0.25 * pow(uv.y, 1.8);
    pos.x += wind;
    pos.z += cos(phase * 0.7) * 0.15 * pow(uv.y, 1.8);

    // Hitung posisi dunia
    vec4 worldPosition = instanceMatrix * vec4(pos, 1.0);
    
    // Normal sederhana untuk pencahayaan
    vNormal = normalize(mat3(instanceMatrix) * normal);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const FRAGMENT_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    // Gradasi warna: Akar lebih gelap/kecoklatan, tengah hijau segar, ujung agak kekuningan/terang
    vec3 rootColor = vec3(0.12, 0.22, 0.06);
    vec3 midColor  = vec3(0.25, 0.45, 0.12);
    vec3 tipColor  = vec3(0.55, 0.70, 0.25);

    vec3 base = mix(rootColor, midColor, smoothstep(0.0, 0.5, vUv.y));
    base = mix(base, tipColor, smoothstep(0.5, 1.0, vUv.y));

    // Pencahayaan sederhana agar tidak flat (kena cahaya dari atas/depan)
    float light = dot(vNormal, vec3(0.3, 0.8, 0.5)) * 0.4 + 0.6;
    
    gl_FragColor = vec4(base * light, 1.0);
  }
`;

// Membuat geometri helai rumput dengan beberapa segmen vertikal agar bisa melengkung
function createBladeGeometry(height, width) {
  const segments = 3;
  const geometry = new THREE.BufferGeometry();
  
  const vertices = [];
  const uvs = [];
  const indices = [];
  const normals = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const w = width * (1 - t * 0.7); // Makin ke atas makin lancip
    const y = t * height;
    
    // Titik kiri dan kanan pada setiap ketinggian (segment)
    vertices.push(-w / 2, y, 0);
    vertices.push(w / 2, y, 0);

    uvs.push(0, t);
    uvs.push(1, t);

    normals.push(0, 0, 1);
    normals.push(0, 0, 1);
  }

  // Buat indeks segitiga antar segment
  for (let i = 0; i < segments; i++) {
    const row1 = i * 2;
    const row2 = (i + 1) * 2;

    indices.push(row1, row1 + 1, row2);
    indices.push(row1 + 1, row2 + 1, row2);
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);

  return geometry;
}

export function createGrass(count = 15000) { // Naikkan jumlah count default
  const geometry = createBladeGeometry(0.5, 0.04);
  
  // Menggunakan MeshStandardMaterial / Custom ShaderMaterial dengan dukungan pencahayaan
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();

  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < count * 4) {
    attempts++;
    const x = (Math.random() - 0.5) * 60;
    const z = (Math.random() - 0.5) * 60;
    const distFromCenter = Math.sqrt(x * x + z * z);

    if (distFromCenter < 9.5 || distFromCenter > 28) continue;

    const y = heightAtWorld(x, z);
    if (y < -0.45 || slopeAtWorld(x, z) > 0.45) continue; 

    dummy.position.set(x, y, z);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    
    // Rotasi sedikit miring ke samping supaya tidak kaku berdiri tegak lurus
    dummy.rotation.x = (Math.random() - 0.5) * 0.2;
    dummy.rotation.z = (Math.random() - 0.5) * 0.2;

    // Variasi skala acak agar ada rumput pendek & tinggi
    const scaleY = 0.5 + Math.random() * 0.8;
    dummy.scale.set(0.8 + Math.random() * 0.4, scaleY, 0.8 + Math.random() * 0.4);
    
    dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  mesh.count = placed;

  function update(elapsed) {
    material.uniforms.uTime.value = elapsed;
  }

  return { mesh, update };
}