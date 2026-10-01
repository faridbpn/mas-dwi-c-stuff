import * as THREE from "three";
import { createSky } from "../environment";
import { createBirdFlock } from "../birds";

const FLAT_RADIUS = 9;
const ISLAND_RADIUS = 16;
const WATER_LEVEL = -0.35;
const SEABED_DEPTH = -3.2;

// Kalkulasi profil tinggi pulau & dasar laut
// CATATAN: kalau fungsi ini diubah, ubah juga versi GLSL-nya (SAND_HEIGHT_GLSL di bawah)
function sandHeight(x, z) {
  const dist = Math.sqrt(x * x + z * z);
  if (dist <= FLAT_RADIUS) return 0;

  // Landasan pulau ke bibir pantai
  if (dist < ISLAND_RADIUS) {
    const t = (dist - FLAT_RADIUS) / (ISLAND_RADIUS - FLAT_RADIUS);
    const dune = Math.sin(x * 0.4) * Math.cos(z * 0.35) * 0.08;
    return -t * t * 0.9 + dune * (1.0 - t);
  }

  // Dasar laut: makin ke luar makin dalam + kontur terumbu/gundukan pasir laut
  // Kontur di-fade-in perlahan supaya tidak ada "tangga" di tepi pulau
  const seaT = Math.min(1.0, (dist - ISLAND_RADIUS) / 25.0);
  const fadeIn = THREE.MathUtils.smoothstep(seaT, 0.0, 0.5);
  const seabedContour = Math.sin(x * 0.2) * Math.cos(z * 0.2) * 0.3
                      + Math.sin(x * 0.08 + z * 0.1) * 0.5;
  return THREE.MathUtils.lerp(-0.9, SEABED_DEPTH, seaT) + seabedContour * fadeIn;
}

// Port GLSL dari sandHeight() di atas. Konstanta diambil dari JS supaya selalu sinkron.
const SAND_HEIGHT_GLSL = `
  const float FLAT_R = ${FLAT_RADIUS.toFixed(1)};
  const float ISLAND_R = ${ISLAND_RADIUS.toFixed(1)};
  const float SEABED = ${SEABED_DEPTH.toFixed(1)};

  float sandHeight(vec2 p) {
    float dist = length(p);
    if (dist <= FLAT_R) return 0.0;
    if (dist < ISLAND_R) {
      float t = (dist - FLAT_R) / (ISLAND_R - FLAT_R);
      float dune = sin(p.x * 0.4) * cos(p.y * 0.35) * 0.08;
      return -t * t * 0.9 + dune * (1.0 - t);
    }
    float seaT = min(1.0, (dist - ISLAND_R) / 25.0);
    float fadeIn = smoothstep(0.0, 0.5, seaT);
    float contour = sin(p.x * 0.2) * cos(p.y * 0.2) * 0.3
                  + sin(p.x * 0.08 + p.y * 0.1) * 0.5;
    return mix(-0.9, SEABED, seaT) + contour * fadeIn;
  }
`;

/* ---------------------------------------------------------------------------
   SAND & SEABED SHADERS (caustics jaring-jaring + pasir basah + fog)
--------------------------------------------------------------------------- */

