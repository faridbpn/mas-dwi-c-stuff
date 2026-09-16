<template>
  <div class="page">
    <div class="bg-blob blob-1"></div>
    <div class="bg-blob blob-2"></div>

    <header class="hero">
      <h1>Buku yang Sudah Dibaca</h1>
      <p class="subtitle">{{ books.length }} buku tercatat</p>
    </header>

    <!-- Form tambah buku: buku baru selalu masuk rak "Mau Dibaca" dulu -->
    <section class="glass-card">
      <form @submit.prevent="submitBook" class="book-form">
        <input v-model="form.title" placeholder="Judul buku" required />
        <input v-model="form.author" placeholder="Penulis" required />
        <input v-model.number="form.year" type="number" placeholder="Tahun" />
        <button type="submit" class="btn-primary">Tambah Buku</button>
      </form>
    </section>

    <!-- Rak-rak buku: drag kartu antar rak buat ganti status -->
    <section class="shelves">
      <div
        v-for="shelf in shelves"
        :key="shelf.status"
        class="shelf"
        :class="{ 'shelf-active': dragOverStatus === shelf.status }"
        @dragover.prevent="dragOverStatus = shelf.status"
        @dragleave="onShelfDragLeave(shelf.status)"
        @drop.prevent="onDropToShelf(shelf.status)"
      >
        <h3 class="shelf-title">
          <span>{{ shelf.icon }} {{ shelf.label }}</span>
          <span class="shelf-count">{{ booksByStatus(shelf.status).length }}</span>
        </h3>

        <div class="shelf-books">
          <p v-if="booksByStatus(shelf.status).length === 0" class="shelf-empty">
            Seret buku ke sini
          </p>

          <div
            v-for="book in booksByStatus(shelf.status)"
            :key="book.id"
            class="book-card"
            :class="{ shattering: shatteringId === book.id }"
            draggable="true"
            @dragstart="onDragStart(book, $event)"
            @dragend="onDragEnd"
          >
            <button class="edit-hint" @click.stop="openEdit(book)">
              ✏️ Edit
            </button>

            <div class="book-card-content">
              <p class="book-title">{{ book.title }}</p>
              <p class="book-meta">{{ book.author }} · {{ book.year || "—" }}</p>
            </div>

            <div v-if="shatteringId === book.id" class="shard-overlay">
              <span
                v-for="(s, i) in shards"
                :key="i"
                class="shard"
                :style="{
                  left: s.left,
                  top: s.top,
                  width: s.size,
                  height: s.size,
                  clipPath: s.clip,
                  animationDelay: s.delay,
                  '--tx': s.tx,
                  '--ty': s.ty,
                  '--rot': s.rot,
                }"
              ></span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Tempat sampah mengambang: drop buku ke sini buat hapus -->
    <div
      class="trash-can"
      :class="{ 'trash-over': isOverTrash }"
      @dragover.prevent="isOverTrash = true"
      @dragleave="isOverTrash = false"
      @drop.prevent="onDropToTrash"
    >
      🗑️
    </div>

    <!-- Modal edit buku, muncul pas label "Edit" di-klik -->
    <Transition name="modal">
      <div v-if="showEditModal" class="modal-backdrop" @click.self="closeEdit">
        <div class="modal-card">
          <h2 class="modal-title">Edit Buku</h2>
          <form @submit.prevent="submitEdit" class="book-form">
            <input v-model="editForm.title" placeholder="Judul buku" required />
            <input v-model="editForm.author" placeholder="Penulis" required />
            <input
              v-model.number="editForm.year"
              type="number"
              placeholder="Tahun"
            />
            <select v-model="editForm.status" class="status-select">
              <option value="mau_dibaca">Mau Dibaca</option>
              <option value="sedang_dibaca">Sedang Dibaca</option>
              <option value="sudah_dibaca">Sudah Dibaca</option>
            </select>
            <div class="modal-actions">
              <button type="button" class="btn-ghost" @click="closeEdit">
                Batal
              </button>
              <button type="submit" class="btn-primary">Simpan</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const API_URL = "http://localhost:8080/books";

const books = ref([]);
const form = ref({ title: "", author: "", year: null });

