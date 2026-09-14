<template>
  <div class="page">
    <header class="hero">
      <h1>Buku yang Sudah Dibaca</h1>
      <p class="subtitle">{{ books.length }} buku tercatat</p>
    </header>

    <section class="card" v-liquid="{ material: 'regular', borderRadius: 28 }">
      <form @submit.prevent="submitBook" class="book-form">
        <input v-model="form.title" placeholder="Judul buku" required />
        <input v-model="form.author" placeholder="Penulis" required />
        <input v-model.number="form.year" type="number" placeholder="Tahun" />
        <select v-model="form.status" class="status-select">
          <option value="mau_dibaca">Mau Dibaca</option>
          <option value="sedang_dibaca">Sedang Dibaca</option>
          <option value="sudah_dibaca">Sudah Dibaca</option>
        </select>
        <button type="submit" class="btn-primary" v-liquid-button>
          {{ editingId ? "Update Buku" : "Tambah Buku" }}
        </button>
      </form>
    </section>

    <section
      class="card table-card"
      v-liquid="{ material: 'thick', borderRadius: 28 }"
    >
      <div class="filter-tabs">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          class="filter-tab"
          :class="{ active: activeFilter === tab.value }"
          v-liquid-button
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
          <button class="btn-ghost" v-liquid-button @click="startEdit(book)">
            Edit
          </button>
          <button class="btn-danger" v-liquid-button @click="deleteBook(book.id)">
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
import { ref, computed, onMounted } from "vue";
import { LiquidGlassEngine } from "quick-liquid";

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

// ---------- Custom directive: panel kaca ----------
const vLiquid = {
  mounted(el, binding) {
    new LiquidGlassEngine(el, {
      material: "regular",
      dynamicLighting: true,
      chromaticAberration: 0,
      ...(binding.value || {}),
    });
  },
};

// ---------- Custom directive: tombol kaca + efek "ditekan" ----------
const vLiquidButton = {
  mounted(el) {
    const glass = new LiquidGlassEngine(el, {
      material: "clear",
      borderRadius: 14,
      dynamicLighting: true,
    });
    glass.enableLiquidPress({ scale: 0.96, squish: 0.02 });
  },
};
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display",
    "Segoe UI", Roboto, sans-serif;
}

.page {
  min-height: 100vh;
  padding: 60px 24px;
  background: linear-gradient(160deg, #e8e9ec 0%, #d7d9de 50%, #c9ccd3 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}

.hero {
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

.card {
  width: 100%;
  max-width: 560px;
  padding: 28px;
  position: relative;
  background: rgba(255, 255, 255, 0.001);
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
  background: rgba(255, 255, 255, 0.6);
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
  color: #1d1d1f;
  background: rgba(255, 255, 255, 0.001);
}

.btn-primary {
  background: rgba(29, 29, 31, 0.85);
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
  background: rgba(29, 29, 31, 0.85);
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