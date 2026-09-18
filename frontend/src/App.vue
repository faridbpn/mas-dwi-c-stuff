<template>
  <LibraryScene
    :books="books"
    @edit-book="openEdit"
    @move-book="handleMove"
    @delete-book="handleDelete"
  />
  <BookFormModal
    v-if="showModal"
    :book="activeBook"
    @submit="handleSubmit"
    @close="showModal = false"
  />
  <button class="fab-add" @click="openAdd">+ Tambah Buku</button>
</template>

<script setup>
import { ref, onMounted } from "vue";
import LibraryScene from "./components/LibraryScene.vue";
import BookFormModal from "./components/BookFormModal.vue";
import { fetchBooks, createBook, updateBook, deleteBook } from "./api/books";

const books = ref([]);
const showModal = ref(false);
const activeBook = ref({ title: "", author: "", year: null, status: "mau_dibaca" });

async function refresh() {
  books.value = await fetchBooks();
}

function openAdd() {
  activeBook.value = { title: "", author: "", year: null, status: "mau_dibaca" };
  showModal.value = true;
}

function openEdit(id) {
  const found = books.value.find((b) => b.id === id);
  if (found) {
    activeBook.value = { ...found };
    showModal.value = true;
  }
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

async function handleDelete(id) {
  await deleteBook(id);
  await refresh();
}

onMounted(refresh);
</script>

<style>
body { margin: 0; overflow: hidden; }
.fab-add {
  position: fixed; bottom: 24px; left: 24px; z-index: 15;
  padding: 12px 20px; border-radius: 100px; border: none;
  background: #1d1d1f; color: white; font-weight: 600; cursor: pointer;
}
</style>