const shelves = [
  { status: "mau_dibaca", label: "Mau Dibaca", icon: "📖" },
  { status: "sedang_dibaca", label: "Sedang Dibaca", icon: "📗" },
  { status: "sudah_dibaca", label: "Sudah Dibaca", icon: "✅" },
];

function booksByStatus(status) {
  return books.value.filter((b) => b.status === status);
}

async function loadBooks() {
  const response = await fetch(API_URL);
  books.value = await response.json();
}

async function submitBook() {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form.value, status: "mau_dibaca" }),
    });
    if (!res.ok) throw new Error("gagal simpan");
  } catch (e) {
    console.error(e);
    alert("Gagal menambah buku. Cek apakah server sedang berjalan.");
    return;
  }
  form.value = { title: "", author: "", year: null };
  loadBooks();
}

async function deleteBook(id) {
  try {
    await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  } catch (e) {
    console.error(e);
  }
  loadBooks();
}

// ---------- Drag antar rak (ganti status) ----------
const draggedBook = ref(null);
const dragOverStatus = ref(null);

function onDragStart(book, e) {
  draggedBook.value = book;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", String(book.id));
}

function onDragEnd() {
  draggedBook.value = null;
  dragOverStatus.value = null;
  isOverTrash.value = false;
}

function onShelfDragLeave(status) {
  if (dragOverStatus.value === status) dragOverStatus.value = null;
}

async function onDropToShelf(status) {
  dragOverStatus.value = null;
  const book = draggedBook.value;
  draggedBook.value = null;
  if (!book || book.status === status) return;

  try {
    const res = await fetch(`${API_URL}/${book.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...book, status }),
    });
    if (!res.ok) throw new Error("gagal update status");
  } catch (e) {
    console.error(e);
    alert("Gagal memindahkan buku. Cek koneksi ke server.");
  }
  loadBooks();
}

// ---------- Drag ke tempat sampah (hapus + animasi pecah) ----------
const isOverTrash = ref(false);
const shatteringId = ref(null);
const shards = ref([]);

const SHARD_COUNT = 10;
const CLIP_PATHS = [
  "polygon(0 0, 100% 0, 60% 100%)",
  "polygon(0 0, 100% 20%, 40% 100%)",
  "polygon(20% 0, 100% 0, 100% 100%, 0 60%)",
  "polygon(0 20%, 80% 0, 100% 100%, 0 100%)",
  "polygon(0 0, 60% 0, 100% 100%, 0 80%)",
];

function onDropToTrash() {
  isOverTrash.value = false;
  const book = draggedBook.value;
  draggedBook.value = null;
  if (!book) return;
  triggerShatter(book);
}

function triggerShatter(book) {
  shatteringId.value = book.id;
  shards.value = Array.from({ length: SHARD_COUNT }, () => ({
    left: Math.random() * 80 + "%",
    top: Math.random() * 60 + "%",
    size: Math.random() * 22 + 16 + "px",
    clip: CLIP_PATHS[Math.floor(Math.random() * CLIP_PATHS.length)],
    tx: (Math.random() - 0.5) * 280 + "px",
    ty: Math.random() * 220 + 80 + "px",
    rot: Math.random() * 720 - 360 + "deg",
    delay: Math.random() * 0.08 + "s",
  }));

  // tunggu animasi kelar baru beneran hapus dari server
  setTimeout(async () => {
    await deleteBook(book.id);
    shatteringId.value = null;
    shards.value = [];
  }, 650);
}

// ---------- Modal edit ----------
const showEditModal = ref(false);
const editForm = ref({ id: null, title: "", author: "", year: null, status: "mau_dibaca" });

function openEdit(book) {
  editForm.value = { ...book };
  showEditModal.value = true;
}

function closeEdit() {
  showEditModal.value = false;
}

async function submitEdit() {
  try {
    const res = await fetch(`${API_URL}/${editForm.value.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm.value),
    });
    if (!res.ok) throw new Error("gagal simpan perubahan");
  } catch (e) {
    console.error(e);
    alert("Gagal menyimpan perubahan.");
    return;
  }
  showEditModal.value = false;
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
  padding: 60px 24px 120px;
  background: #eef0f3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  overflow: hidden;
}

