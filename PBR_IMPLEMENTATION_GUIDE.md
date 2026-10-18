# 🎨 PBR (Physically Based Rendering) Implementation Guide

## File-by-File Impact Analysis

PBR akan ngaruh ke beberapa file utama. Berikut breakdown lengkapnya:

---

## 📋 FILE YANG AKAN DI-MODIFIKASI

### **1. CORE LIGHTING SETUP**

#### **`/src/three/useLibraryScene.js`** ⭐ MOST IMPORTANT
**Perubahan:**
- Setup 3 tipe lights: Directional (sun), Point (decorative), Ambient
- Configure renderer untuk PBR support
- Enable shadow maps dengan proper resolution
- Setup tone mapping & exposure control

**Baris yang kena:**
```javascript
// Sebelum:
renderer = new THREE.WebGLRenderer({ antialias: true });

// Sesudah:
renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.toneMapping = THREE.ACESFilmicToneMapping; // PBR color space
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowShadowMap;
```

---

### **2. MATERIAL FILES** 

#### **`/src/three/shelfFactory.js`** ⭐ HIGH PRIORITY
**Perubahan:**
- Upgrade dari `MeshStandardMaterial` (udah bagus!) ke PBR-ready dengan roughness & metalness maps
- Add texture maps (normal, metalness, roughness)
- Setup proper UV mapping
- Add shadow casting

**Detail changes:**
```javascript
// Sebelum:
const woodMaterial = new THREE.MeshStandardMaterial({ color: WOOD_COLOR });

// Sesudah (PBR-ready):
const woodMaterial = new THREE.MeshStandardMaterial({
  color: WOOD_COLOR,
  metalness: 0.0,        // 0 = non-metal (wood)
  roughness: 0.8,        // High roughness = less shiny
  map: woodTexture,      // Color map
  normalMap: woodNormal, // Surface detail
  roughnessMap: woodRoughness, // Roughness variation
  aoMap: woodAO          // Ambient occlusion
});
```

**Shelf materials yang akan berubah:**
- Wood back panel
- Wood bottom shelf
- Wood side supports
- Trash bin (akan pake metalness)
- Highlight overlay (tetap MeshBasicMaterial)

---

#### **`/src/three/bookFactory.js`** ⭐ HIGH PRIORITY  
**Perubahan:**
- Update book spine material untuk PBR
- Add normal maps pada cover
- Adjust roughness berdasar book status
- Proper metalness untuk gilt/shimmer effect

**Detail changes:**
```javascript
// Sebelum:
const spineMaterial = new THREE.MeshStandardMaterial({ map: texture });

// Sesudah (PBR):
const spineMaterial = new THREE.MeshStandardMaterial({
  map: texture,
  normalMap: bookNormalMap,  // Texture relief
  metalness: 0.1,             // Slight shimmer
  roughness: 0.5 + book.rating * 0.05,  // Better books = shinier
  envMapIntensity: 0.5        // Reflect environment
});
```

---

### **3. ENVIRONMENT FILES**

#### **`/src/three/environments/forest.js`** ⭐ CRITICAL
**Perubahan:**
- Add directional light (sun) dengan proper intensity & shadow setup
- Add multiple point lights (campfire, lanterns, etc)
- Setup environment map / HDRI untuk reflections
- Configure fog untuk atmospheric perspective
- Add ambient light

**Structure:**
```javascript
// AKAN DITAMBAH:
- sun light (directional, shadows)
- 4-6 campfire/lantern lights (point lights, with decay)
- Ambient light (soft, indirect)
- HDRI environment map
- Proper fog parameters
```

---

#### **`/src/three/environments/beach.js`** ⭐ CRITICAL
**Perubahan:**
- Similar setup ke forest tapi dengan:
- Brighter sun (tropical)
- Different point light placement (torches, lanterns)
- Water-specific environment map
- Ocean-appropriate fog color

---

#### **`/src/three/environments/registry.js`** 
**Perubahan:**
- Export PBR configuration constants
- Centralize light intensities & shadow settings

---

### **4. EXISTING DECORATIVE ELEMENTS**

