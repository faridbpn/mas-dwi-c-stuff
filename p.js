import * as THREE from "three";
import { createSky } from "../environment";
import { createBirdFlock } from "../birds";

const FLAT_RADIUS = 9;   
const ISLAND_RADIUS = 16; 
const WATER_LEVEL = -0.35; 
const SEABED_DEPTH = -3.5;

// FIXED: Kalkulasi profil tinggi pulau & dasar laut yang presisi
function sandHeight(x, z) {
  const dist = Math.sqrt(x * x + z * z);
  
  // 1. Bagian Tengah Pulau (Darat Kering di atas permukaan air)
  if (dist <= FLAT_RADIUS) {
    const centreDune = Math.sin(x * 0.3) * Math.cos(z * 0.3) * 0.15;
    return 0.2 + centreDune; // Tinggi daratan +0.2m (di atas air -0.35m)
  }
  
  // 2. Lereng Pantai (Transisi dari darat ke bibir air)
  if (dist < ISLAND_RADIUS) {
    const t = (dist - FLAT_RADIUS) / (ISLAND_RADIUS - FLAT_RADIUS);
    const dune = Math.sin(x * 0.4) * Math.cos(z * 0.35) * 0.08;
    // Turun perlahan dari +0.2 m ke -0.6 m (melewati air di -0.35 m)
    return THREE.MathUtils.lerp(0.2, -0.6, t * t) + dune * (1.0 - t);
  }

  // 3. Dasar Laut Dalam (Landai meluncur ke kedalaman)
  const seaT = Math.min(1.0, (dist - ISLAND_RADIUS) / 30.0);
  const seabedContour = Math.sin(x * 0.15) * Math.cos(z * 0.15) * 0.35 
                      + Math.sin(x * 0.05 + z * 0.08) * 0.4;
  
  // Smoothstep agar penurunan dari pantai ke laut dalam terasa halus
  const smoothSeaT = THREE.MathUtils.smoothstep(seaT, 0.0, 1.0);
  return THREE.MathUtils.lerp(-0.6, SEABED_DEPTH, smoothSeaT) + seabedContour;
}

/* ---------------------------------------------------------------------------
   SAND & SEABED SHADERS
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

    float diff = max(dot(N, L), 0.0);
    vec3 ambient = vec3(0.5, 0.55, 0.6) * vColor;
    vec3 direct = uSunColor * vColor * diff * 0.9;
    vec3 color = ambient + direct;

    // LIGHT CAUSTICS: Hanya dihitung pada posisi di bawah permukaan air
    if (vWorldPos.y < uWaterLevel) {
      float depth = uWaterLevel - vWorldPos.y;

      vec2 uv1 = vWorldPos.xz * 1.3 + vec2(uTime * 0.12, uTime * 0.08);
      vec2 uv2 = vWorldPos.xz * 2.1 - vec2(uTime * 0.09, -uTime * 0.15);

      float c1 = voronoiCaustics(uv1);
      float c2 = voronoiCaustics(uv2);
      float causticsPattern = min(c1, c2);

      causticsPattern = pow(1.0 - causticsPattern, 3.5);

      float depthFade = exp(-depth * 0.7);

      vec3 causticsColor = vec3(0.4, 0.92, 0.85) * causticsPattern * depthFade * 2.2;
      color += causticsColor * max(dot(N, vec3(0.0, 1.0, 0.0)), 0.2);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

function createSandIsland(sunPosition) {
  const geometry = new THREE.PlaneGeometry(120, 120, 120, 120);
  const pos = geometry.attributes.position;
  const colors = [];
  const dry = new THREE.Color(0xe8d9b0);
  const wet = new THREE.Color(0xb29255);
  const deepBed = new THREE.Color(0x5a634a);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getY(i); // Koordinat Y lokal plane mewakili Z dunia setelah rotasi
    const h = sandHeight(x, z);
    
    pos.setZ(i, h); // Set ketinggian lokal (akan jadi sumbu Y dunia)

    // Gradasi Warna berdasarkan Ketinggian Sebenarnya terhadap Air
    let c = dry.clone();
    if (h < WATER_LEVEL + 0.2) {
      // Pasir basah di dekat garis pantai
      const wetness = THREE.MathUtils.clamp((WATER_LEVEL + 0.2 - h) / 0.6, 0, 1);
      c.lerp(wet, wetness);
    }
    if (h < WATER_LEVEL) {
      // Dasar laut makin gelap/berlumut seiring kedalaman
      const deepness = THREE.MathUtils.clamp((WATER_LEVEL - h) / 3.0, 0, 1);
      c.lerp(deepBed, deepness * 0.6);
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
    }
  };
}