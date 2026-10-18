# 📚 Book Tracker — C++ API & Vue.js

> Sistem sederhana untuk mencatat buku-buku yang sudah pernah dibaca — dibangun dari nol sebagai proyek belajar **C++ backend** dan **Vue.js frontend**, dengan penyimpanan data berbasis **CSV**.

![C++](https://img.shields.io/badge/Backend-C%2B%2B17-00599C?style=flat-square&logo=c%2B%2B)
![Vue](https://img.shields.io/badge/Frontend-Vue.js-4FC08D?style=flat-square&logo=vue.js)
![License](https://img.shields.io/badge/License-Free%20to%20use-lightgrey?style=flat-square)
![Status](https://img.shields.io/badge/Status-Active%20Development-yellow?style=flat-square)

---

## ✨ Tentang Project

Project ini dibangun sebagai latihan membuat REST API dari nol menggunakan **C++ murni** (tanpa framework berat), dipadukan dengan **Vue.js** di sisi frontend. Alih-alih pakai database SQL, data disimpan sederhana dalam format **CSV** — ringan, gampang dibaca manual, dan cocok untuk skala kecil sambil belajar konsep CRUD end-to-end.

## 🚀 Fitur

**Backend (C++ REST API)**
- CRUD lengkap untuk data buku (Create, Read, Update, Delete)
- Storage berbasis file CSV — tanpa instalasi database
- CORS-ready, siap diakses dari frontend manapun

**Frontend (Vue.js)**
- Tampilan tabel buku yang reaktif (update otomatis tanpa reload)
- Form tambah & edit buku dalam satu komponen
- Integrasi langsung ke API lewat `fetch`

## 🏗️ Struktur Project

```
buku-tracker/
├── backend/
│   ├── main.cpp        # Logic server + CRUD + baca/tulis CSV
│   ├── httplib.h        # Library HTTP server (header-only)
│   ├── json.hpp          # Library JSON (header-only)
│   └── books.csv          # "Database" — otomatis dibuat saat pertama jalan
└── frontend/
    └── src/
        └── App.vue        # Komponen utama UI
```

## 🛠️ Instalasi & Menjalankan

### 1. Backend (C++)

Pastikan `g++` (mendukung C++17) sudah terpasang.

```bash
cd backend
g++ -std=c++17 main.cpp -o server -lpthread
./server
```

Server berjalan di `http://localhost:8080`.

### 2. Frontend (Vue.js)

Pastikan Node.js & npm sudah terpasang.

```bash
cd frontend
npm install
npm run dev
```

Buka URL yang muncul di terminal (biasanya `http://localhost:5173`).

> ⚠️ Jalankan backend **terlebih dahulu** sebelum membuka frontend, karena Vue langsung mengambil data dari API saat halaman dimuat.

## 📌 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/books` | Mengambil seluruh daftar buku |
| `POST` | `/books` | Menambahkan buku baru |
| `PUT` | `/books/:id` | Mengubah data buku berdasarkan ID |
| `DELETE` | `/books/:id` | Menghapus buku berdasarkan ID |

**Contoh request body** (`POST` / `PUT`):
```json
{
  "title": "Laskar Pelangi",
  "author": "Andrea Hirata",
  "year": 2005
}
```

## 🗺️ Roadmap

- [ ] **UI Makeover** — redesain tampilan pakai component library (Vuetify/PrimeVue/dsb) biar lebih modern
- [ ] **Validasi input** — baik di frontend maupun backend
- [ ] **Fitur pencarian & filter** buku
- [ ] **Database upgrade** — migrasi dari CSV ke SQLite kalau data mulai besar
- [ ] **AI Assistant Integration** — command berbasis teks/suara untuk operasi CRUD

## 📝 next update plan
kasih backgroundj
kasih musik latar yang bisa dipilih2
add idle animation dll



## 📝 Lisensi

Bebas digunakan dan dikembangkan untuk keperluan belajar maupun portofolio pribadi.

---

<p align="center">Dibangun langkah demi langkah sebagai proyek belajar C++ & Vue.js 🚀</p>


map camp improvement list

📊 VISUAL UPGRADE PRIORITY LIST (Genshin Impact Style)
TIER 1: CRITICAL (Highest Impact, Doable Performance)
🎨 Advanced Lighting & Shading

✅ Implement PBR (Physically Based Rendering) materials
✅ Add multiple point lights (fireflies, campfire, lanterns)
✅ Real-time shadows dengan shadowMapSize: 1024 (balanced)
✅ Screen-space ambient occlusion (SSAO) - lite version
Impact: +80% visual quality, ~5-10% perf cost
Why: Genshin punya lighting yang sophisticated tapi clean
🌄 Atmospheric Post-Processing

✅ Bloom effect (bright clouds, light sources)
✅ Tone mapping (color grading seperti Genshin)
✅ Slight chromatic aberration
✅ Depth of field (optional, toggle-able)
Impact: +70% visual polish, ~3-7% perf cost
Why: Ini yang buat Genshin terlihat "anime-like" dan dreamy
🌳 Terrain & Nature Details

✅ Normal maps untuk grass & stones (lebih bumpy)
✅ Parallax mapping untuk relief
✅ Layered grass shader dengan wind animation
✅ Better flower/tree density management
Impact: +60% realism, ~4-8% perf cost
Why: Terrain di Genshin punya depth dan movement
📦 Model Quality & LOD System

✅ Import higher-poly models untuk rak buku & decorations
✅ Implement LOD (Level of Detail) - auto switch ke low-poly jauh
✅ Better UV mapping & textures pada existing models
Impact: +50% visual detail near camera, ~2-5% perf cost
Why: Detail quality tinggi saat dekat, otomatis optimize jauh


✨ Particle Effects

✅ Fireflies/glowbugs yang lebih sophisticated
✅ Water ripple particles
✅ Dust motes di udara (volumetric dust)
✅ Ambient "glow" particles around elements
Impact: +40% atmosphere, ~3-6% perf cost
Why: Genshin pakai particles untuk storytelling & ambiance
🌊 Water Rendering

✅ Improved water shader dengan normal maps
✅ Reflections (planar or cube map)
✅ Caustics animation (bayangan di bawah air)
✅ Wave animation yang realistic
Impact: +50% pada scenes dengan water, ~4-8% perf cost
Why: Sungai/danau di Genshin punya detail tinggi
☁️ Sky & Cloud Improvements

✅ Procedural cloud generation
✅ Cloud shadows yang bergerak
✅ Time-of-day color transitions
✅ Atmospheric perspective (fog distance-based)
Impact: +35% sky realism, ~2-4% perf cost
Why: Sky di Genshin berubah-ubah indah
🏠 Building/Furniture Details

✅ Detailed wooden textures dengan roughness variation
✅ Cloth/fabric textures di banner/flag
✅ Rust/weathering effects
Impact: +45% on object close-ups, ~2% perf cost
Why: Detail textur buat immersion

🎬 Post-Processing Filters

✅ Color grading LUT (Look-Up Table) untuk mood
✅ Vignette effect subtle
✅ Film grain (optional)
Impact: +25% mood & polish, <1% perf cost
📐 Anti-Aliasing Upgrade

✅ FXAA atau SMAA (temporal AA kalau bisa)
Impact: +10% smoothness, <1% perf cost
🌟 UI Polish

✅ Glow effects di UI elements
✅ Smooth animations & transitions
✅ Better fonts & typography
Impact: +30% UI appeal, 0% perf cost (UI only)
📍 Interactive Elements

✅ Hover/interact feedback dengan glow
✅ Sound design polish
Impact: +20% interactivity feel, <1% perf cost