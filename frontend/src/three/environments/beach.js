import * as THREE from "three";
import { createSky } from "../environment";
import { createBirdFlock } from "../birds";

const FLAT_RADIUS = 9;   
const ISLAND_RADIUS = 16; 
const WATER_LEVEL = -0.35; 
const SEABED_DEPTH = -3.2;

// Kalkulasi profil tinggi pulau & dasar laut
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
  const seaT = Math.min(1.0, (dist - ISLAND_RADIUS) / 25.0);
  const seabedContour = Math.sin(x * 0.2) * Math.cos(z * 0.2) * 0.3 
                      + Math.sin(x * 0.08 + z * 0.1) * 0.5;
  return THREE.MathUtils.lerp(-0.9, SEABED_DEPTH, seaT) + seabedContour;
}

/* ---------------------------------------------------------------------------
   SAND & SEABED SHADERS (WITH VOXEL-LIKE CAUSTICS LIGHTING)
--------------------------------------------------------------------------- */

const SAND_VERTEX = `
  uniform float uWaterLevel;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vColor;

  void main() {
    vColor = color;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    
    // Normal matriks dunia
    vNormal = normalize(mat3(modelMatrix) * normal);
    
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const SAND_FRAGMENT = `
  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uWaterLevel;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vColor;

  // Voronoi Noise Generator untuk Caustics
  vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
  }

  float voronoiCaustics(vec2 uv) {
    vec2 p = floor(uv);
    vec2 f = fract(uv);
    float minDist = 1.0;

    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 lattice = vec2(float(x), float(y));
        vec2 offset = hash22(p + lattice);
        
        // Animasi tarian jaring cahaya
        offset = 0.5 + 0.5 * sin(uTime * 1.6 + 6.28318 * offset);
        vec2 r = lattice + offset - f;
        float d = dot(r, r);
        minDist = min(minDist, d);
      }
    }
    return sqrt(minDist);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uSunDir);

    // Standard Diffuse & Ambient Lighting untuk Pasir
    float diff = max(dot(N, L), 0.0);
    vec3 ambient = vec3(0.5, 0.55, 0.6) * vColor;
    vec3 direct = uSunColor * vColor * diff * 0.9;
    vec3 color = ambient + direct;

    // LIGHT CAUSTICS: Hanya muncul di pasir/dasar laut yang terendam air
    if (vWorldPos.y < uWaterLevel) {
      float depth = uWaterLevel - vWorldPos.y;

      // 2 layer Voronoi Caustics bergerak menyilang
      vec2 uv1 = vWorldPos.xz * 1.3 + vec2(uTime * 0.12, uTime * 0.08);
      vec2 uv2 = vWorldPos.xz * 2.1 - vec2(uTime * 0.09, -uTime * 0.15);

      float c1 = voronoiCaustics(uv1);
      float c2 = voronoiCaustics(uv2);
      float causticsPattern = min(c1, c2);

      // Pertajam struktur garis jaring-jaring cahaya
      causticsPattern = pow(1.0 - causticsPattern, 3.5);

      // Penyerapan cahaya seiring kedalaman air (Deep Fade)
      float depthFade = exp(-depth * 0.85);

      // Tambahkan kilau caustics toska terang ke pasir laut
      vec3 causticsColor = vec3(0.4, 0.92, 0.85) * causticsPattern * depthFade * 2.2;
      color += causticsColor * max(dot(N, vec3(0.0, 1.0, 0.0)), 0.2); // Lebih terang di bidang datar
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

function createSandIsland(sunPosition) {
  console.log("[Sand] Creating sand island...");
  // Perluas bidang pasir & dasar laut agar tidak menggantung di horizon
  const geometry = new THREE.PlaneGeometry(120, 120, 120, 120);
  const pos = geometry.attributes.position;
  console.log("[Sand] Geometry created with", pos.count, "vertices");
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
    let c = dry.clone();
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
    },
    vertexShader: SAND_VERTEX,
    fragmentShader: SAND_FRAGMENT,
    vertexColors: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  console.log("[Sand] Mesh created and rotated");

  return {
    mesh,
    update(elapsed) {
      material.uniforms.uTime.value = elapsed;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    }
  };
}

/* ---------------------------------------------------------------------------
   OCEAN SHADERS (Micro-ripples, SSS, Shoreline Foam & Fog)
--------------------------------------------------------------------------- */