#### **`/src/three/grass.js`** 
**Perubahan (MINOR):**
- Add normal maps untuk grass blades
- Adjust roughness untuk grass shader
- Impact: 2-3% perf, +10% grass detail

#### **`/src/three/palmTrees.js`**
**Perubahan (MINOR):**
- Add bark normal maps
- Leaf metalness & roughness
- Impact: 1-2% perf

#### **`/src/three/rocks.js`**
**Perubahan (MINOR):**
- Add rock normal & roughness maps
- Stone material PBR setup
- Impact: 1-2% perf

#### **`/src/three/fireflies.js`**
**Perubahan (MINOR):**
- Point lights pada fireflies (udah ada?)
- Emissive glow
- Impact: 1-2% perf

#### **`/src/three/kraken.js`** & **`/src/three/crabs.js`**
**Perubahan (MINOR):**
- Skin/shell material PBR
- Add normal maps
- Impact: 0-1% perf per model

---

### **5. TEXTURE MANAGEMENT** (NEW FOLDER)

#### **`/public/textures/` (BARU DIBUAT)**
Folder structure:
```
/public/textures/
├─ wood/
│  ├─ shelf_albedo.jpg
│  ├─ shelf_normal.jpg
│  ├─ shelf_roughness.jpg
│  └─ shelf_ao.jpg
├─ book/
│  ├─ cover_normal.jpg
│  └─ gilding.jpg
├─ rock/
│  ├─ stone_albedo.jpg
│  ├─ stone_normal.jpg
│  └─ stone_roughness.jpg
├─ grass/
│  ├─ grass_normal.jpg
│  └─ grass_roughness.jpg
├─ environment/
│  ├─ forest_hdri.hdr (atau .jpg panorama)
│  └─ beach_hdri.hdr
└─ metal/
   ├─ steel_albedo.jpg
   ├─ steel_normal.jpg
   ├─ steel_metalness.jpg
   └─ steel_roughness.jpg
```

**Impact:** Texture loading akan add ~2-5MB untuk all maps (kompres ke WebP/KTX2 biar kecil)

---

### **6. SHADER FILES** (OPTIONAL - Buat Advanced Effects)

#### **`/src/three/shaders/` (BARU OPTIONAL)**
```
/src/three/shaders/
├─ woodShader.js      // Custom wood shader dengan grain
├─ waterShader.js     // PBR water dengan caustics
└─ grassShader.js     // Grass bending dengan wind
```

**Impact:** Custom shaders bisa add 10-20% visual improvement tapi require 5-10% more perf

---

## 🔄 MATERIAL PROPERTY GUIDE

### **Standard PBR Properties:**

```javascript
{
  // BASE COLOR (albedo)
  map: colorTexture,           // Main color/diffuse
  color: new THREE.Color(...), // Tint
  
  // ROUGHNESS (how matte/shiny)
  roughness: 0.5,              // 0 = mirror, 1 = completely matte
  roughnessMap: roughnessTexture, // Per-pixel roughness variation
  
  // METALNESS (is it metal?)
  metalness: 0.0,              // 0 = non-metal, 1 = pure metal
  metalnessMap: metalnessTexture, // Per-pixel metalness
  
  // NORMAL MAPPING (surface detail)
  normalMap: normalTexture,    // Fake surface bumps
  normalScale: new THREE.Vector2(1, 1), // Normal intensity
  
  // AMBIENT OCCLUSION (shadow in crevices)
  aoMap: aoTexture,            // Ambient occlusion map
  aoMapIntensity: 1.0,
  
  // EMISSIVE (glow/self-lit)
  emissive: 0x000000,          // Color yang self-emits
  emissiveIntensity: 0.0,
  
  // ENVIRONMENT MAPPING (reflections)
  envMapIntensity: 1.0,        // Reflection strength
  
  // DISPLACEMENT (geometry deformation - expensive!)
  displacementMap: displacementTexture, // Optional, expensive
  displacementScale: 0.1
}
```

---

## 📊 MATERIAL VALUES BY OBJECT

