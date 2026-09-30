import * as THREE from "three";
import { createSky } from "../environment";
import { createBirdFlock } from "../birds";

const FLAT_RADIUS = 9;   
const ISLAND_RADIUS = 15; 
const WATER_LEVEL = -0.35; 

function sandHeight(x, z) {
  const dist = Math.sqrt(x * x + z * z);
  if (dist <= FLAT_RADIUS) return 0;
  if (dist >= ISLAND_RADIUS) return -1.4;
  const t = (dist - FLAT_RADIUS) / (ISLAND_RADIUS - FLAT_RADIUS);
  const dune = Math.sin(x * 0.4) * Math.cos(z * 0.35) * 0.06;
  return -t * t * 1.4 + dune * (1 - t); 
}

function createSandIsland() {
  const geometry = new THREE.PlaneGeometry(60, 60, 50, 50);
  const pos = geometry.attributes.position;
  const colors = [];
  const dry = new THREE.Color(0xe8d9b0);
  const wet = new THREE.Color(0xc2a76b);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const h = sandHeight(x, y);
    pos.setZ(i, h);
    const wetness = THREE.MathUtils.clamp(-h / 1.4, 0, 1);
    const c = dry.clone().lerp(wet, wetness); 
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

/* ---------------------------------------------------------------------------
   OCEAN SHADERS (UPGRADED: Micro-ripples, SSS, Shoreline Foam & Fog)
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

  // Procedural Noise Generator untuk Micro Ripples & Buih
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

    // 1. MICRO-RIPPLES (Noise Normal Perturbation)
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

    // Diffuse lighting
    float diffuse = 0.55 + 0.45 * max(dot(N, L), 0.0);
    vec3 color = baseColor * diffuse;

    // 3. SUBSURFACE SCATTERING (Puncak gelombang berpijar saat kena cahaya)
    float sssFactor = max(0.0, dot(V, -(L + N * 0.4)));
    sssFactor = pow(sssFactor, 3.0) * smoothstep(-0.05, 0.2, vHeight);
    vec3 sssColor = vec3(0.2, 0.9, 0.7) * sssFactor * 0.6; 
    color += sssColor;

    // 4. FRESNEL REFLECTION
    float NdotV = max(dot(N, V), 0.0);
    float fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 5.0);
    color = mix(color, uSkyColor, clamp(fresnel * 0.95, 0.0, 1.0));

    // 5. SPECULAR SUN HIGHLIGHT (Sharp & Micro-sparkles)
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 240.0);
    color += uSunColor * spec * 2.0;

    // 6. DYNAMIC SHORELINE FOAM (Buih Pantai)
    float shoreDist = distToCenter - uShoreRadius;
    float swash = sin(uTime * 1.2) * 0.5 + sin(uTime * 2.1) * 0.25; // pergerakan ombak maju-mundur
    float foamBand = smoothstep(1.5, -0.2, shoreDist + swash);
    float foamLace = perlinNoise(posXZ * 2.5 + uTime * 0.15);
    float foam = foamBand * smoothstep(0.1, 0.6, foamLace + foamBand * 0.5);
    
    // Tambah sedikit foam di puncak ombak tinggi
    float crestFoam = smoothstep(0.16, 0.22, vHeight) * smoothstep(0.3, 0.7, foamLace);
    foam = clamp(foam + crestFoam, 0.0, 1.0);

    color = mix(color, vec3(0.95, 0.98, 1.0), foam);

    // 7. ATMOSPHERIC FOG BLENDING (Persatuan dengan Horizon)
    float distToCam = length(cameraPosition - vWorldPos);
    float fogAmount = 1.0 - exp(-uFogDensity * uFogDensity * distToCam * distToCam);
    color = mix(color, uFogColor, clamp(fogAmount, 0.0, 1.0));

    // Alpha: makin dangkal makin bening (kecuali ada buih)
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
    depthWrite: false, // Biar transparansi air tidak menutupi sand island secara kaku
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

    const sand = createSandIsland();
    scene.add(sand);

    const ocean = createOcean(sun.position, skyTop, fogColor, fogDensity);
    scene.add(ocean.mesh);

    const birds = createBirdFlock(14, { scale: 1.4, radiusRange: [22, 38], heightRange: [10, 18] });
    scene.add(birds.group);
    birds.group.visible = true; 

    return {
      update(elapsed) {
        ocean.update(elapsed);
        birds.update(elapsed);
      },
      dispose() {
        scene.remove(sky, sand, ocean.mesh, birds.group, hemi, sun);
        ocean.dispose();
        scene.fog = null;
      },
    };
  },
};