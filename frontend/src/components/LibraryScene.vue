<template>
  <div ref="containerRef" class="scene-container">
    <div
      v-for="label in emptyShelfLabels"
      :key="label.status"
      class="shelf-empty-label"
      :style="{ left: label.x + 'px', top: label.y + 'p' }"
    >
      <span class="bounce-arrow">👇</span>\
      <p>Rak "{{ label.label }}" masih kosong,<br />yuk drag buku ke sini 👋</p>
    </div>

   <DashboardBoard
    v-if="boardAnchor.inFront"
    :books="books"
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
  books: { type: Array, required: true },
  matchedIds: { type: Set, default: () => new Set() },
  hasActiveFilter: { type: Boolean, default: false },
});
const emit = defineEmits(["edit-book", "move-book", "request-delete"]);

const containerRef = ref(null);
const shelfLabels = ref([]);
const boardAnchor = ref({ x:  })
</script>













