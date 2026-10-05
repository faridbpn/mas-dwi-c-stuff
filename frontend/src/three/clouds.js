import * as THREE from "three";

// Tekstur gumpalan awan di-generate SEKALI doang
let sharedCloudTexture = null;
function getCloudTexture() {
  if (sharedCloudTexture) return sharedCloudTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.8, "rgba(255,255,255,0.2)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  sharedCloudTexture = new THREE.CanvasTexture(canvas);
  return sharedCloudTexture;
}

// 1 gerombolan awan = beberapa sprite ditumpuk acak
function createCloudBlob({ puffCount, radius, baseOpacity }) {
  const group = new THREE.Group();
  const texture = getCloudTexture();
  const sprites = []; // Simpan referensi sprite buat animasi rotasi nanti

  for (let i = 0; i < puffCount; i++) {
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      opacity: baseOpacity * (0.5 + Math.random() * 0.5),
      depthWrite: false,
      fog: false,
    });
    const sprite = new THREE.Sprite(material);

    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    
    sprite.position.set(
      Math.cos(angle) * r,
      (Math.random() - 0.5) * radius * 0.3,
      Math.sin(angle) * r * 0.8
    );

    const scale = radius * (0.6 + Math.random() * 0.8);
    sprite.scale.set(scale, scale * 0.55, 1);
    
    // Simpan data awal untuk efek micro-motion (rotasi & pulsasi tipis)
    sprite.userData = {
      baseScaleX: scale,
      baseScaleY: scale * 0.55,
      rotSpeed: (Math.random() - 0.5) * 0.2, // Kecepatan putar halus tiap puff
      pulseSpeed: 1 + Math.random() * 2,
      pulseOffset: Math.random() * Math.PI * 2,
    };

    group.add(sprite);
    sprites.push(sprite);
  }
  
  // Lampirkan array sprite ke group.userData biar bisa diakses di update loop
  group.userData.sprites = sprites;
  return group;
}

/**
 * @param {number} count               Jumlah total gerombolan awan
 * @param {Object} options
 */
export function createClouds(count = 40, options = {}) {
  const {
    areaSize = 650,
    windDirection = new THREE.Vector2(1, 0.35).normalize(),
    baseWindSpeed = 0.4,
    opacity = 0.8,
  } = options;

  const group = new THREE.Group();
  const clouds = [];

  // Bagi total awan menjadi 2 layer: 
  // Layer 1 (Awan Bawah): Lebih sedikit, ukuran besar, posisi lebih rendah, gerak lebih cepat (Parallax kuat)
  // Layer 2 (Awan Atas/Jauh): Jumlah lebih banyak, ukuran lebih kecil, posisi tinggi, gerak lambat
  const lowLayerCount = Math.floor(count * 0.35);
  const highLayerCount = count - lowLayerCount;

  function spawnCloud(isLowLayer) {
    const cloudRadius = isLowLayer ? [20, 38] : [8, 18];
    const heightRange = isLowLayer ? [50, 75] : [80, 120];
    const puffCount = isLowLayer ? 9 : 5;
    const speedMultiplier = isLowLayer ? 1.2 : 0.6; // Awan bawah ngebut, awan atas santai

    const radius = THREE.MathUtils.randFloat(...cloudRadius);
    const blob = createCloudBlob({
      puffCount: puffCount + Math.floor(Math.random() * 3),
      radius,
      baseOpacity: isLowLayer ? opacity * 0.9 : opacity * 0.6, // Awan bawah lebih pekat
    });

    blob.position.set(
      (Math.random() - 0.5) * areaSize,
      THREE.MathUtils.randFloat(...heightRange),
      (Math.random() - 0.5) * areaSize
    );

    blob.userData.speed = baseWindSpeed * speedMultiplier * (0.8 + Math.random() * 0.4);
    blob.userData.radius = radius;

    group.add(blob);
    clouds.push(blob);
  }

  // Buat kedua layer awan
  for (let i = 0; i < lowLayerCount; i++) spawnCloud(true);
  for (let i = 0; i < highLayerCount; i++) spawnCloud(false);

  const halfArea = areaSize / 2;
  const margin = 50;

  function update(elapsed, delta) {
    if (delta === undefined || isNaN(delta)) delta = 0.016;

    clouds.forEach((cloud) => {
      // 1. Pergerakan angin & wrap-around map
      cloud.position.x += windDirection.x * cloud.userData.speed * delta;
      cloud.position.z += windDirection.y * cloud.userData.speed * delta;

      const limit = halfArea + margin;
      if (cloud.position.x > limit) {
        cloud.position.x = -limit;
        cloud.position.z = (Math.random() - 0.5) * areaSize;
      } else if (cloud.position.x < -limit) {
        cloud.position.x = limit;
        cloud.position.z = (Math.random() - 0.5) * areaSize;
      }

      if (cloud.position.z > limit) {
        cloud.position.z = -limit;
        cloud.position.x = (Math.random() - 0.5) * areaSize;
      } else if (cloud.position.z < -limit) {
        cloud.position.z = limit;
        cloud.position.x = (Math.random() - 0.5) * areaSize;
      }

      // 2. Efek Micro-Motion / Subtle Scaling & Rotasi Sprite per Frame
      // Membuat sprite 2D terasa bervolume hidup saat kamera berputar
      if (cloud.userData.sprites) {
        cloud.userData.sprites.forEach((sprite, idx) => {
          // Sedikit perubahan skala bergelombang (napas/pulsasi halus)
          const pulse = Math.sin(elapsed * sprite.userData.pulseSpeed + sprite.userData.pulseOffset + idx) * 0.03 + 1;
          sprite.scale.set(
            sprite.userData.baseScaleX * pulse,
            sprite.userData.baseScaleY * pulse,
            1
          );
        });
      }
    });
  }

  function dispose() {
    clouds.forEach((cloud) => {
      cloud.children.forEach((sprite) => sprite.material.dispose());
    });
  }

  return { group, update, dispose };
}