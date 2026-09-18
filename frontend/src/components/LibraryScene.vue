<template>
  <div ref="containerRef" class="scene-container">
    <div v-for="label in visibleEmptyLabels" :key="label.status" class="shelf-empty-label" :style="{ left: label.x + 'px', top: label.y + 'px' }">
      <span class="bounce-arrow">👇</span>
      <p v-if="isFiltering">Gak ada hasil di rak "{{ label.label }}"</p>
      <p v-else>Rak "{{ label.label }}" masih kosong,<br />yuk drag buku ke sini 👋</p>
    </div>

    <DashboardBoard
      v-if="boardAnchor.inFront"
      :books="allBooks"
      class="dashboard-anchor"
      :style="{ left: boardAnchor.x + 'px', top: boardAnchor.y + 'px' }"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useLibraryScene } from "../three/useLibraryScene";
import DashboardBoard from "./DashboardBoard.vue";

const props = defineProps({
  books: { type: Array, required: true },       // sudah kefilter search/genre, dipake buat rak
  allBooks: { type: Array, required: true },     // TANPA filter, dipake buat statistik dashboard
  isFiltering: { type: Boolean, default: false },
});
const emit = defineEmits(["edit-book", "move-book", "request-delete"]);

const containerRef = ref(null);
const shelfLabels = ref([]);
const boardAnchor = ref({ x: 0, y: 0, inFront: false });
let scene;

const visibleEmptyLabels = computed(() => shelfLabels.value.filter((l) => l.count === 0));

onMounted(() => {
  scene = useLibraryScene({
    onEditBook: (id) => emit("edit-book", id),
    onMoveBook: (id, status) => emit("move-book", { id, status }),
    onRequestDelete: (id) => emit("request-delete", id),
    onShelfLabelsUpdate: (positions) => { shelfLabels.value = positions; },
    onBoardAnchorUpdate: (anchor) => { boardAnchor.value = anchor; },
  });
  scene.init(containerRef.value);
  scene.layoutBooks(props.books);
});

watch(() => props.books, (b) => scene?.layoutBooks(b), { deep: true });
onBeforeUnmount(() => scene?.destroy());
defineExpose({ refreshLayout: () => scene?.layoutBooks(props.books) });
</script>

<style scoped>
.scene-container { position: relative; width: 100%; height: 100vh; }
.shelf-empty-label { position: absolute; transform: translate(-50%, -100%); text-align: center; pointer-events: none; color: #6e6e73; font-size: 0.8rem; line-height: 1.4; }
.bounce-arrow { display: inline-block; font-size: 1.4rem; animation: bounce 1.2s ease-in-out infinite; }
@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(6px); } }
.dashboard-anchor { position: absolute; transform: translate(-50%, -50%); pointer-events: auto; }
</style>