const SAND_VERTEX = `
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vColor;

  void main() {
    vColor = color;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;

    vNormal = normalize(mat3(modelMatrix) * normal);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const SAND_FRAGMENT = `
  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uWaterLevel;
  uniform vec3 uFogColor;
  uniform float uFogDensity;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vColor;

  vec2 hash22(vec2 p) {
    float n = sin(dot(p, vec2(41.1, 289.4))) * 43758.5453123;
    return fract(vec2(n, n * 0.723));
  }

  // Perlin-like noise untuk smooth caustics pattern
  float smoothNoise(vec2 uv) {
    vec2 pi = floor(uv);
    vec2 pf = fract(uv);
    vec2 u = pf * pf * (3.0 - 2.0 * pf); // smoothstep
    
    float n00 = dot(hash22(pi + vec2(0.0, 0.0)), pf - vec2(0.0, 0.0));
    float n10 = dot(hash22(pi + vec2(1.0, 0.0)), pf - vec2(1.0, 0.0));
    float n01 = dot(hash22(pi + vec2(0.0, 1.0)), pf - vec2(0.0, 1.0));
    float n11 = dot(hash22(pi + vec2(1.0, 1.0)), pf - vec2(1.0, 1.0));
    
    float nx0 = mix(n00, n10, u.x);
    float nx1 = mix(n01, n11, u.x);
    return mix(nx0, nx1, u.y);
  }

  // Multi-layer FBM untuk caustics yang flowing dan organic
  float causticsFlow(vec2 uv, float time) {
    float value = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    float maxValue = 0.0;
    
    for (int i = 0; i < 4; i++) {
      value += amplitude * smoothNoise(uv * frequency + vec2(time * 0.15, time * 0.1));
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    
    return value / maxValue;
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uSunDir);

    // Pasir basah mengikuti swash (maju-mundurnya air di bibir pantai)
    float swash = sin(uTime * 1.2) * 0.5 + sin(uTime * 2.1) * 0.25;
    float above = vWorldPos.y - uWaterLevel;
    float wet = (1.0 - smoothstep(0.0, 0.15, above - swash * 0.06))
              * smoothstep(-1.0, -0.2, above);
    vec3 baseCol = vColor * mix(1.0, 0.75, wet);

    // Diffuse & ambient
    float diff = max(dot(N, L), 0.0);
    vec3 ambient = vec3(0.5, 0.55, 0.6) * baseCol;
    vec3 direct = uSunColor * baseCol * diff * 0.9;
    vec3 color = ambient + direct;

    // CAUSTICS: hanya di dasar yang terendam, memudar halus di tepi air
    float depth = max(uWaterLevel - vWorldPos.y, 0.0);
    float shoreFade = smoothstep(0.0, 0.15, depth);

    if (shoreFade > 0.0) {
      // Geser UV sedikit sesuai arah matahari (kesan cahaya diproyeksikan menembus air)
      vec2 cuv = vWorldPos.xz - uSunDir.xz * depth * 0.5;

      float flow = causticsFlow(cuv * 0.8, uTime);
      float caustics = sin(flow * 3.14159 + uTime * 0.5) * 0.5 + 0.5;
      caustics = pow(caustics, 2.0) * (1.0 - abs(flow) * 0.3);

      float depthFade = exp(-depth * 1.2);

      vec3 causticsColor = vec3(0.45, 0.95, 0.9) * caustics * depthFade * shoreFade * 1.2;
      color += causticsColor * max(dot(N, vec3(0.0, 1.0, 0.0)), 0.2);
    }

    // FOG (konsisten dengan laut)
    float distToCam = length(cameraPosition - vWorldPos);
    float fogAmount = 1.0 - exp(-uFogDensity * uFogDensity * distToCam * distToCam);
    color = mix(color, uFogColor, clamp(fogAmount, 0.0, 1.0));

    gl_FragColor = vec4(color, 1.0);
  }
