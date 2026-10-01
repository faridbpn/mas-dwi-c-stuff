# Guide: Menambah Kraken ke Beach Environment

## Overview
Kraken 3D model sudah tersedia di `frontend/public/models/kraken/scene.gltf`. Tujuan: load kraken ke beach map sama seperti ikan/birds di forest.

---

## Step-by-Step Implementation

### STEP 1: Buat File `frontend/src/three/kraken.js`

File baru yang akan handle loading & animating kraken model.

**Struktur minimal yang dibutuhkan:**

```javascript
// frontend/src/three/kraken.js

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

// Loader instance (bisa di-share atau buat per-kraken)
const loader = new GLTFLoader();

/**
 * Async function untuk load kraken model
 * @returns {Promise<THREE.Group>} - Kraken model group
 */
async function loadKrakenModel() {
  return new Promise((resolve, reject) => {
    loader.load(
      "/models/kraken/scene.gltf",  // Path ke model
      (gltf) => {
        const kraken = gltf.scene;
        // Optional: scale/position adjustment
        kraken.scale.set(1, 1, 1); // Adjust sesuai ukuran yang diinginkan
        kraken.position.y = -1.5;  // Posisi di dalam air
        resolve(kraken);
      },
      undefined,
      reject
    );
  });
}

/**
 * Create kraken instance dengan basic animation
 * 
 * @param {number} x - World position X
 * @param {number} z - World position Z
 * @returns {Object} - {group, update, dispose}
 */
export async function createKraken(x = 0, z = 0) {
  const krakenGroup = new THREE.Group();
  
  try {
    const model = await loadKrakenModel();
    krakenGroup.add(model);
    
    // Store untuk animation
    let time = 0;
    const baseY = -1.5;
    const bobAmount = 0.3;      // Amplitude gerakan up-down
    const bobSpeed = 2;         // Kecepatan gerakan (radians/sec)
    
    krakenGroup.position.set(x, 0, z);
    
    return {
      group: krakenGroup,
      
      /**
       * Update animation setiap frame
       * @param {number} elapsed - Total elapsed time (seconds)
       * @param {number} delta - Frame delta time (seconds)
       */
      update(elapsed, delta) {
        // Bobbing animation (naik-turun)
        time += delta;
        krakenGroup.position.y = baseY + Math.sin(time * bobSpeed) * bobAmount;
        
        // Optional: slow rotation
        krakenGroup.rotation.y += delta * 0.3; // Rotate 0.3 rad/sec
      },
      
      dispose() {
        // Cleanup resources
        krakenGroup.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      },
    };
  } catch (error) {
    console.error("Failed to load kraken model:", error);
    throw error;
  }
}

/**
 * Advanced: Create kraken dengan swimming path animation
 * Kraken akan swim dalam pattern circular
 * 
 * @param {number} centerX - Pusat swimming area X
 * @param {number} centerZ - Pusat swimming area Z
 * @param {number} radius - Radius swimming circle
 * @returns {Object} - {group, update, dispose}
 */
export async function createSwimmingKraken(centerX = 0, centerZ = 0, radius = 8) {
  const krakenGroup = new THREE.Group();
  
  try {
    const model = await loadKrakenModel();
    krakenGroup.add(model);
    
    let time = 0;
    const baseY = -1.5;
    const bobAmount = 0.3;
    const bobSpeed = 2;
    const swimSpeed = 0.4; // Radians per second (semakin besar = semakin cepat)
    
    return {
      group: krakenGroup,
      
      update(elapsed, delta) {
        time += delta;
        
        // Circular swimming path
        const angle = time * swimSpeed;
        krakenGroup.position.x = centerX + Math.cos(angle) * radius;
        krakenGroup.position.z = centerZ + Math.sin(angle) * radius;
        
        // Bobbing
        krakenGroup.position.y = baseY + Math.sin(time * bobSpeed) * bobAmount;
        
        // Face direction of movement
        krakenGroup.rotation.y = angle;
        
        // Optional: slight tilt based on swim speed
        krakenGroup.rotation.z = Math.sin(angle * 2) * 0.15;
      },
      
      dispose() {
        krakenGroup.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      },
    };
  } catch (error) {
    console.error("Failed to load swimming kraken:", error);
    throw error;
  }
}
```

---

### STEP 2: Update `frontend/src/three/environments/beach.js`

Di bagian atas file, tambah import:

```javascript
import { createSwimmingKraken } from "../kraken";  // <-- TAMBAH INI
```

Di function `create()` beach environment, setelah birds dibuat, tambah kraken:

**BEFORE (existing birds code):**
```javascript
const birds = createBirdFlock(14, { scale: 1.4, radiusRange: [22, 38], heightRange: [10, 18] });
scene.add(birds.group);
birds.group.visible = true;

return {
  update(elapsed) {
    sand.update(elapsed);
    ocean.update(elapsed);
    birds.update(elapsed);
  },
  // ...
};
```

