import * as THREE from "three";

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

// BARU: 2 warna ujung interpolasi -- cerah vs badai
const CALM_COLOR = new THREE.Color(0xffffff);
const STORM_COLOR = new THREE.Color(0x4a4f57);

function createCloudBlob({ puffCount, radius, baseOpacity }) {
  const group = new THREE.Group();
  const texture = getCloudTexture();
  const sprites = [];

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

    sprite.userData = {
      baseScaleX: scale,
      baseScaleY: scale * 0.55,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      pulseSpeed: 1 + Math.random() * 2,
      pulseOffset: Math.random() * Math.PI * 2,
      baseOpacity: material.opacity, // BARU: simpan opacity asli, dipakai buat badai lebih pekat
    };

    group.add(sprite);
    sprites.push(sprite);
  }

  group.userData.sprites = sprites;
  return group;
}

export function createClouds(count = 40, options = {}) {
  const {
    areaSize = 650,
    windDirection = new THREE.Vector2(1, 0.35).normalize(),
    baseWindSpeed = 0.4,
    opacity = 0.8,
  } = options;

  const group = new THREE.Group();
  const clouds = [];

  const lowLayerCount = Math.floor(count * 0.35);
  const highLayerCount = count - lowLayerCount;

  function spawnCloud(isLowLayer) {
    const cloudRadius = isLowLayer ? [20, 38] : [8, 18];
    const heightRange = isLowLayer ? [50, 75] : [80, 120];
    const puffCount = isLowLayer ? 9 : 5;
    const speedMultiplier = isLowLayer ? 1.2 : 0.6;

    const radius = THREE.MathUtils.randFloat(...cloudRadius);
    const blob = createCloudBlob({
      puffCount: puffCount + Math.floor(Math.random() * 3),
      radius,
      baseOpacity: isLowLayer ? opacity * 0.9 : opacity * 0.6,
    });

    blob.position.set(
      (Math.random() - 0.5) * areaSize,
      THREE.MathUtils.randFloat(...heightRange),
      (Math.random() - 0.5) * areaSize
    );

    blob.userData.speed = baseWindSpeed * speedMultiplier * (0.8 + Math.random() * 0.4);
    blob.userData.radius = radius;
    blob.userData.isLowLayer = isLowLayer; // BARU: dipakai biar awan rendah lebih gelap duluan pas badai

    group.add(blob);
    clouds.push(blob);
  }

  for (let i = 0; i < lowLayerCount; i++) spawnCloud(true);
  for (let i = 0; i < highLayerCount; i++) spawnCloud(false);

  const halfArea = areaSize / 2;
  const margin = 50;

  // BARU: state intensity badai, 0 = cerah, 1 = badai penuh
  let stormIntensity = 0;
  const tmpColor = new THREE.Color();

  function setStormIntensity(t) {
    stormIntensity = THREE.MathUtils.clamp(t, 0, 1);
  }

  function update(elapsed, delta) {
    if (delta === undefined || isNaN(delta)) delta = 0.016;

    clouds.forEach((cloud) => {
      cloud.position.x += windDirection.x * cloud.userData.speed * delta;
      cloud.position.z += windDirection.y * cloud.userData.speed * delta;

      // BARU: angin kencang pas badai -> awan hanyut lebih cepat
      const windBoost = 1 + stormIntensity * 2.5;
      cloud.position.x += windDirection.x * cloud.userData.speed * delta * (windBoost - 1);
      cloud.position.z += windDirection.y * cloud.userData.speed * delta * (windBoost - 1);

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

      // BARU: awan lapisan bawah menggelap duluan & lebih ekstrem dari lapisan atas
      const layerFactor = cloud.userData.isLowLayer ? 1 : 0.6;
      tmpColor.copy(CALM_COLOR).lerp(STORM_COLOR, stormIntensity * layerFactor);

      if (cloud.userData.sprites) {
        cloud.userData.sprites.forEach((sprite, idx) => {
          const pulse =
            Math.sin(elapsed * sprite.userData.pulseSpeed + sprite.userData.pulseOffset + idx) * 0.03 + 1;
          sprite.scale.set(
            sprite.userData.baseScaleX * pulse,
            sprite.userData.baseScaleY * pulse,
            1
          );

          // BARU: warna & opacity ikut intensity badai
          sprite.material.color.copy(tmpColor);
          sprite.material.opacity =
            sprite.userData.baseOpacity * (1 + stormIntensity * layerFactor * 0.3); // badai -> awan makin pekat/nutup langit
        });
      }
    });
  }

  function dispose() {
    clouds.forEach((cloud) => {
      cloud.children.forEach((sprite) => sprite.material.dispose());
    });
  }

  return { group, update, dispose, setStormIntensity }; // BARU: expose setStormIntensity
}