const OCEAN_VERTEX = `
  uniform float uTime;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vHeight;
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

    vec3 displaced = position + disp;

    vec3 localNormal = normalize(cross(T, B));
    vNormal = normalize(mat3(modelMatrix) * localNormal); 

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
  uniform float uShoreRadius;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vHeight;
  varying vec2 vUv;

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

    // 1. MICRO-RIPPLES
    vec2 posXZ = vWorldPos.xz;
    vec2 rippleUV1 = posXZ * 1.5 + vec2(uTime * 0.4, uTime * 0.3);
    vec2 rippleUV2 = posXZ * 3.0 - vec2(uTime * 0.5, -uTime * 0.2);
    
    float n1 = perlinNoise(rippleUV1);
    float n2 = perlinNoise(rippleUV2);
    vec2 microNormal = vec2(n1 + n2) * 0.08; 

    vec3 N = normalize(vNormal + vec3(microNormal.x, 0.0, microNormal.y));

    // 2. BASE WATER COLOR
    float distToCenter = length(vWorldPos.xz);
    float depthFactor = smoothstep(9.0, 45.0, distToCenter);
    vec3 baseColor = mix(uShallowColor, uDeepColor, depthFactor);

    float diffuse = 0.55 + 0.45 * max(dot(N, L), 0.0);
    vec3 color = baseColor * diffuse;

    // 3. SUBSURFACE SCATTERING
    float sssFactor = max(0.0, dot(V, -(L + N * 0.4)));
    sssFactor = pow(sssFactor, 3.0) * smoothstep(-0.05, 0.2, vHeight);
    vec3 sssColor = vec3(0.2, 0.9, 0.7) * sssFactor * 0.6; 
    color += sssColor;

    // 4. FRESNEL REFLECTION
    float NdotV = max(dot(N, V), 0.0);
    float fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 5.0);
    color = mix(color, uSkyColor, clamp(fresnel * 0.95, 0.0, 1.0));

    // 5. SPECULAR SUN HIGHLIGHT
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 240.0);
    color += uSunColor * spec * 2.0;

    // 6. DYNAMIC SHORELINE FOAM
    float shoreDist = distToCenter - uShoreRadius;
    float swash = sin(uTime * 1.2) * 0.5 + sin(uTime * 2.1) * 0.25; 
    float foamBand = smoothstep(1.5, -0.2, shoreDist + swash);
    float foamLace = perlinNoise(posXZ * 2.5 + uTime * 0.15);
    float foam = foamBand * smoothstep(0.1, 0.6, foamLace + foamBand * 0.5);
    
    float crestFoam = smoothstep(0.16, 0.22, vHeight) * smoothstep(0.3, 0.7, foamLace);
    foam = clamp(foam + crestFoam, 0.0, 1.0);

    color = mix(color, vec3(0.95, 0.98, 1.0), foam);

    // 7. ATMOSPHERIC FOG BLENDING
    float distToCam = length(cameraPosition - vWorldPos);
    float fogAmount = 1.0 - exp(-uFogDensity * uFogDensity * distToCam * distToCam);
    color = mix(color, uFogColor, clamp(fogAmount, 0.0, 1.0));

    float alpha = mix(0.5, 0.93, depthFactor);
    alpha = max(alpha, foam);

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
      uShoreRadius: { value: FLAT_RADIUS + 0.5 * (ISLAND_RADIUS - FLAT_RADIUS) },
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
    console.log("[Beach] Creating beach environment...");
    const skyTop = 0x8fd8ff;
    const sky = createSky(); 
    sky.material.uniforms.topColor.value.set(skyTop);
    sky.material.uniforms.bottomColor.value.set(0xffffff);
    scene.add(sky);
    console.log("[Beach] Sky added");

    const fogColor = 0xf3f7fa;
    const fogDensity = 0.008;
    scene.fog = new THREE.FogExp2(fogColor, fogDensity); 
    scene.background = new THREE.Color(fogColor);

    const { hemi, sun } = setupBeachLighting(scene);
    console.log("[Beach] Lighting setup, sun at", sun.position);

    // Kirim sun.position ke pasir agar arah kalkulasi caustics presisi dengan arah matahari
    const sand = createSandIsland(sun.position);
    scene.add(sand.mesh);
    console.log("[Beach] Sand island added, mesh:", sand.mesh);

    const ocean = createOcean(sun.position, skyTop, fogColor, fogDensity);
    scene.add(ocean.mesh);
    console.log("[Beach] Ocean added, mesh:", ocean.mesh);

    const birds = createBirdFlock(14, { scale: 1.4, radiusRange: [22, 38], heightRange: [10, 18] });
    scene.add(birds.group);
    birds.group.visible = true;
    console.log("[Beach] Birds added");

    return {
      update(elapsed) {
        sand.update(elapsed);  // Update uniform uTime caustics
        ocean.update(elapsed); // Update uniform uTime gelombang
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