**AFTER (tambah kraken):**
```javascript
const birds = createBirdFlock(14, { scale: 1.4, radiusRange: [22, 38], heightRange: [10, 18] });
scene.add(birds.group);
birds.group.visible = true;

// TAMBAH KRAKEN DI SINI
let kraken = null;
try {
  createSwimmingKraken(-12, 5, 6).then((krakenObj) => {
    kraken = krakenObj;
    scene.add(kraken.group);
  });
} catch (error) {
  console.warn("Kraken failed to load:", error);
}

return {
  update(elapsed, delta) {
    sand.update(elapsed);
    ocean.update(elapsed);
    birds.update(elapsed);
    
    // TAMBAH INI
    if (kraken) kraken.update(elapsed, delta);
  },
  dispose() {
    scene.remove(sky, sand.mesh, ocean.mesh, birds.group, hemi, sun);
    sand.dispose();
    ocean.dispose();
    
    // TAMBAH INI
    if (kraken) {
      scene.remove(kraken.group);
      kraken.dispose();
    }
    
    scene.fog = null;
  },
};
```

---

### STEP 3: Configure Vite untuk GLTFLoader

Pastikan `vite.config.js` sudah setup untuk handle glTF assets:

**Check file:** `frontend/vite.config.js`

Harus ada atau tambahkan:
```javascript
export default defineConfig({
  plugins: [vue()],
  assetsInclude: ['**/*.gltf', '**/*.glb', '**/*.bin'],
});
```

---

### STEP 4: Testing

1. **Di terminal frontend:**
   ```
   npm run dev
   ```

2. **Di browser:**
   - Navigate ke app
   - Switch ke "Pulau Pantai" (Beach environment)
   - Kraken seharusnya muncul di area pantai

3. **Check browser console** untuk error (jika ada)

---

## Customization Options

### 1. **Ubah Posisi Kraken**
Di beach.js, function createSwimmingKraken:
```javascript
createSwimmingKraken(
  -12,  // centerX: ubah ini (negatif = ke kiri, positif = ke kanan)
  5,    // centerZ: ubah ini (negatif = jauh, positif = dekat)
  6     // radius: ukuran area swimming
)
```

### 2. **Ubah Kecepatan Swimming**
Di `kraken.js`, function `createSwimmingKraken()`:
```javascript
const swimSpeed = 0.4; // Ubah nilai ini (lebih besar = lebih cepat)
```

### 3. **Ubah Bobbing (gerakan naik-turun)**
```javascript
const bobAmount = 0.3;  // Amplitude (ubah untuk lebih banyak bounce)
const bobSpeed = 2;     // Kecepatan bobbing (ubah ini)
```

### 4. **Multiple Krakens**
Buat array & load beberapa:
```javascript
const krakens = [];
for (let i = 0; i < 2; i++) {
  const kraken = await createSwimmingKraken(
    -12 + i * 10,
    5,
    6
  );
  krakens.push(kraken);
  scene.add(kraken.group);
}

// Di update loop:
krakens.forEach(k => k.update(elapsed, delta));

// Di dispose:
krakens.forEach(k => {
  scene.remove(k.group);
  k.dispose();
});
```

### 5. **Scale Kraken**
Di `kraken.js`, function `loadKrakenModel()`:
```javascript
kraken.scale.set(2, 2, 2); // Scale 2x lebih besar (ubah sesuai kebutuhan)
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Kraken tidak muncul | 1. Check console error 2. Pastikan path `/models/kraken/scene.gltf` correct 3. Check browser network tab |
| Model terlihat terlalu besar/kecil | Ubah `.scale.set()` di `loadKrakenModel()` |
| Kraken stuck/tidak bergerak | Pastikan `update()` dipanggil dengan `delta` parameter |
| Kraken hilang saat switch environment | Normal - setiap environment di-dispose, krakena hanya ada di beach |
| Model terlihat gelap/tidak ada texture | Check if textures path correct di gltf file, mungkin perlu adjust texture path |

---

## Architecture Comparison

### Birds (Forest) vs Kraken (Beach)
**Birds:** Procedurally generated (algoritma, bukan model file)
**Kraken:** Loaded dari file gltf (model pre-made)

**Similarities:**
- Keduanya punya `create()` function yang return {group, update, dispose}
- Update loop dipanggil dari environment's update
- Disposed saat environment di-switch

**Differences:**
- Birds: synchronous create, no file loading
- Kraken: async create (perlu loading model), file-based

---

## File Locations Summary

| File | Purpose |
|------|---------|
| `frontend/public/models/kraken/scene.gltf` | Kraken model (existing) |
| `frontend/src/three/kraken.js` | **CREATE THIS** - Kraken loader & animator |
| `frontend/src/three/environments/beach.js` | **UPDATE THIS** - Add kraken creation & update calls |
| `frontend/vite.config.js` | Verify gltf asset config (usually already set) |

---

## Optional: Advanced Features

### Interaction with Books
Jika ingin kraken interact dengan buku (e.g., glow saat book dipilih):

```javascript
// Di beach.js, pass reference:
const krakenObj = await createSwimmingKraken(-12, 5, 6);

// Di app atau scene, when book selected:
krakenObj.group.getObjectByName("tentacle").material.emissive.setHex(0xff0000);
```

### Dynamic Lighting
Kraken cast shadow dari matahari beach:
```javascript
function loadKrakenModel() {
  // ... existing code ...
  kraken.traverse(child => {
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return kraken;
}
```

---

**Siap implement!** Berikut 2 file yang perlu dibuat/diupdate.
