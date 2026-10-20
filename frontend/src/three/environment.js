import * as THREE from "three";

// ---- tanah yang melandai kayak bukit, area tengah (tempat rak berdiri) tetap RATA ----
export function hillHeight(x, y) {
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

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

// ---- langit: bola raksasa dengan tekstur gradient biru->putih, dilihat dari dalam ----
export function createSky() {
  const uniforms = {
    topColor: { value: new THREE.Color(0x6ea8ff) },
    bottomColor: { value: new THREE.Color(0xeef0f3) },
    offset: { value: 20 },
    exponent: { value: 0.7 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide,
    fog: false,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), material);
}

function ridgeNoise(x, y) {
  return (
    Math.sin(x * 1.7 + y * 0.9) * 0.5 +
    Math.sin(x * 0.55 - y * 1.4) * 0.3 +
    Math.sin(x * 3.2 + y * 2.6) * 0.2
  );
}

function createJaggedMountain({
  baseRadius, height, segments, jaggedness, noiseScale,
  baseColor, darkColor, snowColor, snowLine,
}) {
  let geometry = new THREE.ConeGeometry(baseRadius, height, segments, 14, false);
  geometry = geometry.toNonIndexed(); // wajib sebelum deformasi manual

  const pos = geometry.attributes.position;
  const colors = [];
  const base = new THREE.Color(baseColor);
  const dark = new THREE.Color(darkColor);
  const snow = new THREE.Color(snowColor);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const heightT = THREE.MathUtils.clamp((y + height / 2) / height, 0, 1);

    const n = ridgeNoise(x * noiseScale, z * noiseScale) * jaggedness * heightT;
    pos.setX(i, x + n);
    pos.setZ(i, z + n * 0.7);

    const color =
      heightT > snowLine
        ? base.clone().lerp(snow, (heightT - snowLine) / (1 - snowLine))
        : dark.clone().lerp(base, heightT / snowLine);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, fog: true }),
  );
}

export function createMountains() {
  const group = new THREE.Group();

  // Semua di luar radius 120. Bola langit radiusnya 300, jadi (radius + lebar dasar) harus < 300.
  const layers = [
    { count: 9,  radius: [120, 145], height: [38, 62],  widthK: [0.9, 1.2],  segments: 9,
      base: 0x5b6b52, dark: 0x3c4a38, snowLine: 0.78 },
    { count: 10, radius: [160, 185], height: [55, 85],  widthK: [0.85, 1.1], segments: 8,
      base: 0x7c8a9c, dark: 0x5c6a7c, snowLine: 0.7 },
    { count: 9,  radius: [205, 225], height: [65, 100], widthK: [0.6, 0.75], segments: 7,
      base: 0xaebbcc, dark: 0x9aa8bb, snowLine: 0.6 },
  ];

  layers.forEach((layer) => {
    for (let i = 0; i < layer.count; i++) {
      const angle = (i / layer.count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const radius = THREE.MathUtils.randFloat(...layer.radius);
      const height = THREE.MathUtils.randFloat(...layer.height);
      const baseRadius = height * THREE.MathUtils.randFloat(...layer.widthK);

      const mountain = createJaggedMountain({
        baseRadius, height, segments: layer.segments,
        jaggedness: height * 0.12, noiseScale: 0.12,
        baseColor: layer.base, darkColor: layer.dark,
        snowColor: 0xf3f6fa, snowLine: layer.snowLine,
      });
      mountain.rotation.y = Math.random() * Math.PI * 2;
      // dasar ditenggelamkan 10 unit biar gak ada celah dengan tanah
      mountain.position.set(Math.cos(angle) * radius, height / 2 - 10, Math.sin(angle) * radius);
      group.add(mountain);
    }
  });

  return group;
}

// ---- pencahayaan ala outdoor: hemisphere (pantulan langit+tanah) + matahari ----
export function setupOutdoorLighting(scene, renderer) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const hemi = new THREE.HemisphereLight(0xbcdcff, 0x6b8f4e, 0.7);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff1d6, 1.1);
  sun.position.set(15, 20, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  scene.add(sun);

  return { hemi, sun };
}
