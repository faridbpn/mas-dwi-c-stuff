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

## 📝 Lisensi

Bebas digunakan dan dikembangkan untuk keperluan belajar maupun portofolio pribadi.

---

<p align="center">Dibangun langkah demi langkah sebagai proyek belajar C++ & Vue.js 🚀</p>