<template>
  <div class="page">
    <div class="bg-blob blob-1"></div>
    <div class="bg-blob blob-2"></div>

    <header class="hero">
      <h1>Buku yang Sudah Dibaca</h1>
      <p class="subtitle">{{ books.length }} buku tercatat</p>
    </header>

    <section class="glass-card">
      <form @submit.prevent="submitBook" class="book-form">
        <input v-model="form.title" placeholder="Judul buku" required />
        <input v-model="form.author" placeholder="Penulis" required />
        <input v-model.number="form.year" type="number" placeholder="Tahun" />
        <select v-model="form.status" class="status-select">
          <option value="mau_dibaca">Mau Dibaca</option>
          <option value="sedang_dibaca">Sedang Dibaca</option>
          <option value="sudah_dibaca">Sudah Dibaca</option>
        </select>
        <button type="submit" class="btn-primary">
          {{ editingId ? "Update Buku" : "Tambah Buku" }}
        </button>
      </form>
    </section>

    <section class="glass-card table-card">
      <div class="filter-tabs">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          class="filter-tab"
          :class="{ active: activeFilter === tab.value }"
          @click="activeFilter = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="book-row" v-for="book in filteredBooks" :key="book.id">
        <div class="book-info">
          <p class="book-title">{{ book.title }}</p>
          <p class="book-meta">{{ book.author }} · {{ book.year }}</p>
          <span class="status-badge" :class="`status-${book.status}`">
            {{ statusLabel(book.status) }}
          </span>
        </div>
        <div class="book-actions">
          <button class="btn-ghost" @click="startEdit(book)">Edit</button>
          <button class="btn-danger" @click="deleteBook(book.id)">
            Hapus
          </button>
        </div>
      </div>

      <p v-if="filteredBooks.length === 0" class="empty-state">
        Belum ada buku di kategori ini.
      </p>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";

const API_URL = "http://localhost:8080/books";

const books = ref([]);
const form = ref({ title: "", author: "", year: null, status: "mau_dibaca" });
const editingId = ref(null);
const activeFilter = ref("all");

const filterTabs = [
  { label: "Semua", value: "all" },
  { label: "Mau Dibaca", value: "mau_dibaca" },
  { label: "Sedang Dibaca", value: "sedang_dibaca" },
  { label: "Sudah Dibaca", value: "sudah_dibaca" },
];

const statusLabels = {
  mau_dibaca: "Mau Dibaca",
  sedang_dibaca: "Sedang Dibaca",
  sudah_dibaca: "Sudah Dibaca",
};

function statusLabel(status) {
  return statusLabels[status] || status;
}

const filteredBooks = computed(() => {
  if (activeFilter.value === "all") return books.value;
  return books.value.filter((b) => b.status === activeFilter.value);
});

async function loadBooks() {
  const response = await fetch(API_URL);
  books.value = await response.json();
}

async function submitBook() {
  if (editingId.value) {
    await fetch(`${API_URL}/${editingId.value}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form.value),
    });
  } else {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form.value),
    });
  }
  resetForm();
  loadBooks();
}

function startEdit(book) {
  editingId.value = book.id;
  form.value = {
    title: book.title,
    author: book.author,
    year: book.year,
    status: book.status,
  };
}

function resetForm() {
  editingId.value = null;
  form.value = { title: "", author: "", year: null, status: "mau_dibaca" };
}

async function deleteBook(id) {
  await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  loadBooks();
}

onMounted(() => {
  loadBooks();
});
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family:
    -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto,
    sans-serif;
}

.page {
  position: relative;
  min-height: 100vh;
  padding: 60px 24px;
  background: #eef0f3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  overflow: hidden;
}

/* blob warna lembut di belakang, biar efek kaca ada 'sesuatu' buat
   diburamkan -- tanpa ini glass look-nya kelihatan mati/flat */
.bg-blob {
  position: fixed;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  z-index: 0;
  pointer-events: none;
}

.blob-1 {
  width: 420px;
  height: 420px;
  top: -120px;
  left: -100px;
  background: #a7c7ff;
}

.blob-2 {
  width: 380px;
  height: 380px;
  bottom: -140px;
  right: -80px;
  background: #ffc2d1;
}

.hero {
  position: relative;
  z-index: 1;
  text-align: center;
  color: #1d1d1f;
}

.hero h1 {
  font-size: 2.2rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.02em;
}

.subtitle {
  margin: 6px 0 0;
  color: #6e6e73;
  font-size: 0.95rem;
}

/* ---------- Kaca ala Apple, native CSS, tanpa JS engine ---------- */
.glass-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 560px;
  padding: 28px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.table-card {
  background: rgba(255, 255, 255, 0.65);
}

.book-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.book-form input,
.status-select {
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  outline: none;
  color: #1d1d1f;
  font-family: inherit;
}

.status-select {
  appearance: none;
  cursor: pointer;
}

.book-form input::placeholder {
  color: #86868b;
}

.book-form input:focus,
.status-select:focus {
  border-color: rgba(0, 0, 0, 0.25);
}

button {
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 12px 20px;
  border-radius: 14px;
  transition: transform 0.1s ease, opacity 0.1s ease;
}

button:active {
  transform: scale(0.96);
  opacity: 0.85;
}

.btn-primary {
  background: rgba(29, 29, 31, 0.9);
  color: #ffffff;
}

.btn-ghost {
  background: rgba(0, 0, 0, 0.06);
  color: #1d1d1f;
  padding: 8px 14px;
  font-size: 0.85rem;
}

.btn-danger {
  background: rgba(255, 59, 48, 0.12);
  color: #d70015;
  padding: 8px 14px;
  font-size: 0.85rem;
}

.filter-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.filter-tab {
  padding: 8px 14px;
  font-size: 0.82rem;
  font-weight: 600;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.05);
  color: #6e6e73;
}

.filter-tab.active {
  background: rgba(29, 29, 31, 0.9);
  color: #ffffff;
}

.book-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 4px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  color: #1d1d1f;
}

.book-row:last-child {
  border-bottom: none;
}

.book-title {
  margin: 0;
  font-weight: 600;
}

.book-meta {
  margin: 4px 0 0;
  font-size: 0.85rem;
  color: #6e6e73;
}

.status-badge {
  display: inline-block;
  margin-top: 6px;
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 0.72rem;
  font-weight: 600;
}

.status-mau_dibaca {
  background: rgba(0, 122, 255, 0.12);
  color: #0066cc;
}

.status-sedang_dibaca {
  background: rgba(255, 149, 0, 0.14);
  color: #b25e00;
}

.status-sudah_dibaca {
  background: rgba(52, 199, 89, 0.14);
  color: #1a7a34;
}

.book-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  text-align: center;
  color: #86868b;
  padding: 20px 0;
}
</style>