import * as THREE from "three";
import { hillHeight } from "./environment";

const VERTEX_SHADER = `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    // fase angin beda-beda per helai, diambil dari posisi instance-nya sendiri
    // (instanceMatrix[3] = kolom translasi -> x & z posisi rumput itu)
    float phase = uTime * 1.6 + instanceMatrix[3][0] * 0.6 + instanceMatrix[3][2] * 0.4;
    pos.x += sin(phase) * 0.12 * uv.y; // makin ke ujung (uv.y=1), makin gede goyangnya; akar (uv.y=0) diam
    pos.z += cos(phase * 0.8) * 0.06 * uv.y;
    vec4 worldPosition = instanceMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const FRAGMENT_SHADER = `
    varying vec2 vUv;
    void main() {
        vec3 base = mix(vec3(0.24, 0.38, 0.14), vec3(0.6, 0.72, 0.34), vUv.y); //gelap di akar terang di ujung
        gl_FragColor = vec4(base, 1.0);
    }
`;

function createBladeGeometry(height, width) {
  // segitiga 2 sisi di akar 1 sisi di ujung biar mirip rumput
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array([-width / 2, 0, 0, width / 2, 0, 0, 0, height, 0]),
      3,
    ),
  );
  geometry.setAttribute(
    "uv",
    new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0.5, 1]), 2),
  );
  geometry.setIndex([0, 1, 2]);
  return geometry;
}

export function createGrass(count = 2500) {
  const geometry = createBladeGeometry(0.4, 0.05);
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

    // catatan konversi koordinat: tanah dirotasi -90° di sumbu X, jadi
    // world Z = -(local Y) yang dipakai hillHeight -> makanya di-minus di sini
    const y = hillHeight(x, -z);

    dummy.position.set(x, y, z);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.scale.set(0.7, 0.4 + Math.random() * 0.6, 0.7);
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
