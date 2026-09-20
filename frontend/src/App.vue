<template>
  <LibraryScene
    ref="libraryRef"
    :books="filteredBooks"
    :all-books="books"
    :is-filtering="searchQuery.trim().length > 0"
    @edit-book="openEdit"
    @move-book="handleMove"
    @request-delete="requestDelete"
  />

  <div class="search-bar">
    <input v-model="searchQuery" type="text" placeholder="🔍 Cari judul atau penulis..." />
  </div>

  <div class="genre-filter" v-if="allGenres.length">
    <button class="genre-chip" :class="{ active: activeGenre === null }" @click="activeGenre = null">Semua</button>
    <button v-for="g in allGenres" :key="g" class="genre-chip" :class="{ active: activeGenre === g }" @click="activeGenre = g">
      {{ g }}
    </button>
  </div>

  <button class="fab-add" @click="openAdd">+ Tambah Buku</button>

  <BookFormModal v-if="showModal" :book="activeBook" @submit="handleSubmit" @close="showModal = false" />
  <ToastStack :toasts="toasts" @action="undoDelete" />

  <Transition name="fade">
    <div v-if="initialLoading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Menyusun rak buku...</p>
    </div>
  </Transition>

   <button class="music-toggle" @click="toggleMute" :title="isMuted ? 'Nyalain musik' : 'Matiin musik'">
    {{ isMuted ? "🔇" : "🎵" }}
  </button>
</template>

<script setup>
import { useBackgroundMusic } from "./composables/useBackgroundMusic";
const { isMuted, toggleMute } = useBackgroundMusic("/music/bgm.mp3", { volume: 0.3 });
import { ref, computed, onMounted } from "vue";
import LibraryScene from "./components/LibraryScene.vue";
import BookFormModal from "./components/BookFormModal.vue";
import ToastStack from "./components/ToastStack.vue";
import { fetchBooks, createBook, updateBook, deleteBook } from "./api/books";

const books = ref([]);
const initialLoading = ref(true);
const showModal = ref(false);
const activeBook = ref({ title: "", author: "", year: null, status: "mau_dibaca", genre: "", rating: 0, notes: "" });
const libraryRef = ref(null);

const searchQuery = ref("");
const activeGenre = ref(null);

const allGenres = computed(() => [...new Set(books.value.map((b) => b.genre).filter(Boolean))]);

const filteredBooks = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return books.value.filter((b) => {
    const matchesSearch = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
    const matchesGenre = !activeGenre.value || b.genre === activeGenre.value;
    return matchesSearch && matchesGenre;
  });
});

async function refresh() { books.value = await fetchBooks(); }

onMounted(async () => {
  try { await refresh(); } finally { initialLoading.value = false; }
});

function openAdd() {
  activeBook.value = { title: "", author: "", year: null, status: "mau_dibaca", genre: "", rating: 0, notes: "" };
  showModal.value = true;
}
function openEdit(id) {
  const found = books.value.find((b) => b.id === id);
  if (found) { activeBook.value = { ...found }; showModal.value = true; }
}
async function handleSubmit(payload) {
  if (payload.id) await updateBook(payload.id, payload);
  else await createBook(payload);
  showModal.value = false;
  await refresh();
}
async function handleMove({ id, status }) {
  const book = books.value.find((b) => b.id === id);
  if (!book) return;
  await updateBook(id, { ...book, status });
  await refresh();
}

const toasts = ref([]);
const UNDO_WINDOW_MS = 5000;
function requestDelete(bookId) {
  const book = books.value.find((b) => b.id === bookId);
  if (!book) return;
  const toastId = crypto.randomUUID();
  const timeoutId = setTimeout(() => finalizeDelete(bookId, toastId), UNDO_WINDOW_MS);
  toasts.value.push({ id: toastId, bookId, message: `"${book.title}" dihapus`, actionLabel: "Undo", duration: UNDO_WINDOW_MS, timeoutId });
}
async function finalizeDelete(bookId, toastId) {
  toasts.value = toasts.value.filter((t) => t.id !== toastId);
  try {
    await deleteBook(bookId);
    books.value = books.value.filter((b) => b.id !== bookId);
  } catch (e) {
    console.error(e);
    libraryRef.value?.refreshLayout();
  }
}
function undoDelete(toastId) {
  const toast = toasts.value.find((t) => t.id === toastId);
  if (!toast) return;
  clearTimeout(toast.timeoutId);
  toasts.value = toasts.value.filter((t) => t.id !== toastId);
  libraryRef.value?.refreshLayout();
}
</script>

<style>
body { margin: 0; overflow: hidden; }
.fab-add { position: fixed; bottom: 24px; left: 24px; z-index: 15; padding: 12px 20px; border-radius: 100px; border: none; background: #1d1d1f; color: white; font-weight: 600; cursor: pointer; }
.search-bar { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 15; }
.search-bar input { width: 280px; padding: 10px 16px; border-radius: 100px; border: 1px solid rgba(0,0,0,0.1); background: rgba(255,255,255,0.85); backdrop-filter: blur(10px); outline: none; }
.genre-filter { position: fixed; top: 68px; left: 50%; transform: translateX(-50%); z-index: 15; display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; max-width: 90vw; }
.genre-chip { padding: 6px 14px; border-radius: 100px; border: none; background: rgba(255,255,255,0.7); backdrop-filter: blur(8px); font-size: 0.78rem; cursor: pointer; color: #1d1d1f; }
.genre-chip.active { background: #1d1d1f; color: white; }
.loading-overlay { position: fixed; inset: 0; z-index: 50; background: #eef0f3; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: #6e6e73; }
.spinner { width: 40px; height: 40px; border: 3px solid rgba(0,0,0,0.1); border-top-color: #1d1d1f; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.music-toggle {
  position: fixed;
  top: 20px;
  right: 24px;
  z-index: 15;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(10px);
  font-size: 1.2rem;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0,0,0,0.12);
}
</style>