`;

function createSandIsland(sunPosition, fogColor, fogDensity) {
  // Bidang pasir & dasar laut diperluas agar tidak menggantung di horizon
  const geometry = new THREE.PlaneGeometry(120, 120, 120, 120);
  const pos = geometry.attributes.position;
  const colors = [];
  const dry = new THREE.Color(0xe8d9b0);
  const wet = new THREE.Color(0xb29255);
  const deepBed = new THREE.Color(0x7a835a); // Warna terumbu/lumpur dasar laut dalam

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getY(i);
    const h = sandHeight(x, z);
    if (!isFinite(h)) console.warn(`[Sand] Invalid height at (${x}, ${z}): ${h}`);
    pos.setZ(i, h);

    // Gradasi Warna Pasir: Kering -> Basah -> Dasar Laut Dalam
    const c = dry.clone();
    if (h < 0.0) {
      const wetness = THREE.MathUtils.clamp(-h / 1.0, 0, 1);
      c.lerp(wet, wetness);
    }
    if (h < WATER_LEVEL) {
      const deepness = THREE.MathUtils.clamp((WATER_LEVEL - h) / 2.5, 0, 1);
      c.lerp(deepBed, deepness * 0.45);
    }

    colors.push(c.r, c.g, c.b);
  }

  geometry.computeVertexNormals();
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: sunPosition.clone().normalize() },
      uSunColor: { value: new THREE.Color(0xfff6dc) },
      uWaterLevel: { value: WATER_LEVEL },
      uFogColor: { value: new THREE.Color(fogColor) },
      uFogDensity: { value: fogDensity },
    },
    vertexShader: SAND_VERTEX,
    fragmentShader: SAND_FRAGMENT,
    vertexColors: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;

  return {
    mesh,
    update(elapsed) {
      material.uniforms.uTime.value = elapsed;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

/* ---------------------------------------------------------------------------
   OCEAN SHADERS (depth asli, swell, Jacobian foam, refleksi langit, fog)
--------------------------------------------------------------------------- */

const OCEAN_VERTEX = `
  uniform float uTime;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vHeight;
  varying float vJac;
  varying vec2 vUv;

  const float GRAVITY = 9.8;
  const float SPEED_SCALE = 0.7;

  void gerstner(vec2 p, vec2 dir, float q, float L, float A,
                inout vec3 disp, inout vec3 T, inout vec3 B) {
    float k = 6.28318530718 / L;
    float w = sqrt(GRAVITY * k) * SPEED_SCALE;
    vec2 d = normalize(dir);

    float phase = k * dot(d, p) - w * uTime;
    float c = cos(phase);
    float s = sin(phase);

    disp.xy += (q / k) * d * c;
    disp.z  += A * s;

    T += vec3(-q * d.x * d.x * s,
              -q * d.x * d.y * s,
               d.x * k * A * c);
    B += vec3(-q * d.x * d.y * s,
              -q * d.y * d.y * s,
               d.y * k * A * c);
  }

  void main() {
    vUv = uv;
    vec3 disp = vec3(0.0);
    vec3 T = vec3(1.0, 0.0, 0.0);
    vec3 B = vec3(0.0, 1.0, 0.0);

    gerstner(position.xy, vec2( 1.0, 0.2), 0.35, 26.0, 0.20, disp, T, B);
    gerstner(position.xy, vec2( 0.5, 1.0), 0.25, 14.0, 0.10, disp, T, B);
    gerstner(position.xy, vec2(-0.7, 0.6), 0.15,  8.0, 0.04, disp, T, B);
    // Swell panjang supaya permukaan tidak terlihat rata dari jauh
    gerstner(position.xy, vec2( 0.8,-0.3), 0.12, 60.0, 0.35, disp, T, B);

    // Ombak diredam mendekati pulau (shoaling) -> tidak "membanjiri" pasir
    float damp = smoothstep(8.0, 22.0, length(position.xy));
    disp *= damp;
    T = mix(vec3(1.0, 0.0, 0.0), T, damp);
    B = mix(vec3(0.0, 1.0, 0.0), B, damp);

    vec3 displaced = position + disp;

    vec3 localNormal = normalize(cross(T, B));
    vNormal = normalize(mat3(modelMatrix) * localNormal);

    // Jacobian: <1 berarti permukaan "menumpuk" (puncak ombak mau pecah)
    vJac = T.x * B.y - T.y * B.x;

    vHeight = disp.z;
    vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const OCEAN_FRAGMENT = `
  uniform float uTime;
  uniform vec3 uShallowColor;
  uniform vec3 uDeepColor;
  uniform vec3 uSkyColor;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  uniform vec3 uFogColor;
  uniform float uFogDensity;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vHeight;
  varying float vJac;
  varying vec2 vUv;

  ${SAND_HEIGHT_GLSL}

  vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float perlinNoise(vec2 p) {
    vec2 pi = floor(p);
    vec2 pf = fract(p);
    vec2 w = pf * pf * (3.0 - 2.0 * pf);

    return mix(mix(dot(hash22(pi + vec2(0.0, 0.0)), pf - vec2(0.0, 0.0)),
                   dot(hash22(pi + vec2(1.0, 0.0)), pf - vec2(1.0, 0.0)), w.x),
               mix(dot(hash22(pi + vec2(0.0, 1.0)), pf - vec2(0.0, 1.0)),
                   dot(hash22(pi + vec2(1.0, 1.0)), pf - vec2(1.0, 1.0)), w.x), w.y);
  }

  void main() {
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(uSunDir);
    float distToCam = length(cameraPosition - vWorldPos);
    vec2 posXZ = vWorldPos.xz;

    // 1. MICRO-RIPPLES (memudar di kejauhan agar tidak berkedip/aliasing)
    vec2 rippleUV1 = posXZ * 1.5 + vec2(uTime * 0.4, uTime * 0.3);
    vec2 rippleUV2 = posXZ * 3.0 - vec2(uTime * 0.5, -uTime * 0.2);

    float n1 = perlinNoise(rippleUV1);
    float n2 = perlinNoise(rippleUV2);
    vec2 microNormal = vec2(n1 + n2) * 0.08;
    microNormal *= 1.0 - smoothstep(20.0, 80.0, distToCam);

    vec3 N = normalize(vNormal + vec3(microNormal.x, 0.0, microNormal.y));

    // 2. KEDALAMAN AIR SUNGGUHAN (z dibalik karena mesh pasir di-rotate -PI/2)
    float floorY = sandHeight(vec2(vWorldPos.x, -vWorldPos.z));
    float depth = max(vWorldPos.y - floorY, 0.0);
    float clarity = exp(-depth * 0.8);   // 1 = bening/dangkal, 0 = gelap/dalam

    // 3. WARNA DASAR (+ variasi skala besar biar tidak satu warna rata)
    vec3 baseColor = mix(uDeepColor, uShallowColor, clarity);
    baseColor *= 0.92 + 0.16 * perlinNoise(posXZ * 0.05);
    float diffuse = 0.55 + 0.45 * max(dot(N, L), 0.0);
    vec3 color = baseColor * diffuse;

    // 4. SUBSURFACE SCATTERING
    float sssFactor = max(0.0, dot(V, -(L + N * 0.4)));
    sssFactor = pow(sssFactor, 3.0) * smoothstep(-0.05, 0.2, vHeight);
    color += vec3(0.2, 0.9, 0.7) * sssFactor * 0.6;

    // 5. FRESNEL + REFLEKSI LANGIT (pakai vektor refleksi)
    float NdotV = max(dot(N, V), 0.0);
    float fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 5.0);

    vec3 R = reflect(-V, N);
    vec3 skyRefl = mix(uFogColor, uSkyColor, pow(clamp(R.y, 0.0, 1.0), 0.6));
    skyRefl += uSunColor * pow(max(dot(R, L), 0.0), 64.0) * 0.5;   // glow matahari lebar
    color = mix(color, skyRefl, clamp(fresnel * 0.95, 0.0, 1.0));

    // 6. SPECULAR: lobe tajam + lobe lebar
    vec3 H = normalize(L + V);
    float NdotH = max(dot(N, H), 0.0);
    color += uSunColor * (pow(NdotH, 240.0) * 2.0 + pow(NdotH, 30.0) * 0.25);

    // 7. FOAM
    // a) Garis buih tipis di ujung air yang maju-mundur, fase beda tiap titik pantai
    float sw = 0.5 + 0.5 * sin(uTime * 0.9 + perlinNoise(posXZ * 0.35) * 4.0);
    float band = depth - sw * 0.45;
    float foamFront = 1.0 - smoothstep(0.0, 0.12, abs(band));
    // b) Sisa buih di belakang garis depan
    float foamTrail = 1.0 - smoothstep(0.0, 0.6, depth);

    float foamLace = perlinNoise(posXZ * 3.0 + uTime * 0.15);
    float lace = smoothstep(-0.1, 0.5, foamLace);

    float foam = clamp(foamFront + foamTrail * 0.4, 0.0, 1.0) * lace;

    // c) Buih di puncak ombak (berbasis Jacobian) - tune angka 0.55 / 0.25 sesuai selera
    float crestFoam = smoothstep(0.55, 0.25, vJac) * smoothstep(0.3, 0.7, foamLace);
    foam = clamp(foam + crestFoam * 0.6, 0.0, 1.0);

    color = mix(color, vec3(0.95, 0.98, 1.0), foam);

    // 8. FOG
    float fogAmount = 1.0 - exp(-uFogDensity * uFogDensity * distToCam * distToCam);
    color = mix(color, uFogColor, clamp(fogAmount, 0.0, 1.0));

    // 9. ALPHA: bening di dangkal, pekat di dalam, opak di kejauhan (sembunyikan tepi seabed)
    float alpha = mix(1.0, 0.25, clarity);
    alpha = max(alpha, smoothstep(30.0, 50.0, length(vWorldPos.xz)));
    alpha *= smoothstep(0.0, 0.08, depth);
    alpha = max(alpha, foam * smoothstep(0.0, 0.02, depth));

    gl_FragColor = vec4(color, alpha);
  }
`;

function createOcean(sunPosition, skyColor, fogColor, fogDensity) {
  const geometry = new THREE.PlaneGeometry(400, 400, 256, 256);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uShallowColor: { value: new THREE.Color(0x56e3d9) },
      uDeepColor: { value: new THREE.Color(0x0e588f) },
      uSkyColor: { value: new THREE.Color(skyColor) },
      uSunColor: { value: new THREE.Color(0xfff6dc) },
      uSunDir: { value: sunPosition.clone().normalize() },
      uFogColor: { value: new THREE.Color(fogColor) },
      uFogDensity: { value: fogDensity },
    },
    vertexShader: OCEAN_VERTEX,
    fragmentShader: OCEAN_FRAGMENT,
    transparent: true,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = WATER_LEVEL;

  function update(elapsed) {
    material.uniforms.uTime.value = elapsed;
  }
  function dispose() {
    geometry.dispose();
    material.dispose();
  }
  return { mesh, update, dispose };
}