.bg-blob {
  position: fixed;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  z-index: 0;
  pointer-events: none;
}
.blob-1 { width: 420px; height: 420px; top: -120px; left: -100px; background: #a7c7ff; }
.blob-2 { width: 380px; height: 380px; bottom: -140px; right: -80px; background: #ffc2d1; }

.hero { position: relative; z-index: 1; text-align: center; color: #1d1d1f; }
.hero h1 { font-size: 2.2rem; font-weight: 600; margin: 0; letter-spacing: -0.02em; }
.subtitle { margin: 6px 0 0; color: #6e6e73; font-size: 0.95rem; }

/* ---------- Kaca ala Apple ---------- */
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
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.book-form { display: flex; flex-direction: column; gap: 12px; }

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
.status-select { appearance: none; cursor: pointer; }
.book-form input::placeholder { color: #86868b; }
.book-form input:focus, .status-select:focus { border-color: rgba(0, 0, 0, 0.25); }

button {
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 12px 20px;
  border-radius: 14px;
  transition: transform 0.1s ease, opacity 0.1s ease;
}
button:active { transform: scale(0.96); opacity: 0.85; }
.btn-primary { background: rgba(29, 29, 31, 0.9); color: #fff; }
.btn-ghost { background: rgba(0, 0, 0, 0.06); color: #1d1d1f; }

/* ---------- Rak buku (kanban) ---------- */
.shelves {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 960px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}
@media (max-width: 860px) {
  .shelves { grid-template-columns: 1fr; }
}

.shelf {
  border-radius: 22px;
  padding: 16px;
  min-height: 220px;
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border: 2px dashed transparent;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.shelf-active {
  border-color: rgba(0, 122, 255, 0.55);
  background: rgba(0, 122, 255, 0.08);
}

.shelf-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 4px 4px 14px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1d1d1f;
}
.shelf-count {
  background: rgba(0, 0, 0, 0.08);
  color: #6e6e73;
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 100px;
}

.shelf-books { display: flex; flex-direction: column; gap: 10px; }
.shelf-empty {
  text-align: center;
  color: #a1a1a6;
  font-size: 0.82rem;
  padding: 24px 8px;
  border: 1.5px dashed rgba(0, 0, 0, 0.1);
  border-radius: 14px;
}

/* ---------- Kartu buku ---------- */
.book-card {
  position: relative;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  cursor: grab;
  overflow: hidden;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.book-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}
.book-card:active { cursor: grabbing; }

.book-title { margin: 0; font-weight: 600; color: #1d1d1f; font-size: 0.92rem; }
.book-meta { margin: 3px 0 0; font-size: 0.8rem; color: #6e6e73; }

/* label kecil "Edit" muncul pas hover, dengan animasi geser + fade */
.edit-hint {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 10px;
  font-size: 0.68rem;
  font-weight: 600;
  border-radius: 100px;
  background: rgba(29, 29, 31, 0.85);
  color: #fff;
  opacity: 0;
  transform: translateY(-6px);
  transition: opacity 0.18s ease, transform 0.18s ease;
  pointer-events: none;
  z-index: 2;
}
.book-card:hover .edit-hint {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

/* ---------- Animasi buku pecah ---------- */
.book-card.shattering { pointer-events: none; }
.book-card.shattering .book-card-content,
.book-card.shattering .edit-hint {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.shard-overlay { position: absolute; inset: 0; pointer-events: none; }
.shard {
  position: absolute;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(190, 205, 230, 0.75));
  border: 1px solid rgba(255, 255, 255, 0.85);
  animation: shatter-fly 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes shatter-fly {
  0%   { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(0.4); opacity: 0; }
}

/* ---------- Tempat sampah mengambang ---------- */
.trash-can {
  position: fixed;
  bottom: 28px;
  right: 28px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 10;
  transition: transform 0.15s ease, background 0.15s ease;
}
.trash-over {
  transform: scale(1.15);
  background: rgba(255, 59, 48, 0.25);
}

/* ---------- Modal edit ---------- */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  padding: 20px;
}
.modal-card {
  width: 100%;
  max-width: 420px;
  padding: 28px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}
.modal-title { margin: 0 0 16px; font-size: 1.2rem; color: #1d1d1f; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal-card, .modal-leave-active .modal-card { transition: transform 0.2s ease; }
.modal-enter-from .modal-card, .modal-leave-to .modal-card { transform: scale(0.92); }
</style>