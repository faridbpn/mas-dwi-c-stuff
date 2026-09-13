<template>
  <h1>Buku Yang Sudah Di Baca</h1>

  <form @submit.prevent="submitBook">
    <input v-model="form.title" placeholder="Judul buku" required />
    <input v-model="form.author" placeholder="Penulis" required />
    <input v-model.number="form.year" type="number" placeholder="Tahun" />
    <button type="submit">
      {{ editingId ? "Update Buku" : "Tambah Buku" }}
    </button>
  </form>

  <table border="1">
    <thead>
      <tr>
        <th>Judul</th>
        <th>Penulis</th>
        <th>Tahun</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="book in books" :key="book.id">
        <td>{{ book.title }}</td>
        <td>{{ book.author }}</td>
        <td>{{ book.year }}</td>
        <td>
          <button @click="startEdit(book)">Edit</button>
          <button @click="deleteBook(book.id)">Hapus</button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
import { ref, onMounted } from "vue";

const API_URL = "http://localhost:8080/books";

const books = ref([]);
const form = ref({ title: "", author: "", year: null });
const editingId = ref(null); // null = modek tambah, ada isisnya = mode edit

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
      headers: { "Content-Type": "appplication/json" },
      body: JSON.stringify(form.value),
    });
  }

  resetForm();
  loadBooks();
}

function startEdit(book) {
  editingId.value = book.id;
  form.value = { title: book.title, author: book.author, year: book.year };
}

function resetForm() {
  editingId.value = null;
  form.value = { title: "", author: "", year: null };
}

async function deleteBook(id) {
  await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  loadBooks();
}

onMounted(() => {
  loadBooks();
});
</script>
