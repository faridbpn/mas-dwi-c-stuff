<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card">
      <h2>{{ book.id ? "Edit Buku" : "Tambah Buku" }}</h2>
      <form @submit.prevent="$emit('submit', localBook)">
        <input v-model="localBook.title" placeholder="Judul buku" required />
        <input v-model="localBook.author" placeholder="Penulis" required />
        <input v-model.number="localBook.year" type="number" placeholder="Tahun" />
        <select v-model="localBook.status">
          <option value="mau_dibaca">Mau Dibaca</option>
          <option value="sedang_dibaca">Sedang Dibaca</option>
          <option value="sudah_dibaca">Sudah Dibaca</option>
        </select>
        <div class="actions">
          <button type="button" @click="$emit('close')">Batal</button>
          <button type="submit">Simpan</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from "vue";

const props = defineProps({ book: { type: Object, required: true } });
defineEmits(["submit", "close"]);

const localBook = reactive({ ...props.book });
watch(() => props.book, (b) => Object.assign(localBook, b));
</script>

<style scoped>
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 20;
}
.modal-card {
  background: white; padding: 24px; border-radius: 16px; width: 360px;
}
.modal-card form { display: flex; flex-direction: column; gap: 10px; }
.actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>