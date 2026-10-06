import * as THREE from "three";
import { createSky } from "../environment";
import { createBirdFlock } from "../birds";
import { createKraken } from "../kraken";
import { createClouds } from "../clouds";
import { createPalmGrove } from "../palmTrees";
import { createRockFormations } from "../rocks";
import { createWeatherSystem } from "../weather";

const FLAT_RADIUS = 9;
const ISLAND_RADIUS = 16;
const WATER_LEVEL = -0.35;
const SEABED_DEPTH = -3.2;
const COAST_VARIATION = 5.0;
const ROCKY_ANGLE = -0.9;
const ROCKY_WIDTH = 0.6;
const ROCKY_HEIGHT = 1.6;

function angleDist(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function coastlineNoise(angle) {
  return (
    Math.sin(angle * 2.0 + 1.3) * 0.5 +
    Math.sin(angle * 5.0 + 4.1) * 0.3 +
    Math.sin(angle * 9.0 + 2.7) * 0.15
  );
}

function islandRadiusAt(angle) {
  const r = ISLAND_RADIUS + coastlineNoise(angle) * COAST_VARIATION;
  return Math.max(r, FLAT_RADIUS + 6);
}

function smoothstepJs(edge0, edge1, x) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function sandHeight(x, z) {
  const dist = Math.sqrt(x * x + z * z);
  if (dist <= FLAT_RADIUS) return 0;

  const angle = Math.atan2(z, x);
  const islandR = islandRadiusAt(angle);

  if (dist < islandR) {
    const t = (dist - FLAT_RADIUS) / (islandR - FLAT_RADIUS);

    const gentleAngle = ROCKY_ANGLE + Math.PI;
    const sharpness = THREE.MathUtils.lerp(
      3.0,
      1.3,
      0.5 + 0.5 * Math.cos(angleDist(angle, gentleAngle)),
    );
    const base = -Math.pow(t, sharpness) * 0.9;

    const dune = Math.sin(x * 0.4) * Math.cos(z * 0.35) * 0.08;

    const rockyMask = smoothstepJs(
      ROCKY_WIDTH,
      0,
      Math.abs(angleDist(angle, ROCKY_ANGLE)),
    );
    const radialMask =
      smoothstepJs(0.1, 0.35, t) * (1 - smoothstepJs(0.55, 0.85, t));
    const rockyBump = rockyMask * radialMask * ROCKY_HEIGHT;

    return base + dune * (1 - t) + rockyBump;
  }

  const seaT = Math.min(1.0, (dist - islandR) / 25.0);
  const fadeIn = smoothstepJs(0.0, 0.5, seaT);
  const seabedContour =
    Math.sin(x * 0.2) * Math.cos(z * 0.2) * 0.3 +
    Math.sin(x * 0.08 + z * 0.1) * 0.5;
  return (
    THREE.MathUtils.lerp(-0.9, SEABED_DEPTH, seaT) + seabedContour * fadeIn
  );
}

function worldAngleAndRadius(worldX, worldZ) {
  const angle = Math.atan2(-worldZ, worldX);
  return { angle, islandR: islandRadiusAt(angle) };
}

function worldHeightAt(worldX, worldZ) {
  return sandHeight(worldX, -worldZ);
}

function palmValidSpot(x, z, dist) {
  const { angle, islandR } = worldAngleAndRadius(x, z);
  if (dist < FLAT_RADIUS + 2) return false;
  if (dist > islandR - 0.8) return false;
  if (Math.abs(angleDist(angle, ROCKY_ANGLE)) < ROCKY_WIDTH * 1.3) return false;
  return true;
}

function rockValidSpot(x, z, dist) {
  const { angle, islandR } = worldAngleAndRadius(x, z);
  const nearShore = dist > islandR - 4 && dist < islandR + 1.5;
  if (!nearShore) return false;
  const nearHeadland =
    Math.abs(angleDist(angle, ROCKY_ANGLE)) < ROCKY_WIDTH * 1.4;
  return nearHeadland || Math.random() < 0.25;
}

// Port GLSL dari sandHeight() di atas. Konstanta diambil dari JS supaya selalu sinkron.
const SAND_HEIGHT_GLSL = `
    const float FLAT_R = ${FLAT_RADIUS.toFixed(4)};
    const float ISLAND_R = ${ISLAND_RADIUS.toFixed(4)};
    const float SEABED = ${SEABED_DEPTH.toFixed(4)};
    const float COAST_VAR = ${COAST_VARIATION.toFixed(4)};
    const float ROCKY_A = ${ROCKY_ANGLE.toFixed(4)};
    const float ROCKY_W = ${ROCKY_WIDTH.toFixed(4)};
    const float ROCKY_H = ${ROCKY_HEIGHT.toFixed(4)};
    const float PI2 = 3.14159265;

    float angleDistG(float a, float b) {
      return atan(sin(a - b), cos(a - b));
    }

    float coastlineNoiseG(float angle) {
      return sin(angle * 2.0 + 1.3) * 0.5
           + sin(angle * 5.0 + 4.1) * 0.3
           + sin(angle * 9.0 + 2.7) * 0.15;
    }

    float islandRadiusAtG(float angle) {
      float r = ISLAND_R + coastlineNoiseG(angle) * COAST_VAR;
      return max(r, FLAT_R + 6.0);
    }

    float sandHeight(vec2 p) {
      float dist = length(p);
      if (dist <= FLAT_R) return 0.0;

      float angle = atan(p.y, p.x);
      float islandR = islandRadiusAtG(angle);

      if (dist < islandR) {
        float t = (dist - FLAT_R) / (islandR - FLAT_R);

        float gentleAngle = ROCKY_A + PI2;
        float sharpness = mix(3.0, 1.3, 0.5 + 0.5 * cos(angleDistG(angle, gentleAngle)));
        float base = -pow(t, sharpness) * 0.9;

        float dune = sin(p.x * 0.4) * cos(p.y * 0.35) * 0.08;

        float rockyMask = smoothstep(ROCKY_W, 0.0, abs(angleDistG(angle, ROCKY_A)));
        float radialMask = smoothstep(0.1, 0.35, t) * (1.0 - smoothstep(0.55, 0.85, t));
        float rockyBump = rockyMask * radialMask * ROCKY_H;

        return base + dune * (1.0 - t) + rockyBump;
      }

      float seaT = min(1.0, (dist - islandR) / 25.0);
      float fadeIn = smoothstep(0.0, 0.5, seaT);
      float contour = sin(p.x * 0.2) * cos(p.y * 0.2) * 0.3
                    + sin(p.x * 0.08 + p.y * 0.1) * 0.5;
      return mix(-0.9, SEABED, seaT) + contour * fadeIn;
    }
  `;

/* ---------------------------------------------------------------------------
   SAND & SEABED SHADERS
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
    uniform float uStorm;
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

    float smoothNoise(vec2 uv) {
      vec2 pi = floor(uv);
      vec2 pf = fract(uv);
      vec2 u = pf * pf * (3.0 - 2.0 * pf);

      float n00 = dot(hash22(pi + vec2(0.0, 0.0)), pf - vec2(0.0, 0.0));
      float n10 = dot(hash22(pi + vec2(1.0, 0.0)), pf - vec2(1.0, 0.0));
      float n01 = dot(hash22(pi + vec2(0.0, 1.0)), pf - vec2(0.0, 1.0));
      float n11 = dot(hash22(pi + vec2(1.0, 1.0)), pf - vec2(1.0, 1.0));

      float nx0 = mix(n00, n10, u.x);
      float nx1 = mix(n01, n11, u.x);
      return mix(nx0, nx1, u.y);
    }

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

      float swash = sin(uTime * 1.2) * 0.5 + sin(uTime * 2.1) * 0.25;
      float above = vWorldPos.y - uWaterLevel;
      float wet = (1.0 - smoothstep(0.0, 0.15, above - swash * 0.06))
                * smoothstep(-1.0, -0.2, above);
      vec3 baseCol = vColor * mix(1.0, 0.75, wet);

      float diff = max(dot(N, L), 0.0);
      vec3 ambient = vec3(0.5, 0.55, 0.6) * baseCol;
      vec3 direct = uSunColor * baseCol * diff * 0.9;
      vec3 color = ambient + direct;

      float depth = max(uWaterLevel - vWorldPos.y, 0.0);
      float shoreFade = smoothstep(0.0, 0.15, depth);

      if (shoreFade > 0.0) {
        vec2 cuv = vWorldPos.xz - uSunDir.xz * depth * 0.5;

        float flow = causticsFlow(cuv * 0.8, uTime);
        float caustics = sin(flow * 3.14159 + uTime * 0.5) * 0.5 + 0.5;
        caustics = pow(caustics, 2.0) * (1.0 - abs(flow) * 0.3);

        float depthFade = exp(-depth * 1.2);

        vec3 causticsColor = vec3(0.45, 0.95, 0.9) * caustics * depthFade * shoreFade * 1.2;
        color += causticsColor * max(dot(N, vec3(0.0, 1.0, 0.0)), 0.2);
      }

      float distToCam = length(cameraPosition - vWorldPos);
      float fogAmount = 1.0 - exp(-uFogDensity * uFogDensity * distToCam * distToCam);
      color = mix(color, uFogColor, clamp(fogAmount, 0.0, 1.0));

      gl_FragColor = vec4(color, 1.0);
    }
  `;

function createSandIsland(sunPosition, fogColor, fogDensity) {
  const geometry = new THREE.PlaneGeometry(120, 120, 120, 120);
  const pos = geometry.attributes.position;
  const colors = [];
  const dry = new THREE.Color(0xe8d9b0);
  const wet = new THREE.Color(0xb29255);
  const deepBed = new THREE.Color(0x7a835a);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getY(i);
    const h = sandHeight(x, z);
    if (!isFinite(h)) console.warn(`[Sand] Invalid height at (${x}, ${z}): ${h}`);
    pos.setZ(i, h);

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
      uStorm: { value: 0 },
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

  function update(elapsed) {
    material.uniforms.uTime.value = elapsed;
  }
  function dispose() {
    geometry.dispose();
    material.dispose();
  }

  return { mesh, material, update, dispose };
}

/* ---------------------------------------------------------------------------
   OCEAN SHADERS
--------------------------------------------------------------------------- */

const OCEAN_VERTEX = `
    uniform float uTime;
    uniform float uStorm;
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
      gerstner(position.xy, vec2( 0.8,-0.3), 0.12, 60.0, 0.35, disp, T, B);
      gerstner(position.xy, vec2( 0.4, 0.9), 0.3, 5.0, 0.18 * uStorm, disp, T, B);

      float damp = smoothstep(8.0, 22.0, length(position.xy));
      disp *= damp;
      T = mix(vec3(1.0, 0.0, 0.0), T, damp);
      B = mix(vec3(0.0, 1.0, 0.0), B, damp);

      vec3 displaced = position + disp;

      vec3 localNormal = normalize(cross(T, B));
      vNormal = normalize(mat3(modelMatrix) * localNormal);

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
    uniform float uStorm;

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

      vec2 rippleUV1 = posXZ * 1.5 + vec2(uTime * 0.4, uTime * 0.3);
      vec2 rippleUV2 = posXZ * 3.0 - vec2(uTime * 0.5, -uTime * 0.2);

      float n1 = perlinNoise(rippleUV1);
      float n2 = perlinNoise(rippleUV2);
      vec2 microNormal = vec2(n1 + n2) * 0.08;
      microNormal *= 1.0 - smoothstep(20.0, 80.0, distToCam);

      vec3 N = normalize(vNormal + vec3(microNormal.x, 0.0, microNormal.y));

      float floorY = sandHeight(vec2(vWorldPos.x, -vWorldPos.z));
      float depth = max(vWorldPos.y - floorY, 0.0);
      float clarity = exp(-depth * 0.8);

      vec3 baseColor = mix(uDeepColor, uShallowColor, clarity);
      baseColor *= 0.92 + 0.16 * perlinNoise(posXZ * 0.05);
      float diffuse = 0.55 + 0.45 * max(dot(N, L), 0.0);
      vec3 color = baseColor * diffuse;

      float sssFactor = max(0.0, dot(V, -(L + N * 0.4)));
      sssFactor = pow(sssFactor, 3.0) * smoothstep(-0.05, 0.2, vHeight);
      color += vec3(0.2, 0.9, 0.7) * sssFactor * 0.6;

      float NdotV = max(dot(N, V), 0.0);
      float fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 5.0);

      vec3 R = reflect(-V, N);
      vec3 skyRefl = mix(uFogColor, uSkyColor, pow(clamp(R.y, 0.0, 1.0), 0.6));
      skyRefl += uSunColor * pow(max(dot(R, L), 0.0), 64.0) * 0.5;
      color = mix(color, skyRefl, clamp(fresnel * 0.95, 0.0, 1.0));

      vec3 H = normalize(L + V);
      float NdotH = max(dot(N, H), 0.0);
      color += uSunColor * (pow(NdotH, 240.0) * 2.0 + pow(NdotH, 30.0) * 0.25);

      float sw = 0.5 + 0.5 * sin(uTime * 0.9 + perlinNoise(posXZ * 0.35) * 4.0);
      float band = depth - sw * 0.45;
      float foamFront = 1.0 - smoothstep(0.0, 0.12, abs(band));
      float foamTrail = 1.0 - smoothstep(0.0, 0.6, depth);

      float foamLace = perlinNoise(posXZ * 3.0 + uTime * 0.15);
      float lace = smoothstep(-0.1, 0.5, foamLace);

      float foam = clamp(foamFront + foamTrail * 0.4, 0.0, 1.0) * lace;

      float crestFoam = smoothstep(0.55, 0.25, vJac) * smoothstep(0.3, 0.7, foamLace);
      foam = clamp(foam + crestFoam * 0.6, 0.0, 1.0);
      foam = clamp(foam + uStorm * foamLace * 0.35, 0.0, 1.0);
      color = mix(color, vec3(0.12, 0.15, 0.19), uStorm * 0.55);

      color = mix(color, vec3(0.95, 0.98, 1.0), foam);

      float fogAmount = 1.0 - exp(-uFogDensity * uFogDensity * distToCam * distToCam);
      color = mix(color, uFogColor, clamp(fogAmount, 0.0, 1.0));

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
      uStorm: { value: 0 },
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
  return { mesh, material, update, dispose };
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

    const sand = createSandIsland(sun.position, fogColor, fogDensity);
    scene.add(sand.mesh);

    const ocean = createOcean(sun.position, skyTop, fogColor, fogDensity);
    scene.add(ocean.mesh);

    const birds = createBirdFlock(14, {
      scale: 1.4,
      radiusRange: [22, 38],
      heightRange: [10, 18],
    });
    scene.add(birds.group);
    birds.group.visible = true;

    const clouds = createClouds(12, {
      windDirection: new THREE.Vector2(1, 0.25),
      windSpeed: 0.8,
      opacity: 0.9,
    });
    scene.add(clouds.group);

    const palms = createPalmGrove(16, {
      heightSampler: worldHeightAt,
      isValidSpot: palmValidSpot,
    });
    scene.add(palms.group);

    const rocks = createRockFormations(12, {
      heightSampler: worldHeightAt,
      isValidSpot: rockValidSpot,
    });
    scene.add(rocks.group);

    const weather = createWeatherSystem({
      scene,
      hemi,
      sun,
      sandMaterial: sand.material,
      oceanMaterial: ocean.material,
      sky,
      clouds,
      waterLevel: WATER_LEVEL,
      calm: {
        fogColor: new THREE.Color(fogColor),
        fogDensity,
        skyTop: new THREE.Color(skyTop),
        skyBottom: new THREE.Color(0xffffff),
        hemiColor: new THREE.Color(0xd7f0ff),
        hemiGround: new THREE.Color(0xe8d9b0),
        hemiIntensity: 0.9,
        sunColor: new THREE.Color(0xfff6dc),
        sunIntensity: 1.3,
      },
      storm: {
        fogColor: new THREE.Color(0x3a4048),
        fogDensity: fogDensity * 3.2,
        skyTop: new THREE.Color(0x232b33),
        skyBottom: new THREE.Color(0x4a535c),
        hemiColor: new THREE.Color(0x3a4048),
        hemiGround: new THREE.Color(0x1c2228),
        hemiIntensity: 0.35,
        sunColor: new THREE.Color(0x6b7580),
        sunIntensity: 0.3,
      },
      calmRange: [30, 55],
      stormRange: [20, 35],
      transitionDuration: 7,
      onEvent: (name) => {
        // hook buat sound effect / camera shake nanti
      },
    });
    scene.add(weather.group);

    const kraken = createKraken({
      waterY: WATER_LEVEL,
      targetSize: 7,
      center: [0, 0],
      radiusRange: [28, 42],
      angleRange: [Math.PI * 0.15, Math.PI * 0.85],
      hiddenRange: [8, 20],
      lurkRange: [4, 8],
      riseDuration: 3,
      diveDuration: 2.5,
      surfaceSubmerge: 0.45,
      facingOffset: 0,
    });
    kraken.group.traverse((o) => {
      if (o.isMesh && o.material.transparent) o.renderOrder = 2;
    });
    scene.add(kraken.group);

    return {
      update(elapsed, delta) {
        const { intensity } = weather.update(elapsed, delta);
        sand.update(elapsed);
        ocean.update(elapsed);
        birds.update(elapsed);
        birds.group.visible = intensity < 0.4;
        kraken.update(elapsed);
        clouds.update(elapsed, delta);
        palms.update(elapsed, 1 + intensity * 3);
      },
      dispose() {
        scene.remove(
          sky,
          sand.mesh,
          ocean.mesh,
          birds.group,
          hemi,
          sun,
          kraken.group,
          clouds.group,
          palms.group,
          rocks.group,
          weather.group,
        );
        sand.dispose();
        ocean.dispose();
        kraken.dispose();
        clouds.dispose();
        palms.dispose();
        rocks.dispose();
        weather.dispose();
        scene.fog = null;
      },
    };
  },
};