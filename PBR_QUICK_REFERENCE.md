# 🎨 PBR Quick Reference Cheat Sheet

## File Impact Summary

```
FILE CHANGE REQUIRED?  PRIORITY   IMPACT      FILES MODIFIED
============================================================
useLibraryScene.js     ⭐⭐⭐      CRITICAL    Renderer setup, lighting
shelfFactory.js        ⭐⭐        HIGH        Material properties
bookFactory.js         ⭐⭐        HIGH        Material properties
forest.js              ⭐⭐        HIGH        Lighting setup
beach.js               ⭐⭐        HIGH        Lighting setup
grass.js               ⭐           MEDIUM     Normal maps
rocks.js               ⭐           MEDIUM     Normal maps
palmTrees.js           ⭐           MEDIUM     Material updates
fireflies.js           ⭐           MEDIUM     Light properties
/public/textures/      ⭐⭐        HIGH        NEW folder
/src/three/shaders/    ○           OPTIONAL   Advanced effects
```

## What Changes Per File

### **useLibraryScene.js** (Renderer Level)
```diff
- renderer = new THREE.WebGLRenderer({ antialias: true });
+ renderer = new THREE.WebGLRenderer({ 
+   antialias: true,
+   powerPreference: 'high-performance'
+ });
+ renderer.toneMapping = THREE.ACESFilmicToneMapping;
+ renderer.toneMappingExposure = 1.0;
+ renderer.shadowMap.enabled = true;
```

### **shelfFactory.js** (Wood Materials)
```diff
- const woodMaterial = new THREE.MeshStandardMaterial({ color: WOOD_COLOR });
+ const woodMaterial = new THREE.MeshStandardMaterial({
+   color: WOOD_COLOR,
+   map: textureLoader.load('/textures/wood/shelf_albedo.jpg'),
+   normalMap: textureLoader.load('/textures/wood/shelf_normal.jpg'),
+   roughnessMap: textureLoader.load('/textures/wood/shelf_roughness.jpg'),
+   aoMap: textureLoader.load('/textures/wood/shelf_ao.jpg'),
+   metalness: 0.0,
+   roughness: 0.7,
+   aoMapIntensity: 1.0
+ });
```

### **bookFactory.js** (Book Materials)
```diff
- const spineMaterial = new THREE.MeshStandardMaterial({ map: texture });
+ const spineMaterial = new THREE.MeshStandardMaterial({
+   map: texture,
+   normalMap: normalMapTexture,
+   metalness: 0.1,
+   roughness: 0.5,
+   envMapIntensity: 0.5
+ });
```

### **forest.js** (Lighting)
```diff
+ // Add directional light (sun)
+ const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
+ sunLight.position.set(5, 10, 5);
+ sunLight.castShadow = true;
+ scene.add(sunLight);
+ 
+ // Add point lights (campfire)
+ const fireLight = new THREE.PointLight(0xff8800, 2, 10);
+ fireLight.position.set(0, 0.5, 0);
+ scene.add(fireLight);
```

## Texture Map Types Explained

| Map Type | Purpose | Values | Example |
|----------|---------|--------|---------|
| **Albedo (Color)** | Base color | RGB colors | Wood brown, grass green |
| **Normal** | Surface bumps | RGB normals | Wood grain, stone texture |
| **Roughness** | Shinyness | Grayscale (0-1) | 0.8 = matte, 0.1 = shiny |
| **Metalness** | Is it metal? | Grayscale (0-1) | 1.0 = pure metal, 0.0 = non-metal |
| **AO (Ambient Occ.)** | Shadow in crevices | Grayscale (0-1) | Darkens corner shadows |

## Material Values Quick Lookup

```javascript
// WOOD
{
  metalness: 0.0,    // Not metal
  roughness: 0.7,    // Matte
  normalMap: true    // Has grain
}

// POLISHED WOOD / FURNITURE
{
  metalness: 0.0,
  roughness: 0.4,    // Shinier
  normalMap: true
}

// METAL (Steel, Iron)
{
  metalness: 1.0,    // Pure metal
  roughness: 0.3,    // Can be shiny
  normalMap: true
}

// RUST / OLD METAL
{
  metalness: 0.6,
  roughness: 0.8,    // Very rough
  normalMap: true
}

// WATER
{
  metalness: 0.0,
  roughness: 0.1,    // Very shiny
  normalMap: true
}

// GRASS
{
  metalness: 0.0,
  roughness: 0.95,   // Very matte
  normalMap: true
}

// STONE / ROCK
{
  metalness: 0.0,
  roughness: 0.8,    // Rough
  normalMap: true
}

// LEATHER / CLOTH
{
  metalness: 0.0,
  roughness: 0.6,    // Soft
  normalMap: true
}
```

## Performance Checklist

- [ ] Enable `shadowMap` in renderer
- [ ] Set `shadowMapSize: 1024` (balanced)
- [ ] Use `PCFShadowShadowMap` (softer shadows)
- [ ] Limit to 3-4 point lights per scene
- [ ] Use HDRI instead of 360 point lights
- [ ] Compress textures to WebP/KTX2
- [ ] Implement LOD system
- [ ] Profile with DevTools

## Texture File Organization

```
public/textures/
├─ wood/
│  ├─ shelf_albedo.jpg      (1k x 1k)
│  ├─ shelf_normal.jpg      (1k x 1k)
│  ├─ shelf_roughness.jpg   (512 x 512)
│  └─ shelf_ao.jpg          (512 x 512)
├─ environment/
│  ├─ forest_hdri.hdr       (2k x 1k)
│  └─ beach_hdri.hdr        (2k x 1k)
└─ [other materials...]
```

**Size targets:**
- Albedo: 1k-2k resolution
- Normal: 1k-2k resolution
- Roughness/Metalness/AO: 512-1k (can be smaller)
- HDRI: 2k-4k (biggest)
- Total uncompressed: ~30-50MB → ~5-8MB compressed

## Free Texture Sources

- [polyhaven.com](https://polyhaven.com) - FREE PBR textures & HDRI
- [ambientcg.com](https://ambientcg.com) - CC0 PBR materials
- [opengameart.org](https://opengameart.org) - Game assets
- [freepbr.com](https://freepbr.com) - PBR texture library

## Tone Mapping Options

```javascript
renderer.toneMapping = THREE.NoToneMapping;              // None
renderer.toneMapping = THREE.LinearToneMapping;          // Linear
renderer.toneMapping = THREE.ReinhardToneMapping;        // Reinhard
renderer.toneMapping = THREE.CineonToneMapping;          // Cineon
renderer.toneMapping = THREE.ACESFilmicToneMapping;      // ⭐ Recommended (Genshin-like)
```

## Shadow Map Types

```javascript
renderer.shadowMap.type = THREE.BasicShadowMap;         // Fast, sharp
renderer.shadowMap.type = THREE.PCFShadowMap;           // Default
renderer.shadowMap.type = THREE.PCFShadowShadowMap;     // ⭐ Recommended (softer)
renderer.shadowMap.type = THREE.VSMShadowMap;           // Complex setup
```

## Quick Implementation Checklist

- [ ] Step 1: Renderer setup (tone mapping, shadows)
- [ ] Step 2: Add lighting (sun + point lights)
- [ ] Step 3: Update material parameters
- [ ] Step 4: Load texture maps
- [ ] Step 5: Polish & optimize
- [ ] Step 6: Test performance (target: 60 FPS)

---

**Next:** Read `PBR_IMPLEMENTATION_GUIDE.md` for detailed implementation steps

