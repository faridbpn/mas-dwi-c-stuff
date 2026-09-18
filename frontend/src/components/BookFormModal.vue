<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card">
      <h2>{{ book.id ? "Edit Buku" : "Tambah Buku" }}</h2>
      <form @submit.prevent="$emit('submit', localBook)">
        <input v-model="localBook.title" placeholder="Judul buku" required />
        <input v-model="localBook.author" placeholder="Penulis" required />
        <input v-model.number="localBook.year" type="number" placeholder="Tahun" />

        <input v-model="localBook.genre" list="genre-options" placeholder="Genre (mis. Fiksi)" />
        <datalist id="genre-options">
          <option v-for="g in COMMON_GENRES" :key="g" :value="g" />
        </datalist>

        <select v-model="localBook.status">
          <option value="mau_dibaca">Mau Dibaca</option>
          <option value="sedang_dibaca">Sedang Dibaca</option>
          <option value="sudah_dibaca">Sudah Dibaca</option>
        </select>

        <div class="rating-row">
          <span
            v-for="n in 5"
            :key="n"
            class="star"
            :class="{ filled: n <= (localBook.rating || 0) }"
            @click="localBook.rating = n === localBook.rating ? 0 : n"
          >★</span>
        </div>

        <textarea v-model="localBook.notes" placeholder="Catatan pribadi..." rows="3"></textarea>

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
import { COMMON_GENRES } from "../three/genrePalette";

const props = defineProps({ book: { type: Object, required: true } });
defineEmits(["submit", "close"]);

const localBook = reactive({ genre: "", rating: 0, notes: "", ...props.book });
watch(() => props.book, (b) => Object.assign(localBook, { genre: "", rating: 0, notes: "", ...b }));
</script>

<style scoped>
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 20; }
.modal-card { background: white; padding: 24px; border-radius: 16px; width: 360px; }
.modal-card form { display: flex; flex-direction: column; gap: 10px; }
.modal-card input, .modal-card select, .modal-card textarea { padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.15); font-family: inherit; }
.rating-row { display: flex; gap: 4px; }
.star { font-size: 1.5rem; color: #d8d3c8; cursor: pointer; }
.star.filled { color: #ffcc00; }
.actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>