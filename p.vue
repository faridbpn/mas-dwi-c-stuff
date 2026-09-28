<template>
  <LibraryScene
    ref="libraryRef"
    :books="books"
    :matched-ids="matchedBookIds"
    :has-active-filter="hasActiveFilter"
    @edit-book="openEdit"
    @move-book="handleMove"
    @request-delete="requestDelete"
  />

  <!-- search-bar, genre-filter, fab-add, dst TETEP SAMA -->
  <!-- ...(gak berubah)... -->
</template>

<script setup>
// ...(import & deklarasi lain tetep sama)...

const searchQuery = ref("");
const activeGenre = ref(null);

const allGenres = computed(() => [...new Set(books.value.map((b) => b.genre).filter(Boolean))]);

// GANTI: dulu `filteredBooks` (nge-filter array), sekarang `matchedBookIds` (nandain doang)
const matchedBookIds = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const ids = new Set();
  books.value.forEach((b) => {
    const matchesSearch = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
    const matchesGenre = !activeGenre.value || b.genre === activeGenre.value;
    if (matchesSearch && matchesGenre) ids.add(b.id);
  });
  return ids;
});

const hasActiveFilter = computed(
  () => searchQuery.value.trim().length > 0 || activeGenre.value !== null
);

async function refresh() { books.value = await fetchBooks(); }

// ...(openAdd, openEdit, handleSubmit tetep sama)...

async function handleMove({ id, status }) {
  const book = books.value.find((b) => b.id === id);
  if (!book) return;
  try {
    await updateBook(id, { ...book, status });
    await refresh();
  } catch (e) {
    console.error("Gagal memindahkan buku:", e);
    alert("Gagal memindahkan buku. Cek apakah server backend sedang berjalan.");
    libraryRef.value?.refreshLayout();
  }
}

// ...(sisanya: toasts, requestDelete, finalizeDelete, undoDelete tetep sama)...
</script>