| Object | Metalness | Roughness | NormalMap | Notes |
|--------|-----------|-----------|-----------|-------|
| Wood Shelf | 0.0 | 0.7-0.8 | YES | Natural wood |
| Book Spine | 0.1-0.2 | 0.4-0.6 | YES | Slight shimmer from gilt |
| Trash Bin | 0.8 | 0.3 | OPTIONAL | Metal can |
| Stone/Rock | 0.0 | 0.8-0.9 | YES | Rough stone |
| Grass | 0.0 | 0.9 | YES | Very matte |
| Water | 0.0 | 0.1-0.2 | YES | Reflects light |
| Metal Lantern | 1.0 | 0.2-0.3 | OPTIONAL | Pure metal |

---

## 💡 IMPLEMENTATION ROADMAP

### **Phase 1: Core Setup (File: useLibraryScene.js)**
```
Week 1:
- Setup renderer with PBR tone mapping
- Configure shadow maps
- Add directional light (sun)
- Test basic rendering
Perf impact: +2%
```

### **Phase 2: Material Upgrade (Files: shelfFactory.js, bookFactory.js)**
```
Week 2:
- Update shelf materials dengan proper roughness/metalness
- Update book materials
- Add simple color maps
- Test visual improvement
Perf impact: +3-4%
```

### **Phase 3: Environment Lighting (Files: forest.js, beach.js)**
```
Week 3:
- Add point lights (campfire, lanterns)
- Setup HDRI for reflections
- Adjust ambient lighting
- Test lighting looks
Perf impact: +4-6%
```

### **Phase 4: Texture Maps (NEW: /public/textures/)**
```
Week 4:
- Create/gather normal maps
- Create roughness maps
- Add to materials
- Compress textures (WebP)
Perf impact: +2-3% (loading), +0% runtime
```

### **Phase 5: Polish & Optimization**
```
Week 5:
- LOD system untuk far objects
- Conditional rendering (device detection)
- Performance profiling
- Final tweaks
Perf impact: -5% (optimization!)
```

---

## 🎯 SUMMARY: FILES TO TOUCH

### **MUST MODIFY (Critical Path):**
1. ✅ `/src/three/useLibraryScene.js` - Renderer & lighting setup
2. ✅ `/src/three/shelfFactory.js` - Shelf materials
3. ✅ `/src/three/bookFactory.js` - Book materials
4. ✅ `/src/three/environments/forest.js` - Forest lights
5. ✅ `/src/three/environments/beach.js` - Beach lights

### **SHOULD MODIFY (High Value):**
6. `/src/three/grass.js` - Normal maps
7. `/src/three/rocks.js` - Rock materials
8. `/src/three/palmTrees.js` - Tree materials
9. `/public/textures/` - NEW: Texture assets

### **NICE TO MODIFY (Polish):**
10. `/src/three/fireflies.js` - Light contribution
11. `/src/three/kraken.js` - Skin material
12. `/src/three/crabs.js` - Shell material

### **OPTIONAL (Advanced):**
13. `/src/three/shaders/` - NEW: Custom shaders
14. Color grading & post-processing

---

## 🚀 START HERE

**Recommend order:**
1. **Day 1**: Modify `useLibraryScene.js` + `forest.js` + `beach.js`
   - Result: Better lighting, shadows, basic PBR setup
   - Time: 4-6 hours
   - Perf cost: +4-5%
   
2. **Day 2**: Modify `shelfFactory.js` + `bookFactory.js`
   - Result: Materials look better with roughness/metalness
   - Time: 3-4 hours
   - Perf cost: +2-3%

3. **Day 3**: Add texture maps
   - Result: Normal maps add surface detail
   - Time: 4-5 hours
   - Perf cost: +2-3%

**Total Time:** ~12-15 hours
**Total Perf Cost:** +8-11% (worth it!)
**Visual Improvement:** +70%

---

## 📦 Texture Resource Recommendations

- **Free HDRI**: [polyhaven.com](https://polyhaven.com/hdris)
- **Free PBR Textures**: [polyhaven.com/textures](https://polyhaven.com/textures)
- **Free Normal Map Generator**: [online-convert.com](https://online-convert.com/)
- **Texture Compression**: [compressorjs.com](https://compressorjs.com/)