function setupBeachLighting(scene) {
  const hemi = new THREE.HemisphereLight(0xd7f0ff, 0xe8d9b0, 0.9);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff6dc, 1.3);
  sun.position.set(20, 25, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  scene.add(sun);

  return { hemi, sun };
}

export const beachEnvironment = {
  id: "beach",
  label: "Pulau Pantai",
  create(scene) {
    const skyTop = 0x8fd8ff;
    const sky = createSky();
    sky.material.uniforms.topColor.value.set(skyTop);
    sky.material.uniforms.bottomColor.value.set(0xffffff);
    scene.add(sky);

    const fogColor = 0xf3f7fa;
    const fogDensity = 0.008;
    scene.fog = new THREE.FogExp2(fogColor, fogDensity);
    scene.background = new THREE.Color(fogColor);

    const { hemi, sun } = setupBeachLighting(scene);

    // Arah matahari & fog dikirim ke pasir (caustics + fog konsisten dengan laut)
    const sand = createSandIsland(sun.position, fogColor, fogDensity);
    scene.add(sand.mesh);

    const ocean = createOcean(sun.position, skyTop, fogColor, fogDensity);
    scene.add(ocean.mesh);

    const birds = createBirdFlock(14, { scale: 1.4, radiusRange: [22, 38], heightRange: [10, 18] });
    scene.add(birds.group);
    birds.group.visible = true;

    return {
      update(elapsed) {
        sand.update(elapsed);  // uTime: caustics + swash pasir basah
        ocean.update(elapsed); // uTime: gelombang
        birds.update(elapsed);
      },
      dispose() {
        scene.remove(sky, sand.mesh, ocean.mesh, birds.group, hemi, sun);
        sand.dispose();
        ocean.dispose();
        scene.fog = null;
      },
    